import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircleQuestion, Send, CornerDownRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { getProjectQuestions, askProjectQuestion, answerProjectQuestion } from '../services/api';

const formatDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Public Q&A section for a project listing.
// Buyers ask questions; the project owner answers inline.
const ProjectQA = ({ projectId, ownerId }) => {
    const { isAuthenticated, user } = useAuth();
    const navigate = useNavigate();
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newQuestion, setNewQuestion] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [answerDrafts, setAnswerDrafts] = useState({});

    const isOwner = isAuthenticated && user?.user_id === ownerId;

    const load = useCallback(async () => {
        try {
            const data = await getProjectQuestions(projectId);
            setQuestions(data);
        } catch {
            // non-critical section; stay quiet on load failure
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => { load(); }, [load]);

    const handleAsk = async (e) => {
        e.preventDefault();
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }
        const q = newQuestion.trim();
        if (q.length < 5) {
            toast.error('Question must be at least 5 characters.');
            return;
        }
        setSubmitting(true);
        try {
            await askProjectQuestion(projectId, q);
            setNewQuestion('');
            toast.success('Question posted — the seller has been notified.');
            load();
        } catch (err) {
            toast.error(err?.response?.data?.error || 'Could not post your question.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAnswer = async (questionId) => {
        const a = (answerDrafts[questionId] || '').trim();
        if (!a) return;
        try {
            await answerProjectQuestion(questionId, a);
            setAnswerDrafts((d) => ({ ...d, [questionId]: '' }));
            toast.success('Answer posted.');
            load();
        } catch (err) {
            toast.error(err?.response?.data?.error || 'Could not post your answer.');
        }
    };

    return (
        <section className="border border-white/[0.08] bg-white/[0.02] p-6 mt-8">
            <div className="flex items-center gap-2 mb-5">
                <MessageCircleQuestion className="w-5 h-5 text-blue-400" />
                <h2 className="text-lg font-semibold text-white">
                    Questions & Answers {questions.length > 0 && <span className="text-gray-500">({questions.length})</span>}
                </h2>
            </div>

            {!isOwner && (
                <form onSubmit={handleAsk} className="flex gap-2 mb-6">
                    <input
                        type="text"
                        value={newQuestion}
                        onChange={(e) => setNewQuestion(e.target.value)}
                        maxLength={2000}
                        placeholder={isAuthenticated ? 'Ask the seller a question…' : 'Log in to ask a question'}
                        className="flex-1 bg-black border border-white/[0.12] px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                    />
                    <button
                        type="submit"
                        disabled={submitting}
                        className="px-4 py-2 bg-white text-black text-sm font-semibold hover:bg-gray-200 disabled:opacity-50 transition-colors flex items-center gap-2"
                    >
                        <Send className="w-4 h-4" />
                        Ask
                    </button>
                </form>
            )}

            {loading && <p className="text-sm text-gray-500">Loading questions…</p>}

            {!loading && questions.length === 0 && (
                <p className="text-sm text-gray-500">
                    No questions yet. {!isOwner && 'Be the first to ask about this project.'}
                </p>
            )}

            <div className="space-y-5">
                {questions.map((q) => (
                    <div key={q.question_id} className="border-b border-white/[0.05] pb-4 last:border-0">
                        <div className="flex items-baseline justify-between gap-3">
                            <p className="text-sm text-white">
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
                            <div className="mt-2 ml-4 flex gap-2">
                                <input
                                    type="text"
                                    value={answerDrafts[q.question_id] || ''}
                                    onChange={(e) => setAnswerDrafts((d) => ({ ...d, [q.question_id]: e.target.value }))}
                                    maxLength={3000}
                                    placeholder="Write an answer…"
                                    className="flex-1 bg-black border border-white/[0.12] px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50"
                                />
                                <button
                                    onClick={() => handleAnswer(q.question_id)}
                                    className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold hover:bg-green-500 transition-colors"
                                >
                                    Answer
                                </button>
                            </div>
                        ) : (
                            <p className="mt-1 ml-4 text-xs text-gray-600">Awaiting seller's answer</p>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
};

export default ProjectQA;
