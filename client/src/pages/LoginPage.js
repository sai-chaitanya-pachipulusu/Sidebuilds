import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Mail, 
  Lock, 
  ArrowRight, 
  Github, 
  Chrome,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
    const navigate = useNavigate();
  const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
    setIsLoading(true);

    try {
      // Call the actual login API
      const { loginUser } = await import('../services/api');
      const response = await loginUser({ email, password });
      
      // Login successful - update auth context
      login(response.token, response.user);
      
      toast.success('Welcome back!', {
        icon: '🎉',
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
        },
      });
      
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error.message || 'Invalid credentials';
      toast.error(errorMessage);
        } finally {
      setIsLoading(false);
    }
  };

  const socialProviders = [
    { name: 'Google', icon: <Chrome className="w-5 h-5" />, color: 'hover:bg-blue-600' },
    { name: 'GitHub', icon: <Github className="w-5 h-5" />, color: 'hover:bg-gray-700' }
  ];

    return (
    <div className="min-h-screen flex">
      {/* Left Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <Link to="/" className="inline-flex items-center gap-2 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold">SideBuilds</span>
          </Link>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Welcome back</h1>
            <p className="text-gray-400">
              Don't have an account?{' '}
              <Link to="/register" className="text-blue-400 hover:text-blue-300 transition-colors">
                Sign up for free
              </Link>
            </p>
          </div>

          {/* Social Login */}
          <div className="space-y-3 mb-8">
            {socialProviders.map((provider) => (
              <motion.button
                key={provider.name}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full p-3 bg-gray-800 rounded-lg flex items-center justify-center gap-3 transition-colors ${provider.color}`}
              >
                {provider.icon}
                <span>Continue with {provider.name}</span>
              </motion.button>
            ))}
          </div>

          {/* Divider */}
          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-800"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-black text-gray-400">Or continue with email</span>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input */}
            <div>
              <label className="block text-sm font-medium mb-2">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-800 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                            placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium">Password</label>
                <Link to="/forgot-password" className="text-sm text-blue-400 hover:text-blue-300">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                                                type={showPassword ? 'text' : 'password'}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-gray-900 border border-gray-800 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                                placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 bg-gray-900 border-gray-800 rounded focus:ring-blue-500"
              />
              <label htmlFor="remember" className="ml-2 text-sm text-gray-400">
                Keep me logged in
              </label>
            </div>

            {/* Submit Button */}
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
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign in</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </motion.button>
                            </form>

          {/* Terms */}
          <p className="mt-8 text-xs text-gray-400 text-center">
            By continuing, you agree to our{' '}
            <Link to="/terms" className="text-blue-400 hover:text-blue-300">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/privacy" className="text-blue-400 hover:text-blue-300">
              Privacy Policy
                                </Link>
          </p>
        </motion.div>
      </div>

      {/* Right Panel - Feature Showcase */}
      <div className="hidden lg:flex flex-1 relative bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20 p-12 items-center justify-center">
        <div className="absolute inset-0 bg-black/50" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="relative z-10 max-w-lg"
        >
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 mb-6">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-sm">Trusted by 10,000+ entrepreneurs</span>
            </div>
            
            <h2 className="text-4xl font-bold mb-4">
              Start selling your projects in minutes
            </h2>
            <p className="text-xl text-gray-300">
              Join the fastest growing marketplace for buying and selling profitable side projects.
            </p>
          </div>

          {/* Feature List */}
          <div className="space-y-4">
            {[
              'Secure payment processing with Stripe',
              'Automated project transfer workflow',
              'Real-time buyer-seller messaging',
              'Comprehensive analytics dashboard',
              'Money-back guarantee for buyers'
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className="w-6 h-6 rounded-full bg-green-400/20 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                </div>
                <span className="text-gray-200">{feature}</span>
              </motion.div>
            ))}
          </div>

          {/* Testimonial */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-12 p-6 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20"
          >
            <p className="text-lg mb-4">
              "SideBuilds helped me sell my SaaS project for $15k in just 2 weeks. The process was seamless!"
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full" />
              <div>
                <p className="font-medium">Sarah Chen</p>
                <p className="text-sm text-gray-400">Sold TaskFlow Pro</p>
              </div>
            </div>
          </motion.div>
                </motion.div>
      </div>
    </div>
    );
};

export default LoginPage; 