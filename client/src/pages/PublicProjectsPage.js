import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getPublicProjects } from '../services/api';
import { Input } from '../shadcn/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../shadcn/ui/select.jsx';
import { Button } from '../shadcn/ui/button';
import { Card, CardContent, CardHeader } from '../shadcn/ui/card';
import { Badge } from '../shadcn/ui/badge';
import SEO from '../components/SEO';
import { Calendar, DollarSign, ArrowRight } from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } }
};

// Professional muted color palette for project stages
const getStageColor = (stage) => {
    const stageColors = {
        'idea': { label: 'Idea', color: 'bg-slate-500/15 text-slate-300 border-slate-500/30' },
        'planning': { label: 'Planning', color: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' },
        'mvp': { label: 'MVP', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
        'development': { label: 'Development', color: 'bg-teal-500/15 text-teal-300 border-teal-500/30' },
        'launched': { label: 'Launched', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
        'on_hold': { label: 'On Hold', color: 'bg-stone-500/15 text-stone-300 border-stone-500/30' }
    };
    return stageColors[stage?.toLowerCase()] || stageColors.idea;
};

const formatPrice = (price) => {
    if (!price) return 'N/A';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(price);
};

const PublicProjectsPage = () => {
    const [projects, setProjects] = useState([]);
    const [filteredProjects, setFilteredProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [sortBy, setSortBy] = useState('newest');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                setLoading(true);
                const data = await getPublicProjects();
                setProjects(data);
                setFilteredProjects(data);
            } catch (err) {
                setError('Failed to load projects.');
            } finally {
                setLoading(false);
            }
        };
        fetchProjects();
    }, []);

    useEffect(() => {
        let tempProjects = [...projects];

        // Apply search filter
        if (searchTerm.trim()) {
            const lower = searchTerm.toLowerCase();
            tempProjects = tempProjects.filter(p =>
                p.name?.toLowerCase().includes(lower) ||
                p.description?.toLowerCase().includes(lower) ||
                p.tech_stack?.toLowerCase().includes(lower) ||
                p.owner_username?.toLowerCase().includes(lower)
            );
        }

        // Apply category filter
        if (categoryFilter !== 'all') {
            tempProjects = tempProjects.filter(p =>
                p.category?.toLowerCase() === categoryFilter.toLowerCase() ||
                p.tech_stack?.toLowerCase().includes(categoryFilter.toLowerCase())
            );
        }

        // Apply sorting
        switch (sortBy) {
            case 'popular':
                tempProjects.sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
                break;
            case 'price_asc':
                tempProjects.sort((a, b) => (a.sale_price || 0) - (b.sale_price || 0));
                break;
            case 'price_desc':
                tempProjects.sort((a, b) => (b.sale_price || 0) - (a.sale_price || 0));
                break;
            case 'newest':
            default:
                tempProjects.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                break;
        }

        setFilteredProjects(tempProjects);
    }, [searchTerm, categoryFilter, sortBy, projects]);

    if (loading) return <div>Loading...</div>;
    if (error) return <div>{error}</div>;

    return (
        <div className="min-h-screen bg-black text-white">
            <SEO title="Public Projects" description="Browse all public projects available on SideBuilds." />
            <div className="relative pt-24 pb-12 px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <motion.div 
                    className="text-center mb-16"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <h1 className="text-5xl font-bold mb-4">Explore Public Projects</h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">Discover what our community is building. Find inspiration or your next big opportunity.</p>
                </motion.div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    <Input
                        type="search"
                        placeholder="Search projects..."
                        className="lg:col-span-2"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger><SelectValue placeholder="Filter by Category" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            <SelectItem value="saas">SaaS</SelectItem>
                            <SelectItem value="ecommerce">E-commerce</SelectItem>
                            <SelectItem value="mobile">Mobile</SelectItem>
                            <SelectItem value="ai">AI/ML</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger><SelectValue placeholder="Sort by" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="newest">Newest</SelectItem>
                            <SelectItem value="popular">Most Popular</SelectItem>
                            <SelectItem value="price_asc">Price: Low to High</SelectItem>
                            <SelectItem value="price_desc">Price: High to Low</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <motion.div 
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    {filteredProjects.map(project => (
                        <motion.div key={project.project_id} variants={itemVariants}>
                            <Card className="bg-gray-900/50 border-gray-700 h-full flex flex-col group">
                                <div className="relative">
                                    <img src={project.image_url || `https://source.unsplash.com/random/400x200?tech,${project.project_id}`} alt={project.name} className="w-full h-40 object-cover rounded-t-lg" />
                                    <div className="absolute top-2 right-2">
                                        <Badge variant="secondary" className="bg-gray-800/80 text-white backdrop-blur-sm">{getStageColor(project.stage).label}</Badge>
                                    </div>
                                </div>
                                <CardHeader>
                                    <h3 className="text-xl font-bold text-white group-hover:text-white transition-colors">{project.name}</h3>
                                    <p className="text-sm text-gray-400">by {project.owner_username || 'Anonymous'}</p>
                                </CardHeader>
                                <CardContent className="flex-grow flex flex-col">
                                    <p className="text-gray-400 line-clamp-3 mb-4 flex-grow">{project.description}</p>
                                    <div className="flex justify-between items-center text-sm text-gray-300 border-t border-gray-700 pt-4">
                                        <div className="flex items-center gap-1">
                                            <DollarSign className="w-4 h-4 text-green-400" />
                                            <span>{formatPrice(project.sale_price)}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-4 h-4 text-gray-500" />
                                            <span>{new Date(project.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </CardContent>
                                <div className="p-4 border-t border-gray-800">
                                    <Button className="w-full" onClick={() => navigate(`/projects/${project.project_id}`)}>
                                        View Details <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </div>
    );
};

export default PublicProjectsPage; 
