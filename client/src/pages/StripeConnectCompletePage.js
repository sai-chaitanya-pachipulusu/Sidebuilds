import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { checkStripeOnboardingStatus } from '../services/api';
import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle, Loader2, ArrowRight, Home } from 'lucide-react';
import { Button } from '../shadcn/ui/button';
import { Card, CardContent } from '../shadcn/ui/card';
import SEO from '../components/SEO';

function StripeConnectCompletePage() {
    const navigate = useNavigate();
    const { user, fetchUserProfile } = useAuth();
    const [status, setStatus] = useState('loading'); // loading, success, partial, error
    const [message, setMessage] = useState('Verifying your Stripe connection...');
    const verificationAttempted = useRef(false);

    useEffect(() => {
        const verifyAndUpdateStatus = async () => {
            if (verificationAttempted.current) return;
            verificationAttempted.current = true;

            if (user) {
                try {
                    const statusData = await checkStripeOnboardingStatus();
                    console.log('Stripe status on return:', statusData);
                    
                    if (statusData && statusData.isOnboardingComplete && statusData.arePayoutsEnabled) {
                        setStatus('success');
                        setMessage('Your Stripe account is successfully connected! You can now receive payments.');
                        if (fetchUserProfile) await fetchUserProfile(); 
                        
                        setTimeout(() => navigate('/dashboard'), 3000);
                    } else if (statusData && statusData.isOnboardingComplete && !statusData.arePayoutsEnabled) {
                        setStatus('partial');
                        setMessage('Account details submitted. Payouts are pending Stripe review.');
                        if (fetchUserProfile) await fetchUserProfile();
                        
                        setTimeout(() => navigate('/dashboard'), 4000);
                    } else {
                        setStatus('error');
                         setMessage('Onboarding incomplete. Please check your settings.');
                    }

                } catch (err) {
                    console.error("Failed to verify Stripe status:", err);
                    setStatus('error');
                    setMessage('Failed to verify connection. Please check your Profile Settings.');
                }
            } else {
                setStatus('error');
                setMessage('User session not found.');
                setTimeout(() => navigate('/login'), 2000);
            }
        };

        verifyAndUpdateStatus();
    }, [user, navigate, fetchUserProfile]);

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
            <SEO title="Stripe Connection - SideBuilds" />
            
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                <Card className="bg-gray-900 border-white/10 shadow-2xl">
                    <CardContent className="pt-8 pb-8 px-6 text-center">
                        <div className="mb-6 flex justify-center">
                            {status === 'loading' && (
                                <div className="relative">
                                    <div className="w-16 h-16 rounded-full border-4 border-purple-500/30 border-t-purple-500 animate-spin"></div>
                                </div>
                            )}
                            {status === 'success' && (
                                <motion.div 
                                    initial={{ scale: 0 }} 
                                    animate={{ scale: 1 }}
                                    className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center"
                                >
                                    <CheckCircle className="w-8 h-8 text-green-500" />
                                </motion.div>
                            )}
                            {status === 'partial' && (
                                <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center">
                                    <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
                                </div>
                            )}
                            {status === 'error' && (
                                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
                                    <AlertCircle className="w-8 h-8 text-red-500" />
                                </div>
                            )}
                        </div>

                        <h2 className="text-2xl font-bold text-white mb-2">
                            {status === 'loading' && 'Verifying Connection'}
                            {status === 'success' && 'Connection Complete'}
                            {status === 'partial' && 'Pending Review'}
                            {status === 'error' && 'Connection Issue'}
                        </h2>
                        
                        <p className="text-gray-400 mb-8 leading-relaxed">
                            {message}
                        </p>

                        <div className="space-y-3">
                            {status === 'error' ? (
                                <>
                                    <Button 
                                        onClick={() => navigate('/profile-settings')}
                                        className="w-full bg-purple-600 hover:bg-purple-700"
                                    >
                                        Go to Settings
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        onClick={() => navigate('/')}
                                        className="w-full text-gray-400 hover:text-white"
                                    >
                                        Return Home
                                    </Button>
                                </>
                            ) : (
                                <Button 
                                    onClick={() => navigate('/dashboard')}
                                    className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/10"
                                >
                                    Go to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}

export default StripeConnectCompletePage;
