import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, ArrowRight, Star, Rocket, Crown } from 'lucide-react';
import SEO from '../components/SEO';

const PricingPage = () => {
  const [isAnnual, setIsAnnual] = useState(false);

  const plans = [
    {
      name: 'Starter',
      price: { monthly: 0, annual: 0 },
      description: 'Perfect for getting started',
      features: [
        'List up to 3 projects',
        'Basic project analytics',
        'Community support',
        'Standard listing visibility',
        'Basic messaging'
      ],
      icon: Rocket,
      color: 'blue',
      popular: false
    },
    {
      name: 'Pro',
      price: { monthly: 29, annual: 290 },
      description: 'For serious entrepreneurs',
      features: [
        'Unlimited project listings',
        'Advanced analytics & insights',
        'Priority customer support',
        'Featured listing placement',
        'Enhanced messaging system',
        'Stripe Connect integration',
        'Custom project showcase',
        'Buyer verification badge'
      ],
      icon: Star,
      color: 'purple',
      popular: true
    },
    {
      name: 'Enterprise',
      price: { monthly: 99, annual: 990 },
      description: 'For scaling businesses',
      features: [
        'Everything in Pro',
        'White-label solution',
        'Custom integrations',
        'Dedicated account manager',
        'Advanced API access',
        'Custom contract templates',
        'Priority listing placement',
        'Advanced security features'
      ],
      icon: Crown,
      color: 'gold',
      popular: false
    }
  ];

  const fadeInUp = {
    initial: { opacity: 0, y: 60 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <SEO 
        title="Pricing - SideBuilds"
        description="Choose the perfect plan for your side project journey. Start free or upgrade for advanced features."
      />
      
      <div className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-cyan-900/20" />
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 pt-24 pb-12">
          {/* Header */}
          <motion.div 
            className="text-center mb-16"
            {...fadeInUp}
          >
            <h1 className="text-5xl md:text-6xl font-bold mb-4">
              Simple, transparent pricing
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Choose the plan that fits your ambitions. All plans include our core marketplace features.
            </p>
          </motion.div>

          {/* Toggle */}
          <motion.div 
            className="flex justify-center mb-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="bg-gray-800/50 p-1 rounded-lg backdrop-blur-sm border border-gray-700">
              <button
                onClick={() => setIsAnnual(false)}
                className={`px-6 py-2 rounded-md transition-all ${
                  !isAnnual 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setIsAnnual(true)}
                className={`px-6 py-2 rounded-md transition-all ${
                  isAnnual 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Annual
                <span className="ml-2 text-xs bg-green-500 text-white px-2 py-1 rounded-full">
                  Save 20%
                </span>
              </button>
            </div>
          </motion.div>

          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.name}
                className={`relative bg-gray-900/50 backdrop-blur-sm border rounded-2xl p-8 ${
                  plan.popular 
                    ? 'border-purple-500 shadow-purple-500/25 shadow-2xl' 
                    : 'border-gray-700'
                }`}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 + 0.3 }}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-purple-600 text-white px-4 py-2 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="text-center mb-8">
                  <plan.icon className="w-12 h-12 mx-auto mb-4 text-purple-400" />
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-gray-400 mb-4">{plan.description}</p>
                  
                  <div className="mb-4">
                    <span className="text-4xl font-bold">
                      ${isAnnual ? plan.price.annual : plan.price.monthly}
                    </span>
                    <span className="text-gray-400">
                      /{isAnnual ? 'year' : 'month'}
                    </span>
                  </div>
                  
                  <button className={`w-full py-3 rounded-lg font-semibold transition-all ${
                    plan.popular 
                      ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                      : 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-600'
                  }`}>
                    Get Started
                    <ArrowRight className="inline ml-2" />
                  </button>
                </div>

                <div className="space-y-4">
                  {plan.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-center">
                      <Check className="w-4 h-4 text-green-400 mr-3 flex-shrink-0" />
                      <span className="text-gray-300">{feature}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          {/* FAQ Section */}
          <motion.div 
            className="mt-24"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <h2 className="text-3xl font-bold text-center mb-12">
              Frequently Asked Questions
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {[
                {
                  question: "Can I change my plan later?",
                  answer: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately."
                },
                {
                  question: "Is there a free trial?",
                  answer: "Yes! You can start with our Starter plan for free and upgrade when you're ready."
                },
                {
                  question: "What payment methods do you accept?",
                  answer: "We accept all major credit cards, PayPal, and bank transfers for annual plans."
                },
                {
                  question: "Do you offer refunds?",
                  answer: "Yes, we offer a 30-day money-back guarantee for all paid plans."
                }
              ].map((faq, index) => (
                <div key={index} className="bg-gray-900/30 rounded-lg p-6 border border-gray-700">
                  <h3 className="font-semibold mb-2">{faq.question}</h3>
                  <p className="text-gray-400">{faq.answer}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
