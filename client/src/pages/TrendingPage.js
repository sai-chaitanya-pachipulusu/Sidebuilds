import React, { useState, useEffect } from 'react';
import { getMarketplaceProjects } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../shadcn/ui/card';
import { Button } from '../shadcn/ui/button';
import { Flame, ArrowRight, BarChart3, Eye } from 'lucide-react';
import SEO from '../components/SEO';
import { useNavigate } from 'react-router-dom';

const TrendingPage = () => {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchTrending = async () => {
            try {
                const allProjects = await getMarketplaceProjects();
                const sorted = allProjects.sort((a, b) => (b.view_count || 0) - (a.view_count || 0)).slice(0, 12);
                setProjects(sorted);
            } catch (error) {
                console.error("Failed to fetch trending projects", error);
            } finally {
                setLoading(false);
            }
        };
        fetchTrending();
    }, []);

    if (loading) return <div className="flex justify-center items-center h-screen bg-black"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div></div>;

    return (
        <div className="min-h-screen bg-black text-white p-8">
            <SEO title="Trending Projects" description="Discover the most popular and fastest-growing projects on SideBuilds." />
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <div className="inline-block p-4 bg-purple-500/10 rounded-2xl border border-purple-500/20 mb-4">
                        <Flame className="w-12 h-12 mx-auto text-purple-400" />
                    </div>
                    <h1 className="text-5xl font-bold">Trending Projects</h1>
                    <p className="text-xl text-gray-400 mt-2">The hottest projects on the marketplace right now.</p>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {projects.map((project, index) => (
                        <Card key={project.project_id} className="bg-gray-900/50 border-gray-700 hover:border-purple-500/50 transition-all group flex flex-col">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <CardTitle className="text-xl font-bold group-hover:text-purple-300 transition-colors">{project.name}</CardTitle>
                                    <div className="text-2xl font-bold text-purple-400">#{index + 1}</div>
                                </div>
                                <p className="text-sm text-gray-400">by {project.owner_username || 'Anonymous'}</p>
                            </CardHeader>
                            <CardContent className="flex-grow flex flex-col">
                                <p className="text-gray-400 line-clamp-3 mb-4 flex-grow">{project.description}</p>
                                <div className="flex justify-between text-sm text-gray-300 pt-4 border-t border-gray-700">
                                    <div className="flex items-center gap-2">
                                        <BarChart3 className="w-4 h-4 text-green-400"/>
                                        <span>${(project.monthly_revenue || 0).toLocaleString()} MRR</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Eye className="w-4 h-4 text-blue-400"/>
                                        <span>{project.view_count || 0} Views</span>
                                    </div>
                                </div>
                            </CardContent>
                            <div className="p-4 border-t border-gray-800">
                                <Button className="w-full" onClick={() => navigate(`/projects/${project.project_id}`)}>
                                    View Project <ArrowRight className="ml-2 w-4 h-4" />
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default TrendingPage; 