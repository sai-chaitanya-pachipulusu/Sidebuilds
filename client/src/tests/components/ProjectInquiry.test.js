import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import Modal from '../../components/ProjectInquiryModal';
import { expressInterestInProject } from '../../services/api';
jest.mock('../../services/api', () => ({ expressInterestInProject: jest.fn() }));
beforeEach(() => jest.clearAllMocks());
const message = 'Could you explain the hosting costs and handover?';
test('a private inquiry needs a message, with no payment commitments, then opens its conversation', async () => {
  const next = jest.fn(); expressInterestInProject.mockResolvedValue({ purchase_request_id: 12, existing: false });
  render(<Modal open projectId="project-a" projectName="Atlas" onClose={jest.fn()} onContinue={next}/>);
  expect(screen.getByRole('dialog')).toHaveAccessibleName('Contact Atlas’s seller');
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Send inquiry' })); expect(await screen.findByRole('alert')).toHaveTextContent('10 and 2000');
  expect(expressInterestInProject).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Your message'), { target: { value: message } });
  fireEvent.click(screen.getByRole('button', { name: 'Send inquiry' }));
  await waitFor(() => expect(next).toHaveBeenCalledWith(12, ''));
  expect(expressInterestInProject).toHaveBeenCalledWith('project-a', [], message);
});
test('an uncertain response preserves the draft and a retry can reopen the committed thread without sending twice', async () => {
  const next = jest.fn(); expressInterestInProject.mockRejectedValueOnce(new Error('Connection interrupted')).mockResolvedValueOnce({ id: 12, existing: true });
  render(<Modal open projectId="project-a" projectName="Atlas" onClose={jest.fn()} onContinue={next}/>);
  fireEvent.change(screen.getByLabelText('Your message'), { target: { value: message } });
  fireEvent.click(screen.getByRole('button', { name: 'Send inquiry' })); await screen.findByRole('alert');
  expect(screen.getByLabelText('Your message')).toHaveValue(message);
  fireEvent.click(screen.getByRole('button', { name: 'Send inquiry' }));
  await waitFor(() => expect(next).toHaveBeenCalledWith(12, message));
});
test('repeated submissions while pending start one request', async () => {
  let finish; expressInterestInProject.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  render(<Modal open projectId="project-a" projectName="Atlas" onClose={jest.fn()} onContinue={jest.fn()}/>);
  fireEvent.change(screen.getByLabelText('Your message'), { target: { value: message } });
  const form = screen.getByLabelText('Your message').closest('form'); fireEvent.submit(form); fireEvent.submit(form);
  expect(expressInterestInProject).toHaveBeenCalledTimes(1);
  await act(async () => finish({ id: 12, existing: false }));
});
test('a late inquiry response does not redirect after leaving the project', async () => {
  let finish; const next = jest.fn(); expressInterestInProject.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const page = render(<Modal open projectId="project-a" projectName="Atlas" onClose={jest.fn()} onContinue={next}/>);
  fireEvent.change(screen.getByLabelText('Your message'), { target: { value: message } }); fireEvent.click(screen.getByRole('button', { name: 'Send inquiry' }));
  page.unmount(); await act(async () => finish({ id: 12, existing: false })); expect(next).not.toHaveBeenCalled();
});
