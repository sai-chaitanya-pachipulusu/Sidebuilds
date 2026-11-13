import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  ZoomIn, 
  Download,
  Share2,
  PlayCircle,
  Image as ImageIcon,
  Monitor,
  Smartphone,
  ExternalLink
} from 'lucide-react'
import { cn } from '../lib/utils'
import { openExternalUrl } from '../utils/security'
import toast from 'react-hot-toast'

const ProjectGallery = ({ images = [], videos = [], project }) => {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const [viewMode, setViewMode] = useState('desktop') // desktop, mobile, tablet

  // Combine images and videos into a single gallery
  const galleryItems = [
    ...images.map(img => ({ type: 'image', url: img, title: `${project?.name} Screenshot` })),
    ...videos.map(video => ({ type: 'video', url: video, title: `${project?.name} Demo` }))
  ]

  const openLightbox = (index) => {
    setSelectedIndex(index)
    setIsLightboxOpen(true)
  }

  const closeLightbox = () => {
    setIsLightboxOpen(false)
  }

  const navigateGallery = (direction) => {
    if (direction === 'next') {
      setSelectedIndex((prev) => (prev + 1) % galleryItems.length)
    } else {
      setSelectedIndex((prev) => (prev - 1 + galleryItems.length) % galleryItems.length)
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: project?.name,
          text: `Check out ${project?.name}`,
          url: window.location.href
        })
      } catch (err) {
        // Fallback to clipboard
        navigator.clipboard.writeText(window.location.href)
        toast.success('Link copied to clipboard!')
      }
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast.success('Link copied to clipboard!')
    }
  }

  if (galleryItems.length === 0) {
    return (
      <div className="bg-gray-900/30 border border-white/10 rounded-none p-12 text-center">
        <ImageIcon className="w-16 h-16 mx-auto mb-4 text-gray-600" />
        <h3 className="text-lg font-medium text-gray-400 mb-2">No media available</h3>
        <p className="text-gray-500">Screenshots and demos will appear here when uploaded.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Main Gallery */}
      <div className="relative group">
        <div className="relative aspect-video bg-gray-900/50 border border-white/10 rounded-none overflow-hidden">
          {galleryItems[selectedIndex]?.type === 'image' ? (
            <img
              src={galleryItems[selectedIndex].url}
              alt={galleryItems[selectedIndex].title}
              className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
              onClick={() => openLightbox(selectedIndex)}
            />
          ) : (
            <div className="relative w-full h-full">
              <video
                src={galleryItems[selectedIndex].url}
                className="w-full h-full object-cover"
                controls
                poster={images[0]} // Use first image as poster if available
              />
            </div>
          )}

          {/* Gallery Controls */}
          <div className="absolute inset-0 flex items-center justify-between p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {galleryItems.length > 1 && (
              <>
                <button
                  onClick={() => navigateGallery('prev')}
                  className="p-2 bg-black/50 backdrop-blur-sm rounded-none text-white hover:bg-black/70 transition-colors duration-200"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={() => navigateGallery('next')}
                  className="p-2 bg-black/50 backdrop-blur-sm rounded-none text-white hover:bg-black/70 transition-colors duration-200"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          {/* Top Controls */}
          <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button
              onClick={() => openLightbox(selectedIndex)}
              className="p-2 bg-black/50 backdrop-blur-sm rounded-none text-white hover:bg-black/70 transition-colors duration-200"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleShare}
              className="p-2 bg-black/50 backdrop-blur-sm rounded-none text-white hover:bg-black/70 transition-colors duration-200"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>

          {/* Media Type Indicator */}
          <div className="absolute bottom-4 left-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-black/50 backdrop-blur-sm rounded-none text-white text-xs">
              {galleryItems[selectedIndex]?.type === 'video' ? (
                <>
                  <PlayCircle className="w-3 h-3" />
                  <span>Video Demo</span>
                </>
              ) : (
                <>
                  <ImageIcon className="w-3 h-3" />
                  <span>Screenshot</span>
                </>
              )}
            </div>
          </div>

          {/* Gallery Counter */}
          {galleryItems.length > 1 && (
            <div className="absolute bottom-4 right-4">
              <div className="px-3 py-1 bg-black/50 backdrop-blur-sm rounded-none text-white text-xs">
                {selectedIndex + 1} of {galleryItems.length}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Thumbnail Strip */}
      {galleryItems.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {galleryItems.map((item, index) => (
            <button
              key={index}
              onClick={() => setSelectedIndex(index)}
              className={cn(
                "relative flex-shrink-0 w-20 h-12 overflow-hidden border-2 transition-all duration-200",
                index === selectedIndex
                  ? "border-white scale-105"
                  : "border-white/20 hover:border-white/40"
              )}
            >
              {item.type === 'image' ? (
                <img
                  src={item.url}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                  <PlayCircle className="w-4 h-4 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Device Preview Toggle */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400">View as:</span>
        <div className="flex items-center gap-1 p-1 bg-gray-900/50 rounded-none">
          {[
            { id: 'desktop', icon: Monitor, name: 'Desktop' },
            { id: 'tablet', icon: Monitor, name: 'Tablet' },
            { id: 'mobile', icon: Smartphone, name: 'Mobile' }
          ].map((device) => {
            const Icon = device.icon
            return (
              <button
                key={device.id}
                onClick={() => setViewMode(device.id)}
                className={cn(
                  "p-2 transition-colors duration-200",
                  viewMode === device.id
                    ? "bg-white text-black"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
                title={device.name}
              >
                <Icon className="w-4 h-4" />
              </button>
            )
          })}
        </div>
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {isLightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={closeLightbox}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-7xl max-h-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={closeLightbox}
                className="absolute -top-12 right-0 p-2 text-white hover:text-gray-300 transition-colors duration-200"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Navigation */}
              {galleryItems.length > 1 && (
                <>
                  <button
                    onClick={() => navigateGallery('prev')}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 backdrop-blur-sm rounded-none text-white hover:bg-black/70 transition-colors duration-200 z-10"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={() => navigateGallery('next')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 backdrop-blur-sm rounded-none text-white hover:bg-black/70 transition-colors duration-200 z-10"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}

              {/* Media Content */}
              <div className="relative max-h-[90vh] max-w-[90vw]">
                {galleryItems[selectedIndex]?.type === 'image' ? (
                  <img
                    src={galleryItems[selectedIndex].url}
                    alt={galleryItems[selectedIndex].title}
                    className="max-h-full max-w-full object-contain rounded-none"
                  />
                ) : (
                  <video
                    src={galleryItems[selectedIndex].url}
                    className="max-h-full max-w-full object-contain rounded-none"
                    controls
                    autoPlay
                  />
                )}

                {/* Info Bar */}
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex items-center justify-between p-3 bg-black/70 backdrop-blur-sm rounded-none text-white">
                    <div>
                      <h3 className="font-medium">{galleryItems[selectedIndex]?.title}</h3>
                      <p className="text-sm text-gray-300">{selectedIndex + 1} of {galleryItems.length}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={handleShare}
                        className="p-2 hover:bg-white/10 rounded-none transition-colors duration-200"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => openExternalUrl(galleryItems[selectedIndex].url)}
                        className="p-2 hover:bg-white/10 rounded-none transition-colors duration-200"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default ProjectGallery
