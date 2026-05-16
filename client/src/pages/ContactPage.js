import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Mail, 
  MessageSquare, 
  Clock, 
  MapPin,
  Phone,
  Send,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedFAQ, setExpandedFAQ] = useState(null);

  const contactReasons = [
    { value: '', label: 'Select a topic' },
    { value: 'general', label: 'General Inquiry' },
    { value: 'support', label: 'Technical Support' },
    { value: 'sales', label: 'Sales Question' },
    { value: 'partnership', label: 'Partnership Opportunity' },
    { value: 'bug', label: 'Report a Bug' },
    { value: 'feature', label: 'Feature Request' },
    { value: 'other', label: 'Other' },
  ];

  const quickFAQs = [
    {
      question: 'How do I list my project for sale?',
      answer: 'Simply create an account, connect your Stripe account for payments, and click "New Project" from your dashboard. Fill in your project details, set a price, and publish!',
    },
    {
      question: 'What fees does SideBuilds charge?',
      answer: 'We charge a 5% platform fee on successful sales. This covers payment processing, security, and our transfer assistance service. There are no listing fees.',
    },
    {
      question: 'How long does the transfer process take?',
      answer: 'Most transfers complete within 48-72 hours after payment. This includes code repository transfer, domain transfer (if applicable), and any other digital assets.',
    },
    {
      question: 'Is my payment secure?',
      answer: 'Yes! All payments are processed through Stripe with bank-level encryption. Funds are held in escrow until the transfer is confirmed complete by both parties.',
    },
  ];

  const contactInfo = [
    {
      icon: Mail,
      title: 'Email',
      value: 'support@sidebuilds.online',
      description: 'We typically respond within 24 hours',
      color: 'text-blue-400',
    },
    {
      icon: Clock,
      title: 'Support Hours',
      value: 'Mon-Fri, 9AM-6PM EST',
      description: 'Weekend support for urgent issues',
      color: 'text-green-400',
    },
    {
      icon: MapPin,
      title: 'Location',
      value: 'Remote First',
      description: 'Team distributed globally',
      color: 'text-white',
    },
  ];

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.subject) {
      newErrors.subject = 'Please select a topic';
    }
    
    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Try to send via API first
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5002/api';
      const response = await fetch(`${apiUrl}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (response.ok) {
        toast.success("Message sent! We'll get back to you within 24 hours.");
      } else {
        // Fallback: open mailto
        const subject = encodeURIComponent(`[SideBuilds] ${formData.subject || 'Contact Form'}: ${formData.name}`);
        const body = encodeURIComponent(`Name: ${formData.name}\nEmail: ${formData.email}\n\nMessage:\n${formData.message}`);
        window.open(`mailto:support@sidebuilds.online?subject=${subject}&body=${body}`, '_blank');
        toast.success("Opening your email client to send the message.");
      }
    } catch (err) {
      // Fallback: open mailto
      const subject = encodeURIComponent(`[SideBuilds] ${formData.subject || 'Contact Form'}: ${formData.name}`);
      const body = encodeURIComponent(`Name: ${formData.name}\nEmail: ${formData.email}\n\nMessage:\n${formData.message}`);
      window.open(`mailto:support@sidebuilds.online?subject=${subject}&body=${body}`, '_blank');
      toast.success("Opening your email client to send the message.");
    } finally {
      setFormData({ name: '', email: '', subject: '', message: '' });
      setIsSubmitting(false);
    }
  };

  const toggleFAQ = (index) => {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600/10 via-gray-600/10 to-gray-600/10 border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10/10 border border-white/50/20 rounded-none mb-6">
              <MessageSquare className="w-4 h-4 text-white" />
              <span className="text-sm text-gray-300">Contact Us</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Get{' '}
              <span className="bg-gradient-to-r from-blue-400 to-gray-400 bg-clip-text text-transparent">
                in Touch
              </span>
            </h1>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Have a question or need help? We're here for you.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
          >
            <div className="bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-none p-8">
              <h2 className="text-2xl font-bold text-white mb-6">Send us a message</h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Your name"
                    className={`w-full px-4 py-3 bg-gray-800/50 border rounded-none text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200 ${
                      errors.name ? 'border-red-500' : 'border-gray-700 hover:border-gray-600'
                    }`}
                  />
                  {errors.name && (
                    <p className="mt-2 text-sm text-red-400">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="your@email.com"
                    className={`w-full px-4 py-3 bg-gray-800/50 border rounded-none text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200 ${
                      errors.email ? 'border-red-500' : 'border-gray-700 hover:border-gray-600'
                    }`}
                  />
                  {errors.email && (
                    <p className="mt-2 text-sm text-red-400">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Subject
                  </label>
                  <select
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 bg-gray-800/50 border rounded-none text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200 ${
                      errors.subject ? 'border-red-500' : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    {contactReasons.map(reason => (
                      <option key={reason.value} value={reason.value} className="bg-gray-800">
                        {reason.label}
                      </option>
                    ))}
                  </select>
                  {errors.subject && (
                    <p className="mt-2 text-sm text-red-400">{errors.subject}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Message
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Tell us more..."
                    rows={6}
                    className={`w-full px-4 py-3 bg-gray-800/50 border rounded-none text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200 resize-none ${
                      errors.message ? 'border-red-500' : 'border-gray-700 hover:border-gray-600'
                    }`}
                  />
                  {errors.message && (
                    <p className="mt-2 text-sm text-red-400">{errors.message}</p>
                  )}
                </div>

                <motion.button
                  type="submit"
                  disabled={isSubmitting}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-gray-600 text-white rounded-none font-medium hover:from-blue-700 hover:to-gray-700 transition-all duration-200 shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-none animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Send Message
                    </>
                  )}
                </motion.button>
              </form>
            </div>
          </motion.div>

          {/* Contact Info & FAQ */}
          <div className="space-y-8">
            {/* Contact Info Cards */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="space-y-4"
            >
              {contactInfo.map((info, index) => {
                const Icon = info.icon;
                return (
                  <div
                    key={index}
                    className="bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-none p-6 hover:border-white/[0.12] transition-all duration-200 group"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-none ${info.color} bg-current/10`}>
                        <Icon className={`w-6 h-6 ${info.color}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-white mb-1">{info.title}</h3>
                        <p className="text-gray-300 mb-2">{info.value}</p>
                        <p className="text-sm text-gray-500">{info.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </motion.div>

            {/* Quick FAQ */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-none p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <AlertCircle className="w-5 h-5 text-white" />
                <h3 className="text-lg font-semibold text-white">Quick Answers</h3>
              </div>
              
              <div className="space-y-3">
                {quickFAQs.map((faq, index) => (
                  <div key={index} className="border border-gray-800 rounded-none">
                    <button
                      onClick={() => toggleFAQ(index)}
                      className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-800/50 transition-colors duration-200 rounded-none"
                    >
                      <span className="font-medium text-white">{faq.question}</span>
                      {expandedFAQ === index ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                    {expandedFAQ === index && (
                      <div className="px-4 pb-4 text-gray-400 leading-relaxed">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              <Link
                to="/faq"
                className="inline-block mt-4 px-4 py-2 text-sm text-blue-400 hover:text-blue-300 transition-colors duration-200"
              >
                View All FAQs →
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Additional CTAs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          {[
            {
              icon: MessageSquare,
              title: 'Community Discord',
              description: 'Join our Discord community for real-time support and discussions',
              cta: 'Join Discord',
              color: 'text-green-400',
              action: () => window.open('https://discord.gg/sidebuilds', '_blank'),
            },
            {
              icon: Phone,
              title: 'Email Support',
              description: 'Send us a detailed email for complex inquiries or partnership discussions',
              cta: 'Send Email',
              color: 'text-blue-400',
              action: () => window.open('mailto:support@sidebuilds.online?subject=Support%20Request', '_blank'),
            },
            {
              icon: Mail,
              title: 'Stay Updated',
              description: 'Get marketplace updates, new listings, and tips delivered to your inbox',
              cta: 'Subscribe',
              color: 'text-white',
              action: () => window.open('mailto:support@sidebuilds.online?subject=Newsletter%20Subscription&body=Please%20add%20me%20to%20your%20newsletter!', '_blank'),
            },
          ].map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-none p-6 text-center hover:border-white/[0.12] transition-all duration-200 group cursor-pointer"
                onClick={item.action}
              >
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-none mb-4 ${item.color} bg-current/10`}>
                  <Icon className={`w-6 h-6 ${item.color}`} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-gray-300 transition-colors duration-200">
                  {item.title}
                </h3>
                <p className="text-gray-400 text-sm mb-4 leading-relaxed">
                  {item.description}
                </p>
                <button
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors duration-200 underline"
                  onClick={(e) => { e.stopPropagation(); item.action(); }}
                >
                  {item.cta} →
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
