import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  variant = 'center', // 'center' | 'bottom-sheet'
  size = 'md', // 'sm' | 'md' | 'lg' | 'full'
  className = ''
}) => {
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  // Auto-use bottom sheet on mobile for better UX
  const modalVariant = isMobile && variant === 'center' ? 'bottom-sheet' : variant
  
  const getSizeClasses = (size) => {
    const sizeMap = {
      sm: 'w-[90vw] max-w-sm',
      md: 'w-[90vw] max-w-md', 
      lg: 'w-[90vw] max-w-2xl',
      full: 'w-[95vw] max-w-4xl'
    }
    return sizeMap[size] || sizeMap.md
  }
  
  const modalStyles = {
    center: {
      content: cn(
        "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
        getSizeClasses(size),
        "bg-gray-900/95 backdrop-blur-xl border border-gray-700 rounded-none shadow-2xl z-50 p-6",
        className
      ),
      animation: {
        initial: { opacity: 0, y: 30, scale: 0.95 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 30, scale: 0.95 }
      }
    },
    'bottom-sheet': {
      content: cn(
        "fixed inset-x-0 bottom-0 max-h-[85vh] w-full",
        "bg-gray-900/95 backdrop-blur-xl border-t border-gray-700 rounded-t-2xl shadow-2xl z-50",
        className
      ),
      animation: {
        initial: { opacity: 0, y: '100%' },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: '100%' }
      }
    }
  }
  
  const currentStyle = modalStyles[modalVariant]
  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                className={currentStyle.content}
                initial={currentStyle.animation.initial}
                animate={currentStyle.animation.animate}
                exit={currentStyle.animation.exit}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              >
                {/* Bottom sheet handle */}
                {modalVariant === 'bottom-sheet' && (
                  <div className="flex justify-center pt-3 pb-2">
                    <div className="w-12 h-1.5 bg-gray-600 rounded-none" />
                  </div>
                )}
                
                {/* Header */}
                <div className={cn(
                  "flex items-center justify-between mb-4",
                  modalVariant === 'bottom-sheet' ? "px-6 py-4 border-b border-gray-700" : "p-6 pb-4"
                )}>
                  {title && (
                    <Dialog.Title className="text-xl font-bold text-white">
                      {title}
                    </Dialog.Title>
                  )}
                  
                  <Dialog.Close asChild>
                    <button 
                      className={cn(
                        "p-2 text-gray-400 hover:text-white transition-colors rounded-none hover:bg-gray-700/50",
                        modalVariant === 'center' ? "absolute top-4 right-4" : "ml-auto"
                      )}
                      aria-label="Close modal"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </Dialog.Close>
                </div>
                
                {/* Content */}
                <div className={cn(
                  modalVariant === 'bottom-sheet' 
                    ? "px-6 pb-6 overflow-y-auto max-h-[calc(85vh-120px)]" 
                    : "px-6 pb-6"
                )}>
                  {children}
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </AnimatePresence>
  );
};

// Enhanced Modal with mobile bottom sheet support
export const BottomSheetModal = ({ isOpen, onClose, title, children, className }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      variant="bottom-sheet"
      className={className}
    >
      {children}
    </Modal>
  )
}

export default Modal; 
