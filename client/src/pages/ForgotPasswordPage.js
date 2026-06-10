import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail, Send, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { requestPasswordReset } from '../services/api';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      const response = await requestPasswordReset(email);
      setIsSubmitted(true);
      toast.success(response.message || 'If the account exists, a reset link has been sent.');
    } catch (error) {
      const message =
        error.status === 429
          ? `Too many reset attempts. Please try again later${error.retryAfter ? ` (${error.retryAfter})` : ''}.`
          : error.code === 'EMAIL_NOT_CONFIGURED' || error.code === 'EMAIL_SEND_FAILED'
            ? error.message ||
              'Password reset emails are unavailable. Check that the hosting provider has SMTP configured.'
            : error.message || 'Unable to send reset link. Please try again.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <Link to="/" className="inline-flex items-center gap-2 mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold">SideBuilds</span>
        </Link>

        <div className="bg-gray-950/80 border border-gray-800 rounded-2xl p-8 shadow-2xl">
          <Link to="/login" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6">
            <ArrowLeft className="w-4 h-4" />
            Back to login
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-3">Reset your password</h1>
            <p className="text-gray-400">
              Enter your account email and we will send you a secure link to set a new password.
            </p>
          </div>

          {isSubmitted ? (
            <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-5">
              <h2 className="font-semibold text-green-300 mb-2">Check your email</h2>
              <p className="text-sm text-gray-300">
                If an account exists for <span className="font-medium">{email}</span>, a reset link has been sent.
                The link expires in 60 minutes.
              </p>
              <button
                type="button"
                onClick={() => setIsSubmitted(false)}
                className="mt-4 text-sm text-green-200 hover:text-white underline"
              >
                Try a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-800 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={isLoading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg font-medium flex items-center justify-center gap-2 hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Sending link...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Send reset link</span>
                  </>
                )}
              </motion.button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPasswordPage;
