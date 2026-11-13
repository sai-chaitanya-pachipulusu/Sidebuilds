import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, TrendingUp, Zap, Globe, Target } from 'lucide-react';
import SEO from '../components/SEO';
import { Input } from '../shadcn/ui/input';
import { Button } from '../shadcn/ui/button';
import { Card, CardContent } from '../shadcn/ui/card';
import toast from 'react-hot-toast';

const VibeCodePage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');

  const handleGenerate = () => {
    setIsGenerating(true);
    toast.loading('Generating your Vibe Code...');
    
    setTimeout(() => {
      const code = `VIBE-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      setGeneratedCode(code);
      setIsGenerating(false);
      toast.dismiss();
      toast.success('Vibe Code Generated!');
    }, 2000);
  };

  const features = [
      { icon: TrendingUp, title: "Market Trends", description: "Analyze current market demand for project ideas." },
      { icon: Target, title: "Niche Targeting", description: "Identify profitable niches with low competition." },
      { icon: Zap, title: "Feature Prioritization", description: "Suggest key features for a successful MVP." },
      { icon: Globe, title: "Global Viability", description: "Assess the potential for international adoption." }
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <SEO 
        title="Vibe Code Generator"
        description="Generate a unique Vibe Code for your project idea to analyze its potential and market fit."
      />
      <div className="container mx-auto px-4 py-24">
          <div className="text-center max-w-3xl mx-auto mb-16">
              <h1 className="text-5xl font-bold mb-4     text-neutral-100">Find Your Next Big Idea</h1>
              <p className="text-xl text-gray-300">Enter a keyword or industry to generate a unique "Vibe Code" and discover its market potential.</p>
          </div>

          <div className="max-w-xl mx-auto mb-12">
              <div className="flex gap-2">
                  <Input 
                      type="text" 
                      placeholder="e.g., 'AI-powered note taking' or 'sustainable fashion'" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-grow"
                  />
                  <Button onClick={handleGenerate} disabled={isGenerating || !searchQuery}>
                      {isGenerating ? 'Generating...' : <><Search className="mr-2 h-4 w-4"/>Generate</>}
                  </Button>
              </div>
          </div>

          {generatedCode && (
              <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center mb-16"
              >
                  <p className="text-gray-400 mb-2">Your Generated Vibe Code:</p>
                  <p className="text-4xl font-mono bg-gray-800 inline-block px-6 py-3 rounded-none border border-gray-700">{generatedCode}</p>
              </motion.div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, idx) => (
                  <Card key={idx} className="bg-gray-900/50 border-gray-700 text-center">
                      <CardContent className="p-6">
                          <feature.icon className="w-10 h-10 mx-auto mb-4 text-blue-400" />
                          <h3 className="font-semibold mb-2">{feature.title}</h3>
                          <p className="text-sm text-gray-400">{feature.description}</p>
                      </CardContent>
                  </Card>
              ))}
          </div>
      </div>
    </div>
  );
};

export default VibeCodePage;
