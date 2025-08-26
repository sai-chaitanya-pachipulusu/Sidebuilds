import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../shadcn/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../shadcn/ui/card';
import { Checkbox } from '../shadcn/ui/checkbox';
import { Label } from '../shadcn/ui/label';
import { Alert, AlertDescription, AlertTitle } from '../shadcn/ui/alert';
import { CheckCircle, AlertTriangle, Package, Code2, Users, Globe } from 'lucide-react';
import SEO from '../components/SEO';
import toast from 'react-hot-toast';

const assetList = [
    { id: 'domain', label: 'Domain & DNS Records', icon: Globe },
    { id: 'sourceCode', label: 'Full Source Code & History', icon: Code2 },
    { id: 'socialMedia', label: 'Social Media Accounts', icon: Users },
    { id: 'customerList', label: 'Customer List & Data', icon: Package }
];

const ProjectTransferPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { projectId, sellerId } = location.state || {};

    const [assets, setAssets] = useState({
        domain: false,
        sourceCode: false,
        socialMedia: false,
        customerList: false,
    });
    const [agreed, setAgreed] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!projectId || !sellerId) {
            toast.error("No project information provided. Redirecting...");
            navigate('/dashboard');
        }
    }, [projectId, sellerId, navigate]);

    const handleCheckboxChange = (key) => {
        setAssets(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const allAssetsConfirmed = Object.values(assets).every(Boolean);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!allAssetsConfirmed || !agreed) {
            toast.error("Please confirm all assets and agree to the terms.");
            return;
        }
        setIsSubmitting(true);
        // Mock API call
        await new Promise(res => setTimeout(res, 1500));
        toast.success("Transfer confirmed! The project is now yours.");
        setIsSubmitting(false);
        navigate(`/projects/${projectId}`);
    };

    return (
        <div className="min-h-screen bg-black text-white p-8">
            <SEO title="Project Transfer" description="Finalize the transfer of your new project." />
            <div className="max-w-2xl mx-auto">
                <Card className="bg-gray-900/50 border-gray-700">
                    <CardHeader>
                        <CardTitle className="text-3xl">Finalize Project Transfer</CardTitle>
                        <p className="text-gray-400 mt-2">Confirm receipt of all project assets from the seller to complete the transaction. This action is final.</p>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-4 rounded-lg border border-gray-700 p-4">
                                <h3 className="font-semibold text-white">Asset Confirmation Checklist</h3>
                                {assetList.map(asset => (
                                    <div key={asset.id} className="flex items-start space-x-3">
                                        <Checkbox 
                                            id={asset.id} 
                                            checked={assets[asset.id]} 
                                            onCheckedChange={() => handleCheckboxChange(asset.id)}
                                            className="mt-1"
                                        />
                                        <Label htmlFor={asset.id} className="flex items-center gap-2 cursor-pointer">
                                            <asset.icon className="w-4 h-4 text-gray-400" />
                                            {asset.label}
                                        </Label>
                                    </div>
                                ))}
                            </div>

                            <Alert variant={allAssetsConfirmed ? "default" : "destructive"} className="bg-gray-800/50 border-gray-700">
                                {allAssetsConfirmed ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                                <AlertTitle>{allAssetsConfirmed ? "Ready to Finalize" : "Awaiting Confirmation"}</AlertTitle>
                                <AlertDescription>
                                    {allAssetsConfirmed ? "All assets confirmed. You may now complete the transfer." : "Please check all boxes to confirm you have received all assets."}
                                </AlertDescription>
                            </Alert>

                            <div className="border-t border-gray-700 pt-6 space-y-4">
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="terms" checked={agreed} onCheckedChange={setAgreed} />
                                    <Label htmlFor="terms">I understand that this action is irreversible and confirms the successful transfer of ownership.</Label>
                                </div>
                                <Button type="submit" disabled={!allAssetsConfirmed || !agreed || isSubmitting} className="w-full">
                                    {isSubmitting ? 'Finalizing...' : 'Complete Transfer & Release Funds'}
                                    {!isSubmitting && <CheckCircle className="ml-2 w-5 h-5" />}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default ProjectTransferPage; 