import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MessageCircleQuestion, Send, CornerDownRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { getProjectQuestions, askProjectQuestion, answerProjectQuestion } from '../services/api';
import { loginDestination } from '../utils/navigation';

const formatDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Public Q&A section for a project listing.
// Buyers ask questions; the project owner answers inline.
const ProjectQA = ({ projectId, ownerId, isPublic = true, questionPrompt }) => {
    const { isAuthenticated, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newQuestion, setNewQuestion] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [answerDrafts, setAnswerDrafts] = useState({});
    const [loadError, setLoadError] = useState('');
    const [pendingAnswers, setPendingAnswers] = useState({});
    const sectionRef = useRef(null);
    const inputRef = useRef(null);
    const requestVersion = useRef(0);
    const currentProject = useRef(projectId);
    const postingQuestion = useRef(false);
    const postingAnswers = useRef(new Set());
    currentProject.current = projectId;

    const isOwner = isAuthenticated && (user?.user_id || user?.id) === ownerId;

    const load = useCallback(async () => {
        if (currentProject.current !== projectId) return;
        const version = ++requestVersion.current;
        if (!isPublic) { setLoading(false); return; }
        setLoading(true);
        setLoadError('');
        try {
            const data = await getProjectQuestions(projectId);
            if (!Array.isArray(data)) throw new Error('Unexpected questions response');
            if (version === requestVersion.current) setQuestions(data);
        } catch {
            if (version === requestVersion.current) setLoadError('Questions could not be loaded. Please retry.');
        } finally {
            if (version === requestVersion.current) setLoading(false);
        }
    }, [projectId, isPublic]);

    useEffect(() => {
        setQuestions([]); setNewQuestion(''); setAnswerDrafts({}); setPendingAnswers({}); setSubmitting(false);
        postingQuestion.current = false; postingAnswers.current = new Set();
        load();
        return () => { requestVersion.current += 1; };
    }, [load]);

    const focusQuestion = useCallback(() => {
        sectionRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
        inputRef.current?.focus({ preventScroll: true });
    }, []);

    useEffect(() => {
        if (!questionPrompt?.text || isOwner || !isPublic) return;
        setNewQuestion(current => {
            if (current.includes(questionPrompt.text)) return current;
            const combined = current.trim() ? `${current}\n\n${questionPrompt.text}` : questionPrompt.text;
            return combined.length <= 2000 ? combined : current;
        });
        focusQuestion();
    }, [questionPrompt, isOwner, isPublic, focusQuestion]);

    useEffect(() => {
        const draft = location.state?.projectQuestion;
        if (draft?.projectId !== projectId || typeof draft.text !== 'string' || draft.text.length > 2000) return;
        setNewQuestion(draft.text);
        focusQuestion();
        const { projectQuestion: consumed, ...remainingState } = location.state;
        navigate(location.pathname + location.search + location.hash, { replace: true, state: remainingState });
    }, [location, projectId, navigate, focusQuestion]);

    const handleAsk = async (e) => {
        e.preventDefault();
        if (postingQuestion.current) return;
        if (!isAuthenticated) {
            navigate(loginDestination(location.pathname + location.search + '#questions'), {
                state: { ...location.state, projectQuestion: { projectId, text: newQuestion } }
            });
            return;
        }
        const q = newQuestion.trim();
        if (q.length < 5) {
            toast.error('Question must be at least 5 characters.');
            return;
        }
        setSubmitting(true);
        postingQuestion.current = true;
        try {
            await askProjectQuestion(projectId, q);
            if (currentProject.current !== projectId) return;
            setNewQuestion('');
            toast.success('Question posted — the seller has been notified.');
            load();
        } catch (err) {
            if (currentProject.current === projectId) toast.error(err?.response?.data?.error || err?.message || 'Could not post your question.');
        } finally {
            if (currentProject.current === projectId) { postingQuestion.current = false; setSubmitting(false); }
        }
    };

    const handleAnswer = async (questionId) => {
        const a = (answerDrafts[questionId] || '').trim();
        if (!a || postingAnswers.current.has(questionId)) return;
        postingAnswers.current.add(questionId);
        setPendingAnswers(current => ({ ...current, [questionId]: true }));
        try {
            await answerProjectQuestion(questionId, a);
            if (currentProject.current !== projectId) return;
            setAnswerDrafts((d) => ({ ...d, [questionId]: '' }));
            toast.success('Answer posted.');
            load();
        } catch (err) {
            if (currentProject.current === projectId) toast.error(err?.response?.data?.error || err?.message || 'Could not post your answer.');
        } finally {
            if (currentProject.current === projectId) {
                postingAnswers.current.delete(questionId);
                setPendingAnswers(current => ({ ...current, [questionId]: false }));
            }
        }
    };

    return (
        <section id="questions" ref={sectionRef} aria-labelledby="project-questions-title" className="scroll-mt-24 border border-white/[0.08] bg-white/[0.02] p-4 sm:p-6 mt-8">
            <div className="flex items-center gap-2 mb-5">
                <MessageCircleQuestion className="w-5 h-5 text-blue-400" />
                <h2 id="project-questions-title" className="text-lg font-semibold text-white">
                    Questions & Answers {questions.length > 0 && <span className="text-gray-500">({questions.length})</span>}
                </h2>
            </div>

            {!isPublic ? <p className="text-sm text-gray-400">Public questions appear after you publish this project.</p> : <>
            <p className="text-sm text-gray-400 mb-5">Questions and seller answers are public. Ask about the project, included assets, costs or handover.</p>
            {!isOwner && (
                <form onSubmit={handleAsk} className="space-y-3 mb-6">
                    <label htmlFor="project-question" className="block text-sm text-gray-200">Your question</label>
                    <textarea id="project-question" ref={inputRef} rows={3}
                        value={newQuestion}
                        onChange={(e) => setNewQuestion(e.target.value)}
                        maxLength={2000}
                        placeholder="What would you like to know before making an offer?"
                        disabled={submitting}
                        className="w-full min-w-0 bg-black border border-white/[0.12] px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-300"
                    />
                    <button
                        type="submit"
                        disabled={submitting}
                        className="px-4 py-2 bg-white text-black text-sm font-semibold hover:bg-gray-200 disabled:opacity-50 transition-colors flex items-center gap-2"
                    >
                        <Send className="w-4 h-4" />
                        {submitting ? 'Posting question…' : isAuthenticated ? 'Ask seller' : 'Sign in to ask'}
                    </button>
                </form>
            )}

            {loadError && <div role="alert" className="border border-amber-400/30 p-3 mb-4 text-sm text-amber-200">
                <p>{loadError}</p><button type="button" onClick={load} className="mt-2 underline underline-offset-4">Retry questions</button>
            </div>}
            {loading && <p role="status" className="text-sm text-gray-400">Loading questions…</p>}

            {!loading && !loadError && questions.length === 0 && (
                <p className="text-sm text-gray-500">
                    No questions yet. {!isOwner && 'Be the first to ask about this project.'}
                </p>
            )}

            <div className="space-y-5">
                {questions.map((q) => (
                    <div key={q.question_id} className="border-b border-white/[0.05] pb-4 last:border-0">
                        <div className="flex flex-wrap items-baseline justify-between gap-3">
                            <p className="text-sm text-white min-w-0 break-words">
                                <span className="text-gray-400 font-medium">{q.asker_username}</span>{' '}
                                asked: {q.question}
                            </p>
                            <span className="text-xs text-gray-600 shrink-0">{formatDate(q.created_at)}</span>
                        </div>

                        {q.answer ? (
                            <div className="mt-2 ml-4 flex items-start gap-2 text-sm">
                                <CornerDownRight className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                                <p className="text-gray-300">
                                    <span className="text-green-400 font-medium">{q.answerer_username || 'Seller'}</span>{' '}
                                    answered: {q.answer}
                                </p>
                            </div>
                        ) : isOwner ? (
                            <div className="mt-3 space-y-2">
                                <label htmlFor={`answer-${q.question_id}`} className="block text-sm text-gray-200">Answer this question</label>
                                <textarea id={`answer-${q.question_id}`} rows={2}
                                    value={answerDrafts[q.question_id] || ''}
                                    onChange={(e) => setAnswerDrafts((d) => ({ ...d, [q.question_id]: e.target.value }))}
                                    maxLength={3000}
                                    disabled={pendingAnswers[q.question_id]}
                                    placeholder="Write an answer…"
                                    className="w-full bg-black border border-white/[0.12] px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-300"
                                />
                                <button
                                    onClick={() => handleAnswer(q.question_id)}
                                    type="button" disabled={pendingAnswers[q.question_id] || !answerDrafts[q.question_id]?.trim()}
                                    className="px-3 py-2 bg-emerald-300 text-black text-sm font-semibold disabled:opacity-50"
                                >
                                    {pendingAnswers[q.question_id] ? 'Posting answer…' : 'Post answer'}
                                </button>
                            </div>
                        ) : (
                            <p className="mt-1 ml-4 text-xs text-gray-600">Awaiting seller's answer</p>
                        )}
                    </div>
                ))}
            </div>
            </>}
        </section>
    );
};

export default ProjectQA;
