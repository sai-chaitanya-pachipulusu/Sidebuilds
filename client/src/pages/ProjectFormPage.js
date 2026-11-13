import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import { createProject, getProjectById, updateProject, checkStripeOnboardingStatus, aiIdeaAssist } from '../services/api';
import useProjectDraft from '../hooks/useProjectDraft';
import ListingChecklist from '../components/ListingChecklist';
import { buyerBriefFields, briefText } from '../utils/listingGuidance';
import ElegantLoadingScreen from '../components/ElegantLoadingScreen';
import ProjectFileUploader from '../components/ProjectFileUploader';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import StripeConnectModal from '../components/StripeConnectModal';
import { Button } from '../shadcn/ui/button';
import { Card, CardContent, CardHeader } from '../shadcn/ui/card';
import { Input } from '../shadcn/ui/input';
import { Textarea } from '../shadcn/ui/textarea';
import { Checkbox } from '../shadcn/ui/checkbox';
import { Label } from '../shadcn/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../shadcn/ui/select.jsx';
import { Alert, AlertDescription, AlertTitle } from '../shadcn/ui/alert';
import { Info, ExternalLink, FileUp } from 'lucide-react';
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
    const location = useLocation();
    
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
        is_public: false,
        is_for_sale: false,
        sale_price: '',
        monthly_revenue: '',
        contact_email: user?.email || '',
        payment_method: 'stripe'
    });
    const [loading, setLoading] = useState(editMode);
    const [loadError, setLoadError] = useState('');
    const [wasPublicSale, setWasPublicSale] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showStripeModal, setShowStripeModal] = useState(false);
    const [stripeStatus, setStripeStatus] = useState(null);
    const [aiBusy, setAiBusy] = useState(false);
    const [showFileUpload, setShowFileUpload] = useState(location.hash === '#files');
    const draft = useProjectDraft({ userId: user?.user_id || user?.id, enabled: !editMode, formData, setFormData });

    useEffect(() => {
        if (editMode && location.hash === '#files') setShowFileUpload(true);
    }, [editMode, location.hash]);

    useEffect(() => {
        let cancelled = false;
        checkStripeOnboardingStatus().then(status => {
            if (!cancelled) setStripeStatus(status);
        }).catch(() => {
            if (!cancelled) setStripeStatus({ unavailable: true, isOnboardingComplete: false });
        });
        return () => { cancelled = true; };
    }, []);

    const fetchProjectAndStripeStatus = useCallback(async () => {
        if (!editMode || !projectId) return;
        setLoading(true);
        setLoadError('');
        try {
            if (editMode && projectId) {
                const data = await getProjectById(projectId);
                if (!data || Array.isArray(data) || data.project_id !== projectId || typeof data.name !== 'string') {
                    throw new Error('The saved project response is incomplete.');
                }
                setWasPublicSale((data.is_public === true || data.is_public === 1) && (data.is_for_sale === true || data.is_for_sale === 1));
                setFormData({
                    name: data.name || '',
                    description: data.description || '',
                    stage: data.stage || 'idea',
                    stage_details: data.stage_details || {},
                    domain: data.domain || '',
                    demo_url: data.demo_url || '',
                    github_url: data.github_url || '',
                    tech_stack: Array.isArray(data.tech_stack) ? data.tech_stack : [],
                    category: data.category || '',
                    subcategory: data.subcategory || '',
                    tags: Array.isArray(data.tags) ? data.tags.join(', ') : (data.tags || ''),
                    is_public: data.is_public === true || data.is_public === 1,
                    is_for_sale: data.is_for_sale === true || data.is_for_sale === 1,
                    sale_price: data.sale_price || '',
                    monthly_revenue: data.monthly_revenue ?? '',
                    contact_email: data.contact_email || user?.email || '',
                    payment_method: data.payment_method || 'stripe'
                });
            }
        } catch (error) {
            console.error('Error loading page data:', error);
            setLoadError('Your project could not be loaded. Please retry before editing.');
        } finally {
            setLoading(false);
        }
    }, [editMode, projectId, user?.email]);

    useEffect(() => {
        fetchProjectAndStripeStatus();
    }, [fetchProjectAndStripeStatus]);

    useEffect(() => {
        if (loading || loadError) return;
        const fieldId = location.hash.slice(1);
        const allowed = ['name', 'description', 'category', 'tech_stack', 'demo_url', ...buyerBriefFields.map(field => `brief-${field.key}`)];
        if (!allowed.includes(fieldId)) return;
        const field = document.getElementById(fieldId);
        field?.scrollIntoView?.({ block: 'center', behavior: 'auto' });
        field?.focus({ preventScroll: true });
    }, [loading, loadError, location.hash]);

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
        const action = e.nativeEvent?.submitter?.value;
        const savePrivately = action === 'private' || action === 'files';
        const payload = savePrivately ? { ...formData, is_public: false, is_for_sale: false } : formData;
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

        if (payload.is_for_sale && !payload.is_public) {
            toast.error('Enable public visibility to list for sale, or choose Save privately.');
            setIsSubmitting(false);
            return;
        }
        
        if (payload.is_for_sale && (!payload.sale_price || payload.sale_price <= 0)) {
            toast.error("A valid sale price is required for projects listed for sale");
            setIsSubmitting(false);
            return;
        }
        
        const loadingToast = toast.loading(editMode ? 'Updating project...' : 'Creating your project...');
        try {
            
            if (editMode && projectId) {
                await updateProject(projectId, payload);
                toast.success("Project Updated!", { id: loadingToast });
                navigate(`/projects/${projectId}`);
            } else {
                const newProject = await createProject(payload);
                draft.clearDraft();
                toast.success("Project Created!", { id: loadingToast });
                navigate(action === 'files' ? `/projects/edit/${newProject.project_id}#files` : `/projects/${newProject.project_id}`);
            }
        } catch (err) {
            console.error(`Failed to ${editMode ? 'update' : 'create'} project:`, err);
            if ((err.error_code || err.data?.error_code || err.response?.data?.error_code) === 'stripe_account_required') {
                toast.error("Connect Stripe to sell, or save a private project and finish later.", { id: loadingToast });
                setShowStripeModal(true);
            } else {
                const errorMessage = err.response?.data?.message || err.message || `Error ${editMode ? 'Updating' : 'Creating'} Project`;
                toast.error(errorMessage, { id: loadingToast });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return <ElegantLoadingScreen />;
    }
    if (loadError) {
        return <div className="max-w-4xl mx-auto p-8">
            <Alert variant="destructive"><AlertTitle>Project unavailable</AlertTitle><AlertDescription>{loadError}</AlertDescription></Alert>
            <Button className="mt-4" onClick={fetchProjectAndStripeStatus}>Retry</Button>
        </div>;
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
                        <h1 className="text-3xl font-bold text-white">
                            {editMode ? 'Edit Your Project' : 'Create a New Project'}
                        </h1>
                        <p className="text-gray-400 mt-2">
                            {editMode ? 'Update your project and help its next owner get started.' : 'Start with a name. Build your listing privately, then publish when you are ready.'}
                        </p>
                        {!editMode && <p role="status" className="text-sm text-emerald-300 mt-3">{draft.restored ? 'Draft restored. ' : ''}{draft.status}</p>}
                        <Link to="/my-projects" className="text-sm text-gray-300 underline underline-offset-4 mt-3 inline-block">Back to my projects</Link>
                    </CardHeader>
                    <CardContent>
                        <ListingChecklist project={formData} />
                        {stripeStatus && !stripeStatus.isOnboardingComplete && formData.is_for_sale && (
                            <motion.div variants={itemVariants}>
                                <Alert variant="destructive" className="mb-6">
                                    <Info className="h-4 w-4" />
                                    <AlertTitle>Action Required</AlertTitle>
                                    <AlertDescription>
                                        {wasPublicSale ? 'You can save improvements to this listing while completing payment setup. Saving details does not enable payments.' : stripeStatus.unavailable || stripeStatus.verificationStatus === 'unavailable' ? 'Payment setup could not be checked. You can still save privately and finish later.' : 'Connect Stripe before listing for sale. You can save privately and finish this later.'}
                                        <Button variant="link" onClick={() => setShowStripeModal(true)} className="ml-2 text-blue-400">
                                            {stripeStatus.requiresReconnect ? 'Reconnect Stripe' : 'Review payment setup'} <ExternalLink className="h-4 w-4 ml-1" />
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
                                        <SelectTrigger id="stage">
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
                                                    toast.error('The writing assistant is unavailable. You can keep writing below.');
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
                                    <span className="text-blue-400 ml-1">{formData.description.length} characters</span>
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
                                <div><Label htmlFor="demo_url">Demo URL (Optional)</Label>
                                    <Input id="demo_url" name="demo_url" type="url" value={formData.demo_url} onChange={handleChange} placeholder="https://demo.example.com" />
                                    <p className="text-xs text-gray-400 mt-1">A working preview helps buyers try the project at any stage.</p>
                                </div>
                                <div><Label htmlFor="tech_stack">Technologies</Label>
                                    <Input id="tech_stack" value={Array.isArray(formData.tech_stack) ? formData.tech_stack.join(', ') : formData.tech_stack}
                                        onChange={e => setFormData(prev => ({ ...prev, tech_stack: e.target.value }))} placeholder="React, Node.js, PostgreSQL" />
                                    <p className="text-xs text-gray-400 mt-1">Separate technologies with commas so buyers can find your stack.</p>
                                </div>
                            </motion.div>

                            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label htmlFor="category">Category</Label>
                                    <Select onValueChange={(value) => handleSelectChange('category', value)} value={formData.category}>
                                        <SelectTrigger id="category">
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
                                            <Label htmlFor="detail-problem">Problem</Label>
                                            <Textarea id="detail-problem" name="stage_details.problem" value={formData.stage_details.problem || ''}
                                                onChange={(e)=> setFormData(p=>({...p, stage_details: { ...p.stage_details, problem: e.target.value }}))}
                                                rows={3} />
                                        </div>
                                        <div>
                                            <Label htmlFor="detail-audience">Audience</Label>
                                            <Textarea id="detail-audience" name="stage_details.audience" value={formData.stage_details.audience || ''}
                                                onChange={(e)=> setFormData(p=>({...p, stage_details: { ...p.stage_details, audience: e.target.value }}))}
                                                rows={3} />
                                        </div>
                                    </div>
                                )}
                                {formData.stage === 'planning' && (
                                    <div>
                                        <Label htmlFor="detail-milestones">Milestones</Label>
                                        <Textarea id="detail-milestones" name="stage_details.milestones" value={Array.isArray(formData.stage_details.milestones)? formData.stage_details.milestones.join(', ') : (formData.stage_details.milestones || '')}
                                            onChange={(e)=> setFormData(p=>({...p, stage_details: { ...p.stage_details, milestones: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) }}))}
                                            rows={3} placeholder="MVP, Beta, Launch" />
                                    </div>
                                )}
                                {formData.stage === 'mvp' && (
                                    <div>
                                        <Label htmlFor="detail-must_have_features">Must-have Features</Label>
                                        <Textarea id="detail-must_have_features" name="stage_details.must_have_features" value={Array.isArray(formData.stage_details.must_have_features)? formData.stage_details.must_have_features.join(', ') : (formData.stage_details.must_have_features || '')}
                                            onChange={(e)=> setFormData(p=>({...p, stage_details: { ...p.stage_details, must_have_features: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) }}))}
                                            rows={3} placeholder="Auth, Core workflow" />
                                    </div>
                                )}
                                {formData.stage === 'development' && (
                                    <div>
                                        <Label htmlFor="detail-roadmap">Roadmap</Label>
                                        <Textarea id="detail-roadmap" name="stage_details.roadmap" value={Array.isArray(formData.stage_details.roadmap)? formData.stage_details.roadmap.join(', ') : (formData.stage_details.roadmap || '')}
                                            onChange={(e)=> setFormData(p=>({...p, stage_details: { ...p.stage_details, roadmap: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) }}))}
                                            rows={3} placeholder="Feature A, Feature B" />
                                    </div>
                                )}
                                {formData.stage === 'launched' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <Label htmlFor="detail-pricing">Pricing Tiers</Label>
                                            <Textarea id="detail-pricing" name="stage_details.pricing" value={Array.isArray(formData.stage_details.pricing)? formData.stage_details.pricing.join(', ') : (formData.stage_details.pricing || '')}
                                                onChange={(e)=> setFormData(p=>({...p, stage_details: { ...p.stage_details, pricing: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) }}))}
                                                rows={3} placeholder="Free, Pro, Team" />
                                        </div>
                                    </div>
                                )}
                            </motion.div>

                            <motion.div id="buyer-brief" variants={itemVariants} className="space-y-5 border-t border-gray-700 pt-6 scroll-mt-24">
                                <div><h2 className="text-xl font-semibold">Write your buyer brief</h2>
                                    <p className="text-sm text-gray-400 mt-2">Help the next owner understand the handover. These details follow your project's visibility. Leave out passwords, API keys and private customer data.</p>
                                </div>
                                {buyerBriefFields.map(field => <div key={field.key}>
                                    <Label htmlFor={`brief-${field.key}`}>{field.label}</Label>
                                    <Textarea id={`brief-${field.key}`} value={typeof formData.stage_details[field.key] === 'string' ? formData.stage_details[field.key] : briefText(formData.stage_details[field.key])} maxLength={2000} rows={3} placeholder={field.placeholder}
                                        onChange={e => setFormData(prev => ({ ...prev, stage_details: { ...prev.stage_details, [field.key]: e.target.value } }))} />
                                </div>)}
                            </motion.div>

                            <motion.div variants={itemVariants} className="space-y-4">
                                <h2 className="text-lg font-semibold">Publish when you are ready</h2>
                                <p className="text-sm text-gray-400">Private projects are visible only to you. A marketplace listing needs both public visibility and sale enabled.</p>
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
                                    className="p-6 bg-gray-800/50 rounded-none space-y-6 border border-gray-700"
                                >
                                    <h3 className="text-lg font-semibold text-white">Sale Details</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <Label htmlFor="sale_price">Sale Price (USD)</Label>
                                            <Input id="sale_price" name="sale_price" type="number" min="0.01" step="0.01" value={formData.sale_price} onChange={handleChange} placeholder="e.g., 5000" required={formData.is_for_sale} />
                                        </div>
                                        <div>
                                            <Label htmlFor="monthly_revenue">Monthly Revenue (USD)</Label>
                                            <Input id="monthly_revenue" name="monthly_revenue" type="number" min="0" step="0.01" value={formData.monthly_revenue} onChange={handleChange} placeholder="e.g., 500" />
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* File Upload Section */}
                            <motion.div id="files" variants={itemVariants} className="space-y-4 scroll-mt-24">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                        <FileUp className="w-5 h-5" />
                                        Project Files
                                    </h3>
                                    {editMode && <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowFileUpload(!showFileUpload)}
                                    >
                                        {showFileUpload ? 'Hide File Upload' : 'Add Files'}
                                    </Button>}
                                </div>
                                {!editMode && <div className="border border-gray-700 p-4 space-y-3">
                                    <p className="text-sm text-gray-300">Save your project privately first, then attach files to it. No payment setup is needed.</p>
                                    <Button type="submit" value="files" formNoValidate variant="outline" disabled={isSubmitting}>Save privately & add files</Button>
                                </div>}
                                
                                <AnimatePresence>
                                    {editMode && showFileUpload && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="p-6 bg-gray-800/30 rounded-none border border-gray-700"
                                        >
                                            <p className="text-sm text-gray-400 mb-4">
                                                Upload source code (ZIP), documentation (PDF), screenshots, or other project assets. 
                                                Max 50MB per file.
                                            </p>
                                            <ProjectFileUploader
                                                projectId={projectId}
                                                acceptedTypes={['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'zip', 'txt', 'md', 'json', 'js', 'ts', 'jsx', 'tsx', 'html', 'css', 'py']}
                                                maxFiles={10}
                                                maxSize={50}
                                                showExistingFiles={editMode}
                                                allowFileDeletion={true}
                                            />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>

                            <motion.div variants={itemVariants} className="flex flex-wrap justify-end gap-3 pt-4 border-t border-gray-700">
                                {(formData.is_public || formData.is_for_sale) && <Button type="submit" value="private" formNoValidate variant="outline" disabled={isSubmitting}>Save privately</Button>}
                                <Button type="submit" size="lg" disabled={isSubmitting}>
                                    {isSubmitting ? 'Saving...' : editMode ? 'Save Changes' : formData.is_for_sale && formData.is_public ? 'Publish sale listing' : formData.is_public ? 'Publish project' : 'Create private project'}
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
