import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createProject, getProjectById, updateProject, checkStripeOnboardingStatus, aiIdeaAssist } from '../services/api';
import ElegantLoadingScreen from '../components/ElegantLoadingScreen';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import StripeConnectModal from '../components/StripeConnectModal';
import { Button } from '../shadcn/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../shadcn/ui/card';
import { Input } from '../shadcn/ui/input';
import { Textarea } from '../shadcn/ui/textarea';
import { Checkbox } from '../shadcn/ui/checkbox';
import { Label } from '../shadcn/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../shadcn/ui/select.jsx';
import { Alert, AlertDescription, AlertTitle } from '../shadcn/ui/alert';
import { Info, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

const projectStages = ['idea', 'planning', 'mvp', 'development', 'launched', 'on_hold'];

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { staggerChildren: 0.1, duration: 0.4 } 
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
};

const ProjectFormPage = ({ editMode: propEditMode }) => {
    const { id: projectId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    
    const editMode = propEditMode || !!projectId;

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        stage: 'idea',
        stage_details: {},
        domain: '',
        demo_url: '',
        github_url: '',
        tech_stack: [],
        category: '',
        subcategory: '',
        tags: '',
        is_public: true,
        is_for_sale: false,
        sale_price: '',
        monthly_revenue: '',
        contact_email: user?.email || '',
        payment_method: 'stripe'
    });
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showStripeModal, setShowStripeModal] = useState(false);
    const [stripeStatus, setStripeStatus] = useState(null);
    const [aiBusy, setAiBusy] = useState(false);

    const fetchProjectAndStripeStatus = useCallback(async () => {
        try {
            // Add timeout to prevent infinite loading
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Request timeout')), 10000)
            );
            
            // Fetch Stripe status with timeout - don't block if it fails
            try {
                const status = await Promise.race([checkStripeOnboardingStatus(), timeoutPromise]);
                setStripeStatus(status);
            } catch (stripeErr) {
                console.log('Stripe status check failed (non-blocking):', stripeErr.message);
                // Set a default status so the page still works
                setStripeStatus({ isOnboardingComplete: false, needsAttention: false });
            }

            if (editMode && projectId) {
                const data = await getProjectById(projectId);
                setFormData({
                    name: data.name || '',
                    description: data.description || '',
                    stage: data.stage || 'idea',
                    stage_details: data.stage_details || {},
                    domain: data.domain || '',
                    demo_url: data.demo_url || '',
                    github_url: data.github_url || '',
                    tech_stack: Array.isArray(data.tech_stack) ? data.tech_stack : [],
                    is_public: data.is_public ?? true,
                    is_for_sale: data.is_for_sale ?? false,
                    sale_price: data.sale_price || '',
                    monthly_revenue: data.monthly_revenue || '',
                    contact_email: data.contact_email || user?.email || '',
                    payment_method: data.payment_method || 'stripe'
                });
            }
        } catch (error) {
            console.error('Error loading page data:', error);
            // Still allow the page to load even if there's an error
        } finally {
            setLoading(false);
        }
    }, [editMode, projectId, user]);

    useEffect(() => {
        fetchProjectAndStripeStatus();
    }, [fetchProjectAndStripeStatus]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSelectChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleOnboardingComplete = () => {
        const checkStatus = async () => {
            const loadingToast = toast.loading("Checking your Stripe connection status...");
            try {
                const status = await checkStripeOnboardingStatus();
                setStripeStatus(status);
                if (status.isOnboardingComplete) {
                    toast.success("Stripe account fully connected and verified!", { id: loadingToast });
                } else {
                    toast.success("Account created! Please finish onboarding to start selling.", { id: loadingToast, icon: '⚠️' });
                }
            } catch (err) {
                toast.error("Connected to Stripe, but failed to verify status.", { id: loadingToast });
            }
        };
        checkStatus();
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        // Frontend validation
        if (!formData.name?.trim()) {
            toast.error("Project name is required");
            setIsSubmitting(false);
            return;
        }
        
        if (!formData.stage) {
            toast.error("Project stage is required");
            setIsSubmitting(false);
            return;
        }
        
        if (formData.is_for_sale && (!formData.sale_price || formData.sale_price <= 0)) {
            toast.error("A valid sale price is required for projects listed for sale");
            setIsSubmitting(false);
            return;
        }
        
        try {
            console.log('Submitting project data:', formData);
            if (editMode && projectId) {
                await updateProject(projectId, formData);
                toast.success("Project Updated!");
                navigate(`/projects/${projectId}`);
            } else {
                const newProject = await createProject(formData);
                console.log('Project created successfully:', newProject);
                toast.success("Project Created!");
                navigate(`/projects/${newProject.project_id}`);
            }
        } catch (err) {
            console.error(`Failed to ${editMode ? 'update' : 'create'} project:`, err);
            if (err.response?.data?.error_code === 'stripe_account_required') {
                toast.error("Stripe account required to list projects for sale.");
                setShowStripeModal(true);
            } else {
                const errorMessage = err.response?.data?.message || err.message || `Error ${editMode ? 'Updating' : 'Creating'} Project`;
                toast.error(errorMessage);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return <ElegantLoadingScreen />;
    }
    
    return (
        <div className="min-h-screen bg-black text-white py-12 px-4 sm:px-6 lg:px-8">
            <motion.div 
                className="max-w-4xl mx-auto"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                <Card className="bg-gray-900/50 border-gray-700">
                    <CardHeader>
                        <CardTitle className="text-3xl font-bold text-white">
                            {editMode ? 'Edit Your Project' : 'Create a New Project'}
                        </CardTitle>
                        <p className="text-gray-400 mt-2">
                            {editMode ? 'Update the details of your existing project.' : 'Fill out the details below to get your project listed.'}
                        </p>
                    </CardHeader>
                    <CardContent>
                        {stripeStatus && !stripeStatus.isOnboardingComplete && formData.is_for_sale && (
                            <motion.div variants={itemVariants}>
                                <Alert variant="destructive" className="mb-6">
                                    <Info className="h-4 w-4" />
                                    <AlertTitle>Action Required</AlertTitle>
                                    <AlertDescription>
                                        You need to complete your Stripe onboarding to sell projects. 
                                        <Button variant="link" onClick={() => setShowStripeModal(true)} className="ml-2 text-blue-400">
                                            Complete Onboarding <ExternalLink className="h-4 w-4 ml-1" />
                                        </Button>
                                    </AlertDescription>
                                </Alert>
                            </motion.div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-8">
                            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label htmlFor="name">Project Name</Label>
                                    <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
                                    <p className="text-sm text-gray-500 mt-1">The official name of your project.</p>
                                </div>
                                <div>
                                    <Label htmlFor="stage">Current Stage</Label>
                                    <Select onValueChange={(value) => handleSelectChange('stage', value)} value={formData.stage}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a stage" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {projectStages.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <div className="mt-2">
                                        <Button type="button" variant="secondary" size="sm" disabled={aiBusy}
                                            onClick={async ()=>{
                                                try {
                                                    setAiBusy(true);
                                                    const { template } = await aiIdeaAssist({ stage: formData.stage, category: 'general' });
                                                    setFormData(prev => ({ ...prev, stage_details: { ...prev.stage_details, ...template } }));
                                                } catch (e) {
                                                    console.error(e);
                                                } finally { setAiBusy(false); }
                                            }}>
                                            {aiBusy ? 'Generating…' : 'AI Fill Stage Template'}
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div variants={itemVariants}>
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows={5}
                                    placeholder="Describe your project in 2-3 sentences. What problem does it solve? Who is your target audience?"
                                />
                                <p className="text-sm text-gray-500 mt-1">
                                    A brief, compelling description of what your project does. Focus on the value proposition.
                                    <span className="text-blue-400 ml-1">{formData.description.length}/500 characters</span>
                                </p>
                            </motion.div>

                            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label htmlFor="domain">Domain (Optional)</Label>
                                    <Input id="domain" name="domain" value={formData.domain} onChange={handleChange} placeholder="e.g., myproject.com" />
                                    <p className="text-xs text-gray-500 mt-1">Your project's website domain if it has one</p>
                                </div>
                                <div>
                                    <Label htmlFor="github_url">GitHub URL (Optional)</Label>
                                    <Input id="github_url" name="github_url" type="url" value={formData.github_url} onChange={handleChange} placeholder="https://github.com/user/repo" />
                                    <p className="text-xs text-gray-500 mt-1">Repository URL for code review and verification</p>
                                </div>
                            </motion.div>

                            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label htmlFor="category">Category</Label>
                                    <Select onValueChange={(value) => handleSelectChange('category', value)} value={formData.category}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="productivity">Productivity</SelectItem>
                                            <SelectItem value="ecommerce">E-commerce</SelectItem>
                                            <SelectItem value="analytics">Analytics</SelectItem>
                                            <SelectItem value="social">Social Media</SelectItem>
                                            <SelectItem value="education">Education</SelectItem>
                                            <SelectItem value="healthcare">Healthcare</SelectItem>
                                            <SelectItem value="finance">Finance</SelectItem>
                                            <SelectItem value="entertainment">Entertainment</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-sm text-gray-500 mt-1">Primary category for your project</p>
                                </div>
                                <div>
                                    <Label htmlFor="tags">Tags (Optional)</Label>
                                    <Input
                                        id="tags"
                                        name="tags"
                                        value={formData.tags}
                                        onChange={handleChange}
                                        placeholder="react, nodejs, ai, saas (comma-separated)"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Keywords to help buyers find your project</p>
                                </div>
                            </motion.div>

                            {/* Stage-specific inputs */}
                            <motion.div variants={itemVariants} className="space-y-4">
                                {formData.stage === 'idea' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <Label>Problem</Label>
                                            <Textarea name="stage_details.problem" value={formData.stage_details.problem || ''}
                                                onChange={(e)=> setFormData(p=>({...p, stage_details: { ...p.stage_details, problem: e.target.value }}))}
                                                rows={3} />
                                        </div>
                                        <div>
                                            <Label>Audience</Label>
                                            <Textarea name="stage_details.audience" value={formData.stage_details.audience || ''}
                                                onChange={(e)=> setFormData(p=>({...p, stage_details: { ...p.stage_details, audience: e.target.value }}))}
                                                rows={3} />
                                        </div>
                                    </div>
                                )}
                                {formData.stage === 'planning' && (
                                    <div>
                                        <Label>Milestones</Label>
                                        <Textarea name="stage_details.milestones" value={Array.isArray(formData.stage_details.milestones)? formData.stage_details.milestones.join(', ') : (formData.stage_details.milestones || '')}
                                            onChange={(e)=> setFormData(p=>({...p, stage_details: { ...p.stage_details, milestones: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) }}))}
                                            rows={3} placeholder="MVP, Beta, Launch" />
                                    </div>
                                )}
                                {formData.stage === 'mvp' && (
                                    <div>
                                        <Label>Must-have Features</Label>
                                        <Textarea name="stage_details.must_have_features" value={Array.isArray(formData.stage_details.must_have_features)? formData.stage_details.must_have_features.join(', ') : (formData.stage_details.must_have_features || '')}
                                            onChange={(e)=> setFormData(p=>({...p, stage_details: { ...p.stage_details, must_have_features: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) }}))}
                                            rows={3} placeholder="Auth, Core workflow" />
                                    </div>
                                )}
                                {formData.stage === 'development' && (
                                    <div>
                                        <Label>Roadmap</Label>
                                        <Textarea name="stage_details.roadmap" value={Array.isArray(formData.stage_details.roadmap)? formData.stage_details.roadmap.join(', ') : (formData.stage_details.roadmap || '')}
                                            onChange={(e)=> setFormData(p=>({...p, stage_details: { ...p.stage_details, roadmap: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) }}))}
                                            rows={3} placeholder="Feature A, Feature B" />
                                    </div>
                                )}
                                {formData.stage === 'launched' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <Label htmlFor="demo_url">Demo URL</Label>
                                            <Input id="demo_url" name="demo_url" value={formData.demo_url}
                                                onChange={handleChange} placeholder="https://demo.example.com" />
                                        </div>
                                        <div>
                                            <Label>Pricing Tiers</Label>
                                            <Textarea name="stage_details.pricing" value={Array.isArray(formData.stage_details.pricing)? formData.stage_details.pricing.join(', ') : (formData.stage_details.pricing || '')}
                                                onChange={(e)=> setFormData(p=>({...p, stage_details: { ...p.stage_details, pricing: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) }}))}
                                                rows={3} placeholder="Free, Pro, Team" />
                                        </div>
                                    </div>
                                )}
                            </motion.div>

                            <motion.div variants={itemVariants} className="space-y-4">
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="is_public" name="is_public" checked={formData.is_public} onCheckedChange={(checked) => handleChange({ target: { name: 'is_public', value: checked } })} />
                                    <Label htmlFor="is_public">Make Project Publicly Visible</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="is_for_sale" name="is_for_sale" checked={formData.is_for_sale} onCheckedChange={(checked) => handleChange({ target: { name: 'is_for_sale', value: checked } })} />
                                    <Label htmlFor="is_for_sale">List Project for Sale</Label>
                                </div>
                            </motion.div>

                            {formData.is_for_sale && (
                                <motion.div
                                    variants={itemVariants}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-6 bg-gray-800/50 rounded-lg space-y-6 border border-gray-700"
                                >
                                    <h3 className="text-lg font-semibold text-white">Sale Details</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <Label htmlFor="sale_price">Sale Price (USD)</Label>
                                            <Input id="sale_price" name="sale_price" type="number" value={formData.sale_price} onChange={handleChange} placeholder="e.g., 5000" required={formData.is_for_sale} />
                                        </div>
                                        <div>
                                            <Label htmlFor="monthly_revenue">Monthly Revenue (USD)</Label>
                                            <Input id="monthly_revenue" name="monthly_revenue" type="number" value={formData.monthly_revenue} onChange={handleChange} placeholder="e.g., 500" />
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            <motion.div variants={itemVariants} className="flex justify-end pt-4">
                                <Button type="submit" size="lg" disabled={isSubmitting}>
                                    {isSubmitting ? 'Saving...' : (editMode ? 'Save Changes' : 'Create Project')}
                                </Button>
                            </motion.div>
                        </form>
                    </CardContent>
                </Card>

                <StripeConnectModal
                    isOpen={showStripeModal}
                    onClose={() => setShowStripeModal(false)}
                    onOnboardingComplete={handleOnboardingComplete}
                    status={stripeStatus}
                />
            </motion.div>
        </div>
    );
};

export default ProjectFormPage; 