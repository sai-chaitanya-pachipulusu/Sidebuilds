import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HelpCircle, 
  ChevronDown, 
  Mail, 
  MessageCircle, 
  Search,
  Sparkles,
  Shield,
  CreditCard,
  Users,
  FileText
} from 'lucide-react';
import SEO from '../components/SEO';

const FAQPage = () => {
  const [activeIndex, setActiveIndex] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'All Questions', icon: HelpCircle },
    { id: 'general', name: 'General', icon: Sparkles },
    { id: 'selling', name: 'Selling', icon: CreditCard },
    { id: 'buying', name: 'Buying', icon: Users },
    { id: 'legal', name: 'Legal & Terms', icon: FileText },
    { id: 'security', name: 'Security', icon: Shield }
  ];

  const faqs = [
    {
      category: 'general',
      question: 'What is SideBuilds?',
      answer: 'SideBuilds is a marketplace for buying and selling side projects. Whether you have a project you want to sell or are looking for a new venture to take over, SideBuilds connects buyers and sellers with purchase conversations and written handover agreements.'
    },
    {
      category: 'selling',
      question: 'How do I list my project for sale?',
      answer: 'To list your project, navigate to your dashboard, click on the project you wish to sell (or create a new one), and edit its details. You will find an option to "List for Sale". You will need to connect your Stripe account to receive payments securely.'
    },
    {
      category: 'buying',
      question: "How does the new 'Request to Purchase' process work?",
      answer: 'Instead of an immediate "Buy Now", you first "Request to Purchase" a project. The seller then reviews your request and can accept or reject it. If accepted, you will be notified and can then proceed to make the payment through our secure payment system to secure the project. This ensures both parties are ready to proceed before a transaction occurs.'
    },
    {
      category: 'buying',
      question: 'What happens after I request to purchase a project?',
      answer: 'The seller will be notified of your request. They can review it and choose to accept or reject it via their dashboard. You will be notified of their decision. Check your dashboard for updates on your purchase requests.'
    },
    {
      category: 'buying',
      question: "How long does a seller have to respond to my purchase request?",
      answer: "We encourage sellers to respond promptly. Currently, there isn't a strict system-enforced deadline for sellers to respond. If you don't hear back within a reasonable time, you might consider reaching out to the seller if contact information is available, or exploring other projects."
    },
    {
      category: 'buying',
      question: 'What happens if a seller rejects my purchase request?',
      answer: 'You will be notified if a seller rejects your request. This means the seller has decided not to proceed with the sale to you at this time. You are free to explore other projects on the marketplace and can make offers on multiple projects.'
    },
    {
      category: 'buying',
      question: "Once a seller accepts my request, how long do I have to make the payment?",
      answer: "While there isn't a strict countdown timer enforced by the system, prompt payment is highly recommended to secure the project. If payment is significantly delayed, the seller might choose to cancel the accepted request or accept other offers."
    },
    {
      category: 'selling',
      question: 'What is the commission fee for selling a project?',
      answer: 'SideBuilds charges a platform commission of 5% on the final sale price of a project. This fee is automatically deducted during the payment process. For example, if a project sells for $100, the seller receives $95. Payment processing and any other costs should be confirmed in the purchase scope. Stripe does not provide an escrow service.'
    },
    {
      category: 'selling',
      question: "How do I receive payments for my sold projects?",
      answer: "Sellers are required to connect their Stripe account for secure payment processing. When a project is sold and the buyer makes a payment, the funds (minus the platform commission) are processed through Stripe and directed to your connected account. Payouts are handled according to Stripe's standard payout schedule."
    },
    {
      category: 'security',
      question: 'Is it secure to connect my Stripe account?',
      answer: 'Yes, it is very secure. SideBuilds uses Stripe Connect, which means your sensitive financial details are handled directly by Stripe, a PCI Level 1 certified payment processor. We do not store your bank account or credit card details on our servers. All transactions are encrypted and monitored for fraud.'
    },
    {
      category: 'buying',
      question: 'What happens after I pay for a project?',
      answer: 'After your payment is confirmed, the project purchase status changes to "Payment Completed - Pending Transfer". You and the seller will then use a dedicated Project Transfer system to manage the handover of assets like code, domain details, and documentation. The seller will update the status as they provide the assets, and you will confirm receipt once everything is delivered as agreed.'
    },
    {
      category: 'general',
      question: 'How is the transfer of assets managed?',
      answer: 'Asset transfer is managed through our secure transfer system. The seller will provide updates, instructions, and links to assets (e.g., GitHub repository access, code archives, domain transfer codes) through the platform. You should monitor the transfer progress and communicate with the seller to ensure a smooth handover.'
    },
    {
      category: 'legal',
      question: 'When does the project ownership officially transfer to me?',
      answer: 'Official ownership of the project in our system transfers to you only AFTER you confirm receipt of all assets through our transfer verification process. This signifies you have received and verified the project assets from the seller. Until this confirmation, the original owner retains official ownership.'
    },
    {
      category: 'general',
      question: 'What if there is an issue with a purchased project or during the transfer?',
      answer: 'Open communication is key. Use our secure messaging system for updates and communication. If there are significant discrepancies or issues, refer to our Terms & Conditions and contact our support team if you cannot resolve it directly with the seller. We have a 7-day verification period post-confirmation for addressing immediate, unforeseen issues.'
    },
    {
      category: 'legal',
      question: 'Can I get a refund?',
      answer: 'Refund policies are outlined in our Terms and Conditions. Generally, sales are final once payment is made, especially for digital goods where assets can be transferred. Refunds are typically only considered in cases of significant misrepresentation by the seller that cannot be resolved, or failure to deliver promised assets. Our request-approve-pay-transfer process is designed to minimize such issues.'
    },
    {
      category: 'security',
      question: 'How do you verify project metrics and authenticity?',
      answer: 'We employ multiple verification methods including revenue verification through payment processor data, traffic analytics integration, and manual review of provided documentation. Verified projects receive a special badge, and we continuously monitor for authenticity to maintain marketplace integrity.'
    },
    {
      category: 'selling',
      question: 'What information should I include when listing my project?',
      answer: 'Include comprehensive details such as accurate revenue figures, traffic metrics, tech stack, operational requirements, and any dependencies. High-quality screenshots, demo links, and documentation significantly improve your chances of finding serious buyers. Transparency builds trust and leads to faster sales.'
    },
    {
      category: 'general',
      question: 'How do I contact customer support?',
      answer: 'You can reach our support team through the contact form on our website, email us directly at support@sidebuilds.online, or use the in-platform messaging system. We aim to respond to all inquiries within 24 hours during business days.'
    }
  ];

  const filteredFAQs = faqs.filter(faq => {
    const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
    const matchesSearch = searchQuery === '' || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleAccordion = (index) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <>
      <SEO 
        title="FAQ - Frequently Asked Questions | SideBuilds" 
        description="Find answers to common questions about buying and selling side projects on SideBuilds marketplace." 
      />
      
      <div className="min-h-screen bg-black">
        {/* Hero Section */}
        <div className="bg-neutral-800    border-b border-white/[0.08]">
          <div className="max-w-4xl mx-auto px-4 py-16 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10/10 border border-white/50/20 rounded-none mb-6">
                <HelpCircle className="w-4 h-4 text-white" />
                <span className="text-sm text-gray-300">Support Center</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Frequently Asked{' '}
                <span className="    text-neutral-100">
                  Questions
                </span>
              </h1>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                Find answers to common questions about using SideBuilds marketplace
              </p>
            </motion.div>

            {/* Search Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="relative max-w-2xl mx-auto"
            >
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search frequently asked questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-none text-white placeholder-gray-400 focus:border-blue-500/50 focus:outline-none transition-all duration-200"
              />
            </motion.div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Categories Sidebar */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-1"
            >
              <div className="bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-none p-6 sticky top-8">
                <h3 className="text-lg font-semibold text-white mb-4">Categories</h3>
                <div className="space-y-2">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setActiveCategory(category.id)}
                      className={`w-full px-4 py-3 rounded-none text-left flex items-center gap-3 transition-all duration-200 ${
                        activeCategory === category.id
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-400 hover:text-white hover:bg-gray-800'
                      }`}
                    >
                      <category.icon className="w-4 h-4" />
                      <span className="font-medium">{category.name}</span>
                      <span className="text-xs bg-gray-700 px-2 py-1 rounded-none ml-auto">
                        {category.id === 'all' ? faqs.length : faqs.filter(faq => faq.category === category.id).length}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* FAQ Content */}
            <div className="lg:col-span-3">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-4"
              >
                {filteredFAQs.length > 0 ? (
                  filteredFAQs.map((faq, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-none overflow-hidden"
                    >
                      <button
                        onClick={() => toggleAccordion(index)}
                        className="w-full px-6 py-6 text-left flex items-center justify-between hover:bg-gray-800/30 transition-colors duration-200"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`px-2 py-1 rounded-none text-xs font-medium ${
                              faq.category === 'general' ? 'bg-blue-500/10 text-blue-400' :
                              faq.category === 'selling' ? 'bg-green-500/10 text-green-400' :
                              faq.category === 'buying' ? 'bg-white/10/10 text-white' :
                              faq.category === 'legal' ? 'bg-yellow-500/10 text-yellow-400' :
                              faq.category === 'security' ? 'bg-red-500/10 text-red-400' :
                              'bg-gray-500/10 text-gray-400'
                            }`}>
                              {categories.find(cat => cat.id === faq.category)?.name || 'General'}
                            </span>
                          </div>
                          <h3 className="text-lg font-semibold text-white">
                            {faq.question}
                          </h3>
                        </div>
                        <motion.div
                          animate={{ rotate: activeIndex === index ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        </motion.div>
                      </button>
                      
                      <AnimatePresence>
                        {activeIndex === index && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="px-6 pb-6 border-t border-white/[0.08]">
                              <div className="pt-4">
                                <p className="text-gray-300 leading-relaxed">
                                  {faq.answer}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-16">
                    <HelpCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No questions found</h3>
                    <p className="text-gray-400 mb-6">
                      Try adjusting your search or category filter.
                    </p>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setActiveCategory('all');
                      }}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-none transition-colors duration-200"
                    >
                      Clear Filters
                    </button>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </div>

        {/* Contact Section */}
        <div className="bg-gray-900/30 border-t border-white/[0.08]">
          <div className="max-w-4xl mx-auto px-4 py-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-center"
            >
              <div className="bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-none p-8">
                <h2 className="text-2xl font-bold text-white mb-4">
                  Still have questions?
                </h2>
                <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
                  Can't find what you're looking for? Our support team is here to help you succeed on SideBuilds marketplace.
                </p>
                
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <motion.a
                    href="mailto:support@sidebuilds.online"
                    className="flex items-center gap-3 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-none font-medium transition-all duration-200"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Mail className="w-5 h-5" />
                    <span>Email Support</span>
                  </motion.a>
                  
                  <motion.button
                    className="flex items-center gap-3 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-none font-medium transition-all duration-200"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span>Live Chat</span>
                  </motion.button>
                </div>

                <div className="mt-8 pt-6 border-t border-white/[0.08]">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
                    <div>
                      <p className="text-gray-400 mb-1">Response Time</p>
                      <p className="text-white font-medium">Within 24 hours</p>
                    </div>
                    <div>
                      <p className="text-gray-400 mb-1">Support Hours</p>
                      <p className="text-white font-medium">Mon-Fri, 9AM-6PM EST</p>
                    </div>
                    <div>
                      <p className="text-gray-400 mb-1">Languages</p>
                      <p className="text-white font-medium">English & Spanish</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
};

export default FAQPage; 
