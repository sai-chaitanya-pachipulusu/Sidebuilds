import React, { useEffect, useState, useCallback } from 'react';
import { Star, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { getProjectReviews, createReview } from '../services/api';

const formatDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const StarRating = ({ value, size = 'w-4 h-4', onChange = null }) => (
    <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
            <Star
                key={s}
                className={`${size} ${s <= value ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'} ${onChange ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`}
                onClick={onChange ? () => onChange(s) : undefined}
            />
        ))}
    </div>
);

// Reviews for a project. Writing a review is only offered when the backend
// confirms the viewer is a verified buyer (the API enforces it regardless).
const ProjectReviews = ({ projectId }) => {
    const { isAuthenticated } = useAuth();
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [rating, setRating] = useState(5);
    const [title, setTitle] = useState('');
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const load = useCallback(async () => {
        try {
            const data = await getProjectReviews(projectId);
            setReviews(data);
        } catch {
            // non-critical
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => { load(); }, [load]);

    const average = reviews.length
        ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
        : null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await createReview({ project_id: projectId, rating, title, comment });
            toast.success('Review posted — thank you!');
            setShowForm(false);
            setTitle('');
            setComment('');
            load();
        } catch (err) {
            toast.error(err?.response?.data?.error || 'Could not post review. Only verified buyers can review.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <section className="border border-white/[0.08] bg-white/[0.02] p-6 mt-8">
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <Star className="w-5 h-5 text-yellow-400" />
                    <h2 className="text-lg font-semibold text-white">Reviews</h2>
                    {average && (
                        <span className="flex items-center gap-1.5 text-sm text-gray-300">
                            <StarRating value={Math.round(average)} />
                            {average} ({reviews.length})
                        </span>
                    )}
                </div>
                {isAuthenticated && !showForm && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                    >
                        Write a review
                    </button>
                )}
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="mb-6 border border-white/[0.08] bg-black/40 p-4 space-y-3">
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-400">Your rating:</span>
                        <StarRating value={rating} size="w-5 h-5" onChange={setRating} />
                    </div>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        maxLength={150}
                        placeholder="Review title (optional)"
                        className="w-full bg-black border border-white/[0.12] px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                    />
                    <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        maxLength={3000}
                        rows={3}
                        placeholder="Share your experience with this project and seller (optional)"
                        className="w-full bg-black border border-white/[0.12] px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 resize-none"
                    />
                    <p className="text-xs text-gray-600">Only verified buyers of this project can post a review.</p>
                    <div className="flex gap-2">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-4 py-2 bg-white text-black text-sm font-semibold hover:bg-gray-200 disabled:opacity-50 transition-colors"
                        >
                            {submitting ? 'Posting…' : 'Post Review'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowForm(false)}
                            className="px-4 py-2 border border-white/[0.12] text-sm text-gray-300 hover:bg-white/[0.05] transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {loading && <p className="text-sm text-gray-500">Loading reviews…</p>}

            {!loading && reviews.length === 0 && (
                <p className="text-sm text-gray-500">No reviews yet. Reviews can be written by verified buyers after purchase.</p>
            )}

            <div className="space-y-5">
                {reviews.map((r) => (
                    <div key={r.review_id} className="border-b border-white/[0.05] pb-4 last:border-0">
                        <div className="flex items-center justify-between gap-3 mb-1">
                            <div className="flex items-center gap-2">
                                <StarRating value={r.rating} />
                                {r.title && <span className="text-sm font-medium text-white">{r.title}</span>}
                                {r.is_verified_purchase && (
                                    <span className="flex items-center gap-1 px-1.5 py-0.5 bg-green-500/10 border border-green-500/30 text-green-400 text-[10px] font-semibold uppercase">
                                        <ShieldCheck className="w-3 h-3" />
                                        Verified Buyer
                                    </span>
                                )}
                            </div>
                            <span className="text-xs text-gray-600 shrink-0">{formatDate(r.created_at)}</span>
                        </div>
                        {r.comment && <p className="text-sm text-gray-300">{r.comment}</p>}
                        <p className="text-xs text-gray-500 mt-1">— {r.reviewer_username}</p>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default ProjectReviews;
