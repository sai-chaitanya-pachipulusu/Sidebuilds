import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search,
  UserCheck,
  DollarSign,
  Package,
  Check,
  Edit3,
  TrendingUp,
  Shield,
  MessageCircle,
  Zap,
  ArrowRight,
  Users,
  Star,
  CheckCircle
} from 'lucide-react';
import SEO from '../components/SEO';

const HowItWorksPage = () => {
  const buyerSteps = [
    {
      number: 1,
      icon: Search,
      title: 'Browse Projects',
      description: 'Explore our marketplace of verified side projects. Filter by tech stack, revenue, and price.',
      color: 'blue',
    },
    {
      number: 2,
      icon: MessageCircle,
      title: 'Request to Purchase',
      description: 'Express interest in a project. The seller will review your request and may accept or decline.',
      color: 'gray',
    },
    {
      number: 3,
      icon: DollarSign,
      title: 'Secure Payment',
      description: 'Once accepted, complete payment through Stripe. Your funds are held securely until transfer is complete.',
      color: 'green',
    },
    {
      number: 4,
      icon: Package,
      title: 'Receive Assets',
      description: 'Get all project assets including code, domains, and documentation through our secure transfer process.',
      color: 'orange',
    },
    {
      number: 5,
      icon: Check,
      title: 'Confirm & Launch',
      description: 'Verify all assets are received, then confirm to complete the purchase. You now own the project!',
      color: 'emerald',
    },
  ];

  const sellerSteps = [
    {
      number: 1,
      icon: Edit3,
      title: 'List Your Project',
      description: 'Create a detailed listing with tech stack, revenue data, and pricing. Connect Stripe to receive payments.',
      color: 'teal',
    },
    {
      number: 2,
      icon: UserCheck,
      title: 'Review Requests',
      description: 'Receive purchase requests from interested buyers. Review and accept or decline based on your criteria.',
      color: 'gray',
    },
    {
      number: 3,
      icon: TrendingUp,
      title: 'Get Paid',
      description: 'Once buyer completes payment, funds are processed through Stripe (minus 5% platform fee).',
      color: 'gray',
    },
    {
      number: 4,
      icon: Zap,
      title: 'Transfer Assets',
      description: 'Use our transfer page to securely hand over all project assets to the buyer.',
      color: 'yellow',
    },
    {
      number: 5,
      icon: CheckCircle,
      title: 'Complete Sale',
      description: 'Once buyer confirms receipt, the sale is complete and you receive your payout.',
      color: 'green',
    },
  ];

  const features = [
    {
      icon: Shield,
      title: 'Escrow Protection',
      description: 'Payments are held securely until both parties confirm the transfer is complete.',
      color: 'text-green-400',
    },
    {
      icon: TrendingUp,
      title: 'Verified Metrics',
      description: 'Revenue and traffic data can be verified for authentic project valuations.',
      color: 'text-blue-400',
    },
    {
      icon: Users,
      title: 'Trust System',
      description: 'Build reputation with reviews and ratings from successful transactions.',
      color: 'text-white',
    },
  ];

  const getStepColor = (color) => {
    const colors = {
      blue: 'from-gray-600 to-gray-800',
      gray: 'from-gray-600 to-gray-800',
      green: 'from-green-600 to-green-800',
      orange: 'from-orange-600 to-orange-800',
      emerald: 'from-emerald-600 to-emerald-800',
      teal: 'from-gray-600 to-gray-800',
      gray: 'from-gray-600 to-gray-800',
      gray: 'from-gray-600 to-gray-800',
      yellow: 'from-gray-600 to-gray-800',
    };
    return colors[color] || 'from-gray-600 to-gray-800';
  };

  const getNumberColor = (color) => {
    const colors = {
      blue: 'text-white',
      gray: 'text-white',
      green: 'text-white',
      orange: 'text-orange-400',
      emerald: 'text-emerald-400',
      teal: 'text-white',
      gray: 'text-white',
      gray: 'text-gray-300',
      yellow: 'text-white',
    };
    return colors[color] || 'text-gray-400';
  };

  return (
    <>
      <SEO 
        title="How It Works | SideBuilds" 
        description="Learn how to buy and sell side projects on SideBuilds. Simple, secure, and transparent process for both buyers and sellers." 
      />
      
      <div className="min-h-screen bg-black">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-blue-600/10 via-gray-600/10 to-gray-600/10 border-b border-white/[0.08]">
          <div className="max-w-7xl mx-auto px-4 py-20 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10/10 border border-white/50/20 rounded-full mb-6">
                <Star className="w-4 h-4 text-white" />
                <span className="text-sm text-gray-300">How It Works</span>
              </div>
              
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
                How{' '}
                <span className="bg-gradient-to-r from-blue-400 to-gray-400 bg-clip-text text-transparent">
                  SideBuilds Works
                </span>
              </h1>
              <p className="text-xl text-gray-400 max-w-3xl mx-auto">
                Whether you're buying your next venture or selling a project you've built,
                our platform makes the process secure, transparent, and efficient.
              </p>
            </motion.div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-20">
          <div className="space-y-20">
            {/* For Buyers Section */}
            <div>
              <div className="text-center mb-16">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full mb-6">
                    <Users className="w-4 h-4 text-blue-400" />
                    <span className="text-sm text-blue-300">For Buyers</span>
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-4">
                    Find Your Next Project in 5 Simple Steps
                  </h2>
                </motion.div>
              </div>

              {/* Buyer Steps */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
                {buyerSteps.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="relative"
                    >
                      <div className="flex flex-col items-center space-y-4">
                        <div className="relative">
                          <div className={`w-20 h-20 bg-gradient-to-br ${getStepColor(step.color)} rounded-2xl flex items-center justify-center border border-white/[0.08] shadow-lg`}>
                            <Icon className="w-8 h-8 text-white" />
                          </div>
                          <div className={`absolute -top-2 -right-2 w-8 h-8 bg-gray-900 border-2 border-gray-700 rounded-full flex items-center justify-center text-sm font-bold ${getNumberColor(step.color)}`}>
                            {step.number}
                          </div>
                        </div>
                        <div className="text-center space-y-2">
                          <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                          <p className="text-sm text-gray-400 leading-relaxed">
                            {step.description}
                          </p>
                        </div>
                      </div>
                      
                      {/* Connector Line (except last step) */}
                      {index < buyerSteps.length - 1 && (
                        <div className="hidden md:block absolute top-10 -right-4 w-8 h-0.5 bg-gradient-to-r from-gray-700 to-gray-800" />
                      )}
                    </motion.div>
                  );
                })}
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="text-center mt-12"
              >
                <Link
                  to="/marketplace"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-gray-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-gray-700 transition-all duration-200 shadow-lg shadow-blue-500/25"
                >
                  Browse Projects
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </motion.div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-800" />

            {/* For Sellers Section */}
            <div>
              <div className="text-center mb-16">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full mb-6">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-green-300">For Sellers</span>
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-4">
                    Sell Your Project with Confidence
                  </h2>
                </motion.div>
              </div>

              {/* Seller Steps */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
                {sellerSteps.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="relative"
                    >
                      <div className="flex flex-col items-center space-y-4">
                        <div className="relative">
                          <div className={`w-20 h-20 bg-gradient-to-br ${getStepColor(step.color)} rounded-2xl flex items-center justify-center border border-white/[0.08] shadow-lg`}>
                            <Icon className="w-8 h-8 text-white" />
                          </div>
                          <div className={`absolute -top-2 -right-2 w-8 h-8 bg-gray-900 border-2 border-gray-700 rounded-full flex items-center justify-center text-sm font-bold ${getNumberColor(step.color)}`}>
                            {step.number}
                          </div>
                        </div>
                        <div className="text-center space-y-2">
                          <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                          <p className="text-sm text-gray-400 leading-relaxed">
                            {step.description}
                          </p>
                        </div>
                      </div>
                      
                      {/* Connector Line (except last step) */}
                      {index < sellerSteps.length - 1 && (
                        <div className="hidden md:block absolute top-10 -right-4 w-8 h-0.5 bg-gradient-to-r from-gray-700 to-gray-800" />
                      )}
                    </motion.div>
                  );
                })}
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="text-center mt-12"
              >
                <Link
                  to="/create"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg shadow-green-500/25"
                >
                  List Your Project
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </motion.div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-800" />

            {/* Trust & Safety Features */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-16"
              >
                <h2 className="text-3xl font-bold text-white mb-4">
                  Built on Trust & Security
                </h2>
                <p className="text-lg text-gray-400">
                  Every transaction is protected by our comprehensive safety measures
                </p>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
                {features.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-2xl p-8 text-center hover:border-white/[0.12] hover:scale-105 transition-all duration-200 group"
                    >
                      <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 ${feature.color} bg-current/10`}>
                        <Icon className={`w-8 h-8 ${feature.color}`} />
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-3 group-hover:text-gray-300 transition-colors duration-200">
                        {feature.title}
                      </h3>
                      <p className="text-gray-400 leading-relaxed">
                        {feature.description}
                      </p>
                    </motion.div>
                  );
                })}
              </div>

              {/* Detailed Asset Transfer Section */}
              <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="bg-gray-900 rounded-3xl border border-white/10 p-12 overflow-hidden relative"
              >
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/10/10 rounded-full filter blur-3xl pointer-events-none" />
                  
                  <div className="grid md:grid-cols-2 gap-16 items-center">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 text-green-400 rounded-full text-sm font-medium mb-6">
                            <Shield className="w-4 h-4" />
                            Secure Escrow System
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-6">The Asset Transfer Process</h2>
                        <div className="space-y-6 text-gray-400">
                            <p>
                                We've engineered a transfer process that protects both the creator's IP and the buyer's investment. Here is exactly how "Vibe Engineered" projects change hands:
                            </p>
                            
                            <ol className="space-y-4">
                                <li className="flex gap-4">
                                    <div className="flex-none w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-white font-bold border border-gray-700">1</div>
                                    <div>
                                        <h4 className="text-white font-semibold">Funds Secured</h4>
                                        <p className="text-sm">Buyer deposits funds into our secure escrow vault. Seller sees proof of funds but cannot access them yet.</p>
                                    </div>
                                </li>
                                <li className="flex gap-4">
                                    <div className="flex-none w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-white font-bold border border-gray-700">2</div>
                                    <div>
                                        <h4 className="text-white font-semibold">Asset Handover</h4>
                                        <p className="text-sm">Seller transfers domains, GitHub repositories, and API keys via our dedicated secure transfer dashboard.</p>
                                    </div>
                                </li>
                                <li className="flex gap-4">
                                    <div className="flex-none w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-white font-bold border border-gray-700">3</div>
                                    <div>
                                        <h4 className="text-white font-semibold">Verification & Release</h4>
                                        <p className="text-sm">Buyer reviews the assets. Once confirmed, funds are instantly released to the seller's Stripe account.</p>
                                    </div>
                                </li>
                            </ol>
                        </div>
                    </div>
                    <div className="relative">
                        {/* Abstract visual representation of transfer */}
                        <div className="relative z-10 bg-black/50 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-white/10/20 flex items-center justify-center">
                                        <UserCheck className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <div className="h-2 w-20 bg-gray-700 rounded mb-1" />
                                        <div className="h-2 w-12 bg-gray-800 rounded" />
                                    </div>
                                </div>
                                <div className="h-px flex-1 bg-gradient-to-r from-white/50/50 to-blue-500/50 mx-4 relative">
                                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-black border border-green-500 rounded-full flex items-center justify-center z-10">
                                        <Shield className="w-4 h-4 text-green-500" />
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                                        <Users className="w-5 h-5 text-blue-400" />
                                    </div>
                                     <div>
                                        <div className="h-2 w-20 bg-gray-700 rounded mb-1" />
                                        <div className="h-2 w-12 bg-gray-800 rounded" />
                                    </div>
                                </div>
                            </div>
                            <div className="bg-green-900/20 border border-green-500/20 rounded-xl p-4 flex items-center gap-3">
                                <CheckCircle className="w-5 h-5 text-green-400" />
                                <span className="text-green-400 font-medium">Escrow Secured: $5,000.00</span>
                            </div>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-r from-white/50/10 to-blue-500/10 filter blur-2xl transform scale-110 -z-10" />
                    </div>
                  </div>
              </motion.div>

            </div>

            {/* What You Can Sell Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-20"
            >
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full mb-6">
                  <Package className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-green-300">What You Can Sell</span>
                </div>
                <h2 className="text-3xl font-bold text-white mb-4">
                  Sell Projects at Any Stage
                </h2>
                <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                  Unlike other platforms, SideBuilds welcomes projects at every stage of development.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  {
                    emoji: '💡',
                    title: 'Ideas & Concepts',
                    description: 'Have a validated idea but no time to build? Sell the concept, market research, and domain.',
                    examples: 'Domain names, business plans, market research'
                  },
                  {
                    emoji: '🔨',
                    title: 'Unfinished Projects',
                    description: 'Started building but couldn\'t finish? Someone else might want to complete it.',
                    examples: 'Partially built apps, MVPs in progress'
                  },
                  {
                    emoji: '🚀',
                    title: 'MVP & Launched Products',
                    description: 'Working product with users? Sell it to someone who can scale it further.',
                    examples: 'SaaS apps, mobile apps, websites'
                  },
                  {
                    emoji: '📜',
                    title: 'IP & Digital Assets',
                    description: 'Sell intellectual property, codebases, design systems, or any digital assets.',
                    examples: 'Code libraries, templates, design kits'
                  }
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                    className="bg-gray-900/50 border border-white/[0.08] rounded-2xl p-6 hover:border-green-500/30 transition-all duration-300"
                  >
                    <div className="text-4xl mb-4">{item.emoji}</div>
                    <h3 className="text-xl font-semibold text-white mb-2">{item.title}</h3>
                    <p className="text-gray-400 text-sm mb-4">{item.description}</p>
                    <p className="text-xs text-gray-500">{item.examples}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Payment Information Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-20"
            >
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10/10 border border-white/50/20 rounded-full mb-6">
                  <DollarSign className="w-4 h-4 text-white" />
                  <span className="text-sm text-gray-300">Secure Payments</span>
                </div>
                <h2 className="text-3xl font-bold text-white mb-4">
                  How Payments Work
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* For Buyers */}
                <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/10 border border-blue-500/20 rounded-2xl p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-blue-500/20 rounded-xl">
                      <Users className="w-6 h-6 text-blue-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-white">For Buyers</h3>
                  </div>
                  <ul className="space-y-4">
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-white font-medium">Pay with Credit/Debit Card</p>
                        <p className="text-gray-400 text-sm">No setup required. Just enter your card at checkout.</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-white font-medium">Escrow Protection</p>
                        <p className="text-gray-400 text-sm">Your payment is held securely until you confirm receipt of all assets.</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-white font-medium">Dispute Resolution</p>
                        <p className="text-gray-400 text-sm">If something goes wrong, we'll help resolve it before releasing funds.</p>
                      </div>
                    </li>
                  </ul>
                </div>

                {/* For Sellers */}
                <div className="bg-gradient-to-br from-gray-900/30 to-gray-800/10 border border-white/50/20 rounded-2xl p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-white/10/20 rounded-xl">
                      <DollarSign className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-white">For Sellers</h3>
                  </div>
                  <ul className="space-y-4">
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-white font-medium">Connect Stripe (Optional)</p>
                        <p className="text-gray-400 text-sm">Only required when listing your first project for sale.</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-white font-medium">Receive 95% of Sale</p>
                        <p className="text-gray-400 text-sm">We take only a 5% platform fee. Funds deposited directly to your bank.</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-white font-medium">Fast Payouts</p>
                        <p className="text-gray-400 text-sm">After buyer confirms receipt, funds are released to your account.</p>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </motion.div>

            {/* CTA Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-gradient-to-r from-gray-600/20 via-blue-600/20 to-gray-600/20 border border-white/[0.08] rounded-2xl p-12 text-center"
            >
              <h2 className="text-3xl font-bold text-white mb-4">
                Ready to Get Started?
              </h2>
              <p className="text-lg text-gray-400 mb-8">
                Join thousands of makers buying and selling projects on SideBuilds
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link
                    to="/register"
                    className="px-8 py-4 bg-gradient-to-r from-gray-600 to-blue-600 text-white rounded-xl font-medium hover:from-gray-700 hover:to-blue-700 transition-all duration-200 shadow-lg shadow-white-500/25"
                  >
                    Create Account
                  </Link>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link
                    to="/marketplace"
                    className="px-8 py-4 bg-gray-800 text-white rounded-xl font-medium hover:bg-gray-700 border border-gray-700 hover:border-gray-600 transition-all duration-200"
                  >
                    Explore Projects
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
};

export default HowItWorksPage; 
