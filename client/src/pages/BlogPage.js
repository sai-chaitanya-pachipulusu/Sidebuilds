import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Search, 
  Calendar, 
  Clock, 
  User,
  ArrowRight,
  TrendingUp,
  Code,
  DollarSign,
  Users,
  BookOpen,
  Mail
} from 'lucide-react';
import SEO from '../components/SEO';

const BlogPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { value: 'all', label: 'All Posts', color: 'gray', icon: BookOpen },
    { value: 'guides', label: 'Guides', color: 'blue', icon: BookOpen },
    { value: 'success-stories', label: 'Success Stories', color: 'green', icon: TrendingUp },
    { value: 'updates', label: 'Platform Updates', color: 'purple', icon: Code },
    { value: 'trends', label: 'Market Trends', color: 'orange', icon: DollarSign },
    { value: 'tips', label: 'Tips & Tricks', color: 'pink', icon: Users },
  ];

  const featuredPost = {
    id: 1,
    title: 'The Ultimate Guide to Valuing Your Side Project',
    excerpt: 'Learn how to accurately price your side project based on revenue, traffic, tech stack, and growth potential. Includes real examples and a valuation calculator.',
    category: 'guides',
    author: 'Sarah Johnson',
    date: '2025-05-28',
    readTime: '8 min read',
    image: '/api/placeholder/800/400',
    tags: ['valuation', 'selling', 'pricing'],
  };

  const blogPosts = [
    {
      id: 2,
      title: 'From $0 to $10K MRR: How TaskFlow Found Its Perfect Owner',
      excerpt: 'The inspiring story of how a productivity app built as a weekend project grew to $10K MRR and found its ideal buyer on SideBuilds.',
      category: 'success-stories',
      author: 'Michael Park',
      date: '2025-05-25',
      readTime: '5 min read',
      image: '/api/placeholder/400/300',
      tags: ['success', 'saas', 'acquisition'],
    },
    {
      id: 3,
      title: 'New Feature: AI-Powered Project Recommendations',
      excerpt: 'We\'re excited to announce our new AI recommendation engine that helps buyers find projects that match their skills and interests.',
      category: 'updates',
      author: 'Alex Chen',
      date: '2025-05-20',
      readTime: '3 min read',
      image: '/api/placeholder/400/300',
      tags: ['features', 'ai', 'updates'],
    },
    {
      id: 4,
      title: '2025 Side Project Market Report',
      excerpt: 'Comprehensive analysis of the side project market: trending tech stacks, average valuations, and buyer preferences.',
      category: 'trends',
      author: 'Emily Davis',
      date: '2025-05-15',
      readTime: '10 min read',
      image: '/api/placeholder/400/300',
      tags: ['market', 'trends', 'analysis'],
    },
    {
      id: 5,
      title: '10 Red Flags to Watch When Buying a Side Project',
      excerpt: 'Protect yourself from bad deals by learning to spot these common warning signs when evaluating projects.',
      category: 'tips',
      author: 'John Smith',
      date: '2025-05-10',
      readTime: '6 min read',
      image: '/api/placeholder/400/300',
      tags: ['buying', 'due-diligence', 'tips'],
    },
    {
      id: 6,
      title: 'Building in Public: Why Transparency Sells',
      excerpt: 'How sharing your project\'s journey can increase its value and attract the right buyers.',
      category: 'guides',
      author: 'Lisa Wang',
      date: '2025-05-05',
      readTime: '7 min read',
      image: '/api/placeholder/400/300',
      tags: ['building', 'marketing', 'transparency'],
    },
  ];

  const filteredPosts = blogPosts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryColor = (category) => {
    const colors = {
      'guides': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      'success-stories': 'bg-green-500/10 text-green-400 border-green-500/20',
      'updates': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      'trends': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      'tips': 'bg-pink-500/10 text-pink-400 border-pink-500/20',
    };
    return colors[category] || 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  };

  return (
    <>
      <SEO 
        title="Blog | SideBuilds" 
        description="Learn from successful makers, get platform updates, and discover market trends in the side project marketplace." 
      />
      
      <div className="min-h-screen bg-black">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-purple-600/10 via-blue-600/10 to-pink-600/10 border-b border-white/[0.08]">
          <div className="max-w-7xl mx-auto px-4 py-20 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-12"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full mb-6">
                <BookOpen className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-purple-300">Blog</span>
              </div>
              
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
                Insights &{' '}
                <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  Stories
                </span>
              </h1>
              <p className="text-xl text-gray-400 max-w-3xl mx-auto">
                Learn from successful makers, get platform updates, and discover market trends
              </p>
            </motion.div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="space-y-16">
            {/* Search and Filter */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col md:flex-row gap-4"
            >
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-800 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors duration-200"
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-3 bg-gray-900/50 border border-gray-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors duration-200"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value} className="bg-gray-900">
                    {cat.label}
                  </option>
                ))}
              </select>
            </motion.div>

            {/* Category Tags */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-wrap gap-3 justify-center"
            >
              {categories.slice(1).map((cat, index) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.value}
                    onClick={() => setSelectedCategory(cat.value)}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 border ${
                      selectedCategory === cat.value 
                        ? getCategoryColor(cat.value) 
                        : 'bg-gray-900/50 text-gray-400 border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {cat.label}
                  </button>
                );
              })}
            </motion.div>

            {/* Featured Post */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Link
                to={`/blog/${featuredPost.id}`}
                className="block bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-2xl overflow-hidden hover:border-white/[0.12] hover:scale-[1.02] transition-all duration-300 group"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2">
                  <div className="aspect-video lg:aspect-square bg-gradient-to-br from-purple-600/20 to-blue-600/20 flex items-center justify-center">
                    <div className="text-center">
                      <BookOpen className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                      <p className="text-gray-400">Featured Article</p>
                    </div>
                  </div>
                  <div className="p-8 flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="px-3 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full text-sm font-medium">
                        Featured
                      </span>
                      <span className={`px-3 py-1 border rounded-full text-sm font-medium ${getCategoryColor(featuredPost.category)}`}>
                        Guides
                      </span>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-4 group-hover:text-purple-300 transition-colors duration-200">
                      {featuredPost.title}
                    </h2>
                    <p className="text-gray-400 leading-relaxed mb-6 line-clamp-3">
                      {featuredPost.excerpt}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-6">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>{featuredPost.author}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(featuredPost.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{featuredPost.readTime}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-purple-400 group-hover:text-purple-300 transition-colors duration-200">
                      <span className="font-medium">Read More</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>

            {/* Blog Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredPosts.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                >
                  <Link
                    to={`/blog/${post.id}`}
                    className="block bg-gray-900/50 backdrop-blur-sm border border-white/[0.08] rounded-2xl overflow-hidden hover:border-white/[0.12] hover:scale-105 transition-all duration-200 group h-full"
                  >
                    <div className="aspect-video bg-gradient-to-br from-gray-700 to-gray-800 relative">
                      <div className="absolute top-4 left-4">
                        <span className={`px-3 py-1 border rounded-full text-sm font-medium ${getCategoryColor(post.category)}`}>
                          {categories.find(c => c.value === post.category)?.label}
                        </span>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-blue-600/10" />
                    </div>
                    <div className="p-6 flex flex-col flex-1">
                      <h3 className="text-lg font-semibold text-white mb-3 line-clamp-2 group-hover:text-purple-300 transition-colors duration-200">
                        {post.title}
                      </h3>
                      <p className="text-gray-400 text-sm leading-relaxed mb-4 line-clamp-3 flex-1">
                        {post.excerpt}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-4">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>{post.author}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{post.readTime}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {post.tags.slice(0, 3).map(tag => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-gray-800/50 text-gray-400 text-xs rounded-lg border border-gray-700"
                          >
                            {tag}
                          </span>
                        ))}
                        {post.tags.length > 3 && (
                          <span className="px-2 py-1 bg-gray-800/50 text-gray-500 text-xs rounded-lg border border-gray-700">
                            +{post.tags.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>

            {filteredPosts.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <Search className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">
                  No articles found matching your search.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                  }}
                  className="mt-4 text-purple-400 hover:text-purple-300 transition-colors duration-200"
                >
                  Clear filters
                </button>
              </motion.div>
            )}

            {/* Newsletter CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-gradient-to-r from-purple-600/20 via-blue-600/20 to-pink-600/20 border border-white/[0.08] rounded-2xl p-12 text-center"
            >
              <Mail className="w-16 h-16 text-purple-400 mx-auto mb-6" />
              <h2 className="text-3xl font-bold text-white mb-4">
                Stay Updated
              </h2>
              <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-8">
                Get the latest insights, success stories, and platform updates delivered to your inbox.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors duration-200"
                />
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-lg shadow-purple-500/25"
                >
                  Subscribe
                </motion.button>
              </div>
              <p className="text-sm text-gray-500 mt-4">
                Join 5,000+ makers and entrepreneurs. No spam, unsubscribe anytime.
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BlogPage; 