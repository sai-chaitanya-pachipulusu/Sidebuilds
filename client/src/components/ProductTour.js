import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  ChevronRight, 
  ChevronLeft,
  Search,
  ShoppingBag,
  DollarSign,
  Shield,
  Zap,
  CheckCircle,
  Sparkles
} from 'lucide-react';

/**
 * ProductTour - Interactive walkthrough for new users
 * Inspired by Chronicle and Linear
 */
const ProductTour = ({ isOpen, onClose, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [hasCompleted, setHasCompleted] = useState(false);

  const steps = [
    {
      id: 'welcome',
      title: "Welcome to SideBuilds",
      description: "The operating system for modern makers. Let us show you around in 60 seconds.",
      icon: Sparkles,
      gradient: "from-white to-gray-300",
      animation: (
        <motion.div
          className="w-32 h-32 relative"
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        >
          <div className="absolute inset-0 bg-white opacity-10 blur-xl" />
          <div className="absolute inset-4 bg-white opacity-20" />
          <div className="absolute inset-8 bg-white flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-black" />
          </div>
        </motion.div>
      )
    },
    {
      id: 'browse',
      title: "Browse the Marketplace",
      description: "Discover verified side projects, SaaS apps, and digital products. Filter by revenue, tech stack, and price to find your perfect match.",
      icon: Search,
      gradient: "from-blue-500 to-white/50",
      features: [
        "AI-powered search",
        "Revenue verification",
        "Live project demos"
      ]
    },
    {
      id: 'sell',
      title: "List Your Project",
      description: "Get an instant AI valuation, verify your revenue, and reach thousands of potential buyers. Listing is completely free.",
      icon: ShoppingBag,
      gradient: "from-green-500 to-emerald-500",
      features: [
        "Free to list",
        "Instant AI valuation",
        "Buyer matching"
      ]
    },
    {
      id: 'secure',
      title: "Secure Transactions",
      description: "Every purchase is protected with automated escrow. Funds are only released when both parties confirm the transfer is complete.",
      icon: Shield,
      gradient: "from-yellow-500 to-orange-500",
      features: [
        "Built-in escrow",
        "Asset transfer checklist",
        "Dispute resolution"
      ]
    },
    {
      id: 'complete',
      title: "You're All Set!",
      description: "Start exploring the marketplace or list your first project. Join thousands of makers building their dreams.",
      icon: CheckCircle,
      gradient: "from-white to-gray-300",
      cta: true
    }
  ];

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  const nextStep = useCallback(() => {
    if (isLastStep) {
      setHasCompleted(true);
      onComplete?.();
      onClose();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  }, [isLastStep, onComplete, onClose]);

  const prevStep = () => {
    if (!isFirstStep) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const skipTour = () => {
    onClose();
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        nextStep();
      } else if (e.key === 'ArrowLeft') {
        prevStep();
      } else if (e.key === 'Escape') {
        skipTour();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, nextStep]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={skipTour}
        />

        {/* Modal */}
        <motion.div
          className="relative w-full max-w-lg bg-[#0a0a0a] rounded-none border border-white/10 shadow-2xl overflow-hidden"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
        >
          {/* Progress bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-white/5">
            <motion.div
              className={`h-full bg-gradient-to-r ${currentStepData.gradient}`}
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Close button */}
          <button
            onClick={skipTour}
            className="absolute top-4 right-4 w-8 h-8 rounded-none bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors z-10"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Content */}
          <div className="p-8 pt-12">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="text-center"
              >
                {/* Icon or Animation */}
                <div className="flex justify-center mb-6">
                  {currentStepData.animation || (
                    <div className={`w-20 h-20 rounded-none bg-gradient-to-br ${currentStepData.gradient} p-5 shadow-2xl`}>
                      <currentStepData.icon className="w-full h-full text-white" />
                    </div>
                  )}
                </div>

                {/* Title */}
                <h2 className="text-2xl font-bold text-white mb-4">
                  {currentStepData.title}
                </h2>

                {/* Description */}
                <p className="text-gray-400 mb-6 leading-relaxed">
                  {currentStepData.description}
                </p>

                {/* Features list */}
                {currentStepData.features && (
                  <div className="space-y-3 mb-6">
                    {currentStepData.features.map((feature, index) => (
                      <motion.div
                        key={feature}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center gap-3 justify-center"
                      >
                        <CheckCircle className={`w-5 h-5 text-transparent bg-gradient-to-r ${currentStepData.gradient} rounded-none`} style={{ fill: 'url(#grad)' }} />
                        <Zap className={`w-4 h-4 bg-gradient-to-r ${currentStepData.gradient} bg-clip-text text-green-400`} />
                        <span className="text-gray-300">{feature}</span>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* CTA for last step */}
                {currentStepData.cta && (
                  <div className="flex gap-4 justify-center mt-8">
                    <button
                      onClick={() => {
                        onClose();
                        window.location.href = '/marketplace';
                      }}
                      className="px-6 py-3 rounded-none bg-gradient-to-r from-white/50 to-gray-500 text-white font-semibold hover:opacity-90 transition-opacity"
                    >
                      Explore Marketplace
                    </button>
                    <button
                      onClick={() => {
                        onClose();
                        window.location.href = '/create';
                      }}
                      className="px-6 py-3 rounded-none border border-white/20 text-white font-semibold hover:bg-white/5 transition-colors"
                    >
                      List a Project
                    </button>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer Navigation */}
          <div className="flex items-center justify-between px-8 py-4 border-t border-white/5 bg-white/[0.02]">
            {/* Step indicator */}
            <div className="flex gap-1.5">
              {steps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  className={`w-2 h-2 rounded-none transition-all duration-300 ${
                    index === currentStep 
                      ? `w-6 bg-gradient-to-r ${currentStepData.gradient}` 
                      : index < currentStep
                        ? 'bg-white/40'
                        : 'bg-white/10'
                  }`}
                />
              ))}
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center gap-3">
              {!isFirstStep && (
                <button
                  onClick={prevStep}
                  className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
              )}
              
              <button
                onClick={nextStep}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-none bg-gradient-to-r ${currentStepData.gradient} text-white font-medium hover:opacity-90 transition-opacity`}
              >
                {isLastStep ? 'Get Started' : 'Next'}
                {!isLastStep && <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

/**
 * Hook to manage product tour state
 */
export const useProductTour = () => {
  // Check localStorage synchronously on initialization
  const [hasSeenTour, setHasSeenTour] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebuilds_tour_completed') === 'true';
    }
    return false;
  });
  const [isOpen, setIsOpen] = useState(false);

  // Use useCallback for stable function references
  const startTour = useCallback(() => {
    if (!hasSeenTour) {
      setIsOpen(true);
    }
  }, [hasSeenTour]);

  const closeTour = useCallback(() => {
    setIsOpen(false);
  }, []);
  
  const completeTour = useCallback(() => {
    localStorage.setItem('sidebuilds_tour_completed', 'true');
    setHasSeenTour(true);
    setIsOpen(false);
  }, []);

  const resetTour = useCallback(() => {
    localStorage.removeItem('sidebuilds_tour_completed');
    setHasSeenTour(false);
  }, []);

  return {
    isOpen,
    hasSeenTour,
    startTour,
    closeTour,
    completeTour,
    resetTour
  };
};

export default ProductTour;
