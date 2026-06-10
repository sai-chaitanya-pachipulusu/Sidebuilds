import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bookmark, Search } from 'lucide-react';
import ProjectCard from '../components/ProjectCard';
import { getSavedProjects } from '../services/api';

const SavedProjectsPage = () => {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const data = await getSavedProjects();
                if (!cancelled) setProjects(data);
            } catch (err) {
                if (!cancelled) setError('Could not load your saved projects. Please try again.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    return (
        <div className="min-h-screen bg-black text-white px-4 sm:px-6 lg:px-8 py-10">
            <div className="max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <Bookmark className="w-7 h-7 text-blue-400" />
                        <h1 className="text-3xl font-bold">Saved Projects</h1>
                    </div>
                    <p className="text-gray-400">
                        Projects you bookmarked from the marketplace. Save listings to compare and come back later.
                    </p>
                </motion.div>

                {loading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="h-80 bg-white/[0.03] border border-white/[0.08] animate-pulse" />
                        ))}
                    </div>
                )}

                {!loading && error && (
                    <div className="text-center py-20 border border-red-500/20 bg-red-500/5">
                        <p className="text-red-400">{error}</p>
                    </div>
                )}

                {!loading && !error && projects.length === 0 && (
                    <div className="text-center py-24 border border-white/[0.08] bg-white/[0.02]">
                        <Bookmark className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold mb-2">Nothing saved yet</h2>
                        <p className="text-gray-400 mb-6">
                            Tap the bookmark icon on any project to keep it here.
                        </p>
                        <Link
                            to="/marketplace"
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-black font-semibold hover:bg-gray-200 transition-colors"
                        >
                            <Search className="w-4 h-4" />
                            Browse Marketplace
                        </Link>
                    </div>
                )}

                {!loading && !error && projects.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects.map((project) => (
                            <ProjectCard key={project.project_id} project={project} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SavedProjectsPage;
