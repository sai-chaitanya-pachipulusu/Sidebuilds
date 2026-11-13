import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Mail, Scale } from 'lucide-react';
import SEO from '../components/SEO';

function TermsPage() {
  const sections = [
    {
      title: '1. Acceptance of Terms',
      content: 'By accessing or using SideBuilds (the "Platform"), you agree to be bound by these Terms and Conditions ("Terms") and our Privacy Policy. If you do not agree to all of these Terms, do not use this Platform.'
    },
    {
      title: '2. Platform Services',
      content: 'SideBuilds provides a marketplace for users to list, discover, buy, and sell side projects ("Projects"). We facilitate connections between buyers and sellers but are not a party to any transaction between users.'
    },
    {
      title: '3. User Accounts',
      content: 'To access certain features, you must register for an account. You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate. You are responsible for safeguarding your password and for all activities that occur under your account.'
    },
    {
      title: '4. Project Listings and Sales',
      content: [
        'Sellers are responsible for the accuracy and legality of their Project listings. By listing a Project for sale, you represent that you have all necessary rights to sell the Project.',
        'Buyers agree to pay the listed price for Projects they purchase. All sales are processed through our third-party payment processor, Stripe.'
      ]
    },
    {
      title: '5. Platform Commission',
      content: 'SideBuilds charges a commission fee of 5% on the final sale price of each Project sold through the Platform. This fee is automatically deducted from the sale proceeds before funds are transferred to the seller.'
    },
    {
      title: '6. Stripe Connect for Sellers',
      content: 'Sellers must connect a valid Stripe account to list projects for sale and receive payouts. By connecting your Stripe account, you agree to Stripe\'s terms of service. SideBuilds is not responsible for any issues arising from your use of Stripe.'
    },
    {
      title: '7. Project Transfers',
      content: 'Upon a successful sale, the seller is obligated to transfer all relevant Project assets to the buyer in a timely manner as described in the Project listing. Buyers have a verification period to ensure the Project matches the description.'
    },
    {
      title: '8. User Conduct',
      content: 'You agree not to use the Platform for any unlawful purpose or in any way that could harm the Platform or its users. This includes, but is not limited to, posting misleading information, infringing on intellectual property rights, or engaging in fraudulent activities.'
    },
    {
      title: '9. Intellectual Property',
      content: 'Sellers retain ownership of their Projects until a sale is completed. Buyers receive the rights to the Project as specified by the seller upon successful purchase. The Platform and its original content, features, and functionality are owned by SideBuilds and are protected by copyright and other intellectual property laws.'
    },
    {
      title: '10. Disclaimers and Limitation of Liability',
      content: 'The Platform is provided "as is" without warranties of any kind. We do not guarantee the quality, safety, or legality of Projects listed. SideBuilds is not liable for any indirect, incidental, special, consequential, or punitive damages arising out of your use of the Platform.'
    },
    {
      title: '11. Dispute Resolution',
      content: 'Disputes between buyers and sellers should first be attempted to be resolved directly. If a resolution cannot be reached, users may contact SideBuilds support for assistance, but we are not obligated to mediate disputes.'
    },
    {
      title: '12. Modification of Terms',
      content: 'We reserve the right to modify these Terms at any time. We will notify users of any material changes. Your continued use of the Platform after such modifications constitutes your acceptance of the new Terms.'
    },
    {
      title: '13. Governing Law',
      content: 'These Terms shall be governed by and construed in accordance with the laws of the United States, without regard to its conflict of law provisions.'
    },
    {
      title: '14. Contact Information',
      content: 'If you have any questions about these Terms, please contact us at support@sidebuilds.online.'
    }
  ];

  return (
    <>
      <SEO 
        title="Terms and Conditions | SideBuilds" 
        description="Read SideBuilds' Terms and Conditions covering platform usage, project sales, user conduct, and legal obligations." 
      />
      
      <div className="min-h-screen bg-black">
        {/* Hero Section */}
        <div className="bg-neutral-800    border-b border-white/[0.08]">
          <div className="max-w-4xl mx-auto px-4 py-20 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10/10 border border-white/50/20 rounded-none mb-6">
                <Scale className="w-4 h-4 text-white" />
                <span className="text-sm text-gray-300">Legal</span>
              </div>
              
              <div className="flex justify-center mb-6">
                <FileText className="w-16 h-16 text-white" />
              </div>
              
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
                Terms and{' '}
                <span className="    text-neutral-100">
                  Conditions
                </span>
              </h1>
              <p className="text-lg text-gray-400 mb-4">
                Last Updated: November 9, 2026
              </p>
              <p className="text-gray-500 max-w-2xl mx-auto">
                Please read these terms carefully before using our platform. These terms govern your use of SideBuilds and outline your rights and responsibilities.
              </p>
            </motion.div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-16">
          {/* Content Sections */}
          <div className="space-y-6">
            {sections.map((section, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-none p-8 hover:border-white/[0.12] transition-all duration-200"
              >
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                  <div className="w-2 h-8 bg-neutral-800   rounded-none" />
                  {section.title}
                </h2>
                
                {Array.isArray(section.content) ? (
                  <div className="space-y-4">
                    {section.content.map((paragraph, pIndex) => (
                      <p key={pIndex} className="text-gray-300 leading-relaxed">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-300 leading-relaxed">
                    {section.content}
                  </p>
                )}
              </motion.div>
            ))}
          </div>

          {/* Divider */}
          <div className="my-12 border-t border-gray-800" />

          {/* Footer Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-neutral-800    border border-white/[0.08] rounded-none p-8 text-center"
          >
            <h3 className="text-xl font-bold text-white mb-4">
              Agreement Acknowledgment
            </h3>
            <p className="text-gray-300 mb-6 leading-relaxed">
              By using SideBuilds, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="mailto:support@sidebuilds.online"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-none font-medium hover:bg-blue-700 transition-colors duration-200"
              >
                <Mail className="w-4 h-4" />
                Contact Support
              </a>
              
              <div className="text-sm text-gray-500">
                Questions about these terms? We're here to help.
              </div>
            </div>
          </motion.div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-8 text-center"
          >
            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <a href="/privacy" className="text-blue-400 hover:text-blue-300 transition-colors duration-200">
                Privacy Policy
              </a>
              <a href="/contact" className="text-blue-400 hover:text-blue-300 transition-colors duration-200">
                Contact Us
              </a>
              <a href="/faq" className="text-blue-400 hover:text-blue-300 transition-colors duration-200">
                FAQ
              </a>
              <a href="/help" className="text-blue-400 hover:text-blue-300 transition-colors duration-200">
                Help Center
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}

export default TermsPage;
