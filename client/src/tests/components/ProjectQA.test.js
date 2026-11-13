import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import ProjectQA from '../../components/ProjectQA';
import { getProjectQuestions, askProjectQuestion, answerProjectQuestion } from '../../services/api';

const mockAuth = { isAuthenticated: true, user: { user_id: 'buyer' } };
jest.mock('../../context/AuthContext', () => ({ useAuth: () => mockAuth }));
jest.mock('../../services/api', () => ({ getProjectQuestions: jest.fn(), askProjectQuestion: jest.fn(), answerProjectQuestion: jest.fn() }));
const Position = () => { const location = useLocation(); return <output data-testid="position">{JSON.stringify({ path: location.pathname + location.search + location.hash, state: location.state })}</output>; };
const Login = () => {
  const location = useLocation(); const navigate = useNavigate();
  return <button onClick={() => { mockAuth.isAuthenticated = true; navigate(new URLSearchParams(location.search).get('next'), { state: location.state }); }}>Resume signed in</button>;
};
const open = (props = {}) => render(<MemoryRouter initialEntries={[{ pathname: '/projects/project-a', state: { marketplaceSearch: '/marketplace?q=React' } }]}><Position /><Routes>
  <Route path="/projects/:id" element={<ProjectQA projectId="project-a" ownerId="seller" {...props} />} />
  <Route path="/login" element={<Login />} />
</Routes></MemoryRouter>);
const question = { question_id: 'question-one', asker_username: 'buyer', question: 'How much is hosting?', answer: null };
beforeEach(() => {
  jest.clearAllMocks(); mockAuth.isAuthenticated = true; mockAuth.user = { user_id: 'buyer' };
  getProjectQuestions.mockResolvedValue([]); askProjectQuestion.mockResolvedValue({}); answerProjectQuestion.mockResolvedValue({});
});

test('questions outage is not shown as an empty list and Retry recovers', async () => {
  getProjectQuestions.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([question]);
  open();
  expect(await screen.findByRole('alert')).toHaveTextContent('Questions could not be loaded');
  expect(screen.queryByText(/No questions yet/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Retry questions' }));
  expect(await screen.findByText(/How much is hosting/)).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('a guest question survives sign-in with the original marketplace destination', async () => {
  mockAuth.isAuthenticated = false;
  open(); await screen.findByText(/No questions yet/);
  fireEvent.change(screen.getByLabelText('Your question'), { target: { value: 'Can I deploy this with my own hosting account?' } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign in to ask' }));
  expect(screen.getByTestId('position')).toHaveTextContent('Can I deploy this with my own hosting account?');
  expect(screen.getByTestId('position')).toHaveTextContent('/marketplace?q=React');
  fireEvent.click(screen.getByRole('button', { name: 'Resume signed in' }));
  await waitFor(() => expect(screen.getByLabelText('Your question')).toHaveValue('Can I deploy this with my own hosting account?'));
  expect(screen.getByLabelText('Your question')).toHaveFocus();
  expect(screen.getByTestId('position')).toHaveTextContent('/projects/project-a#questions');
  expect(screen.getByTestId('position')).not.toHaveTextContent('projectQuestion');
  expect(askProjectQuestion).not.toHaveBeenCalled();
});

test('a suggested question is appended to existing writing and focused', async () => {
  const Harness = () => {
    const [prompt, setPrompt] = React.useState(null);
    return <><button onClick={() => setPrompt({ text: 'What assets are included?' })}>Use suggested question</button>
      <ProjectQA projectId="project-a" ownerId="seller" questionPrompt={prompt} /></>;
  };
  render(<MemoryRouter><Harness /></MemoryRouter>);
  await screen.findByText(/No questions yet/);
  fireEvent.change(screen.getByLabelText('Your question'), { target: { value: 'My existing question.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Use suggested question' }));
  await waitFor(() => expect(screen.getByLabelText('Your question')).toHaveValue('My existing question.\n\nWhat assets are included?'));
  expect(screen.getByLabelText('Your question')).toHaveFocus();
});

test('pending seller answers cannot be submitted twice and failure keeps the answer', async () => {
  mockAuth.user = { id: 'seller' };
  getProjectQuestions.mockResolvedValue([question]);
  let rejectAnswer;
  answerProjectQuestion.mockImplementation(() => new Promise((_, reject) => { rejectAnswer = reject; }));
  open(); const input = await screen.findByLabelText('Answer this question');
  fireEvent.change(input, { target: { value: 'Hosting is USD 12/month.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Post answer' }));
  expect(screen.getByRole('button', { name: 'Posting answer…' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Posting answer…' }));
  expect(answerProjectQuestion).toHaveBeenCalledTimes(1);
  await act(async () => rejectAnswer(new Error('offline')));
  expect(input).toHaveValue('Hosting is USD 12/month.');
  expect(screen.getByRole('button', { name: 'Post answer' })).toBeEnabled();
});

test('failed questions preserve the draft, and pending clicks post only once', async () => {
  let rejectQuestion;
  askProjectQuestion.mockImplementation(() => new Promise((_, reject) => { rejectQuestion = reject; }));
  open(); await screen.findByText(/No questions yet/);
  fireEvent.change(screen.getByLabelText('Your question'), { target: { value: 'Can I transfer the domain?' } });
  fireEvent.click(screen.getByRole('button', { name: 'Ask seller' }));
  fireEvent.click(screen.getByRole('button', { name: 'Posting question…' }));
  expect(askProjectQuestion).toHaveBeenCalledTimes(1);
  await act(async () => rejectQuestion(new Error('offline')));
  expect(screen.getByLabelText('Your question')).toHaveValue('Can I transfer the domain?');
});

test('private projects explain public Q&A availability without fetching questions', async () => {
  open({ isPublic: false });
  expect(await screen.findByText('Public questions appear after you publish this project.')).toBeInTheDocument();
  expect(getProjectQuestions).not.toHaveBeenCalled();
  expect(screen.queryByLabelText('Your question')).not.toBeInTheDocument();
});

test('a late response from the previous project cannot replace current questions', async () => {
  let resolveOld;
  getProjectQuestions.mockImplementation(id => id === 'old' ? new Promise(resolve => { resolveOld = resolve; }) : Promise.resolve([{ ...question, question: 'Current project question' }]));
  const view = render(<MemoryRouter><ProjectQA projectId="old" ownerId="seller" /></MemoryRouter>);
  view.rerender(<MemoryRouter><ProjectQA projectId="new" ownerId="seller" /></MemoryRouter>);
  await screen.findByText(/Current project question/);
  await act(async () => resolveOld([{ ...question, question: 'Stale old project question' }]));
  expect(screen.queryByText(/Stale old project/)).not.toBeInTheDocument();
});
