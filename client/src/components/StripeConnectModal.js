import React, { useState, useEffect } from 'react';
import { createStripeAccountLink } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Modal from './uikit/Modal';
import { Button } from '../shadcn/ui/button';
import { ExternalLink, CheckCircle, AlertTriangle, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const StripeLogo = () => (
    <svg width="60" height="25" viewBox="0 0 60 25" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
        <path d="M59.64 14.28C59.64 10.14 57.35 7.04 53.55 7.04C49.73 7.04 47.2 10.14 47.2 14.24C47.2 19.1 50.13 21.5 53.89 21.5C55.95 21.5 57.5 20.92 58.65 20.02V16.85C57.5 17.61 56.07 18.03 54.38 18.03C52.64 18.03 51.16 17.4 50.9 15.74H59.58C59.58 15.5 59.64 14.68 59.64 14.28ZM50.84 12.7C50.84 10.99 51.97 10.14 53.52 10.14C55.03 10.14 56.08 10.99 56.08 12.7H50.84Z" fill="currentColor"/>
        <path d="M41.33 7.04C39.55 7.04 38.34 7.86 37.64 8.46L37.4 7.34H33.97V24.9L37.67 24.2V20.92C38.38 21.4 39.38 21.5 40.3 21.5C43.59 21.5 46.37 19.1 46.37 14.12C46.33 9.98 43.55 7.04 41.33 7.04ZM40.25 18.03C39.41 18.03 38.84 17.82 38.38 17.42V11.06C38.92 10.58 39.52 10.36 40.25 10.36C42.02 10.36 42.99 11.93 42.99 14.16C42.99 16.47 42.02 18.03 40.25 18.03Z" fill="currentColor"/>
        <path d="M30.19 3.22L26.5 3.92V7.34H24.2V10.72H26.5V16.14C26.5 19.32 28.41 21.5 31.81 21.5C32.9 21.5 34.19 21.18 34.95 20.79V17.51C34.32 17.79 30.19 18.95 30.19 15.45V10.72H34.95V7.34H30.19V3.22Z" fill="currentColor"/>
        <path d="M19.66 11.93L18.93 7.34H15.5L18.05 19.21L15.85 24.24L19.12 24.9L25.16 7.34H21.73L19.66 11.93Z" fill="currentColor"/>
    </svg>
);

const StripeConnectModal = ({ isOpen, onClose, onOnboardingComplete, status }) => {
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleConnectStripe = async () => {
        setIsLoading(true);
        try {
            const { url, onboarding_complete } = await createStripeAccountLink();
            if (onboarding_complete) {
                toast.success('Your Stripe account is already connected and verified.');
                onOnboardingComplete();
                onClose();
            } else if (url) {
                window.location.href = url;
            } else {
                toast.error('Could not generate Stripe connection link. Please try again.');
            }
        } catch (error) {
            toast.error(error.message || 'Failed to connect with Stripe.');
        } finally {
            setIsLoading(false);
        }
    };

    const StatusItem = ({ icon: Icon, text, color }) => (
        <motion.div
            className="flex items-center space-x-3"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
        >
            <Icon className={`w-5 h-5 ${color}`} />
            <span className="text-gray-300">{text}</span>
        </motion.div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Connect with Stripe">
            <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-none">
                    <h2 className="text-lg font-semibold text-white">Sell your projects securely</h2>
                    <StripeLogo />
                </div>

                <p className="text-gray-400">
                    We partner with Stripe to handle secure payments and payouts directly to your bank account. Connect your account to start selling.
                    <br />
                    <span className="text-gray-400 text-sm mt-3 block italic">
                        Note: You must complete all Stripe verification steps (identity, bank account, etc.) before you can list projects for sale.
                    </span>
                </p>

                {status && (
                    <div className="p-4 bg-gray-800/50 rounded-none space-y-3">
                        <h3 className="font-semibold text-white">Your Account Status:</h3>
                        <StatusItem 
                            icon={status.isOnboardingComplete ? CheckCircle : AlertTriangle} 
                            text={status.isOnboardingComplete ? "Onboarding Complete" : "Onboarding Incomplete"}
                            color={status.isOnboardingComplete ? "text-green-400" : "text-yellow-400"}
                        />
                        <StatusItem 
                            icon={status.arePayoutsEnabled ? CheckCircle : AlertTriangle} 
                            text={status.arePayoutsEnabled ? "Payouts Enabled" : "Payouts Disabled"}
                            color={status.arePayoutsEnabled ? "text-green-400" : "text-yellow-400"}
                        />
                    </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                        onClick={handleConnectStripe} 
                        disabled={isLoading} 
                        className="flex-1"
                    >
                        {isLoading ? 'Redirecting...' : (status?.isOnboardingComplete ? 'Manage Stripe Account' : 'Connect Stripe Account')}
                        <ExternalLink className="w-4 h-4 ml-2" />
                    </Button>
                    <Button variant="ghost" onClick={onClose} disabled={isLoading}>
                        Cancel
                    </Button>
                </div>
                
                <p className="text-xs text-gray-500 text-center">
                    You will be redirected to Stripe's secure website to complete the connection.
                </p>
            </div>
        </Modal>
    );
};

export default StripeConnectModal; 
