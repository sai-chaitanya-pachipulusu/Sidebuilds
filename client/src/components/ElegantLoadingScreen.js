import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ElegantLoadingScreen = ({ isVisible = true, onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState(0);

  const stages = [
    { text: "Initializing", duration: 800 },
    { text: "Loading assets", duration: 600 },
    { text: "Preparing interface", duration: 700 },
    { text: "Almost ready", duration: 500 }
  ];

  useEffect(() => {
    if (!isVisible) return;

    let currentStage = 0;
    let currentProgress = 0;
    let timeoutId;

    const updateProgress = () => {
      const stageProgress = 100 / stages.length;
      const targetProgress = (currentStage + 1) * stageProgress;
      
      if (currentProgress < targetProgress) {
        currentProgress += Math.random() * 3 + 1;
        setProgress(Math.min(currentProgress, targetProgress));
        
        timeoutId = setTimeout(updateProgress, 50);
      } else if (currentStage < stages.length - 1) {
        timeoutId = setTimeout(() => {
          currentStage++;
          setStage(currentStage);
          updateProgress();
        }, stages[currentStage].duration);
      } else {
        timeoutId = setTimeout(() => {
          setProgress(100);
          setTimeout(() => {
            onComplete?.();
          }, 300);
        }, 200);
      }
    };

    updateProgress();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
      >
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, #6366f11a 0%, transparent 50%), 
                             radial-gradient(circle at 75% 75%, #8b5cf61a 0%, transparent 50%)`,
          }} />
        </div>

        <div className="relative flex flex-col items-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mb-8"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-2xl">
              <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-center mb-12"
          >
            <h1 className="text-2xl font-bold text-white mb-2">SideBuilds</h1>
            <p className="text-gray-400 text-sm">Premium Project Marketplace</p>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="w-80 space-y-6"
          >
            <div className="relative">
              <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                />
              </div>
              
              <div className="flex justify-between items-center mt-3">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={stage}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="text-sm text-gray-300"
                  >
                    {stages[stage]?.text}
                  </motion.span>
                </AnimatePresence>
                <span className="text-sm text-gray-400 font-mono">
                  {Math.round(progress)}%
                </span>
              </div>
            </div>

            <div className="flex justify-center space-x-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 bg-gray-600 rounded-full"
                  animate={{
                    scale: [1, 1.2, 1],
                    backgroundColor: ["#4b5563", "#8b5cf6", "#4b5563"],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: "easeInOut"
                  }}
                />
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ElegantLoadingScreen; 