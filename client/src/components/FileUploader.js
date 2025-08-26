import React, { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  X,
  File,
  Image,
  Video,
  FileText,
  Code,
  Archive,
  AlertCircle,
  CheckCircle,
  Loader2,
  Plus,
  Trash2,
  Eye,
  Download,
  Copy
} from 'lucide-react'
import { cn } from '../lib/utils'
import toast from 'react-hot-toast'

const FileUploader = ({ 
  onFilesChange, 
  acceptedTypes = [], 
  maxFiles = 10, 
  maxSize = 10, // MB
  initialFiles = []
}) => {
  const [files, setFiles] = useState(initialFiles)
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const getFileIcon = (file) => {
    const type = file.type.toLowerCase()
    if (type.startsWith('image/')) return Image
    if (type.startsWith('video/')) return Video
    if (type.includes('pdf')) return FileText
    if (type.includes('text/') || type.includes('json') || type.includes('javascript')) return Code
    if (type.includes('zip') || type.includes('archive')) return Archive
    return File
  }

  const getFileColor = (file) => {
    const type = file.type.toLowerCase()
    if (type.startsWith('image/')) return 'text-green-400 bg-green-400/10'
    if (type.startsWith('video/')) return 'text-blue-400 bg-blue-400/10'
    if (type.includes('pdf')) return 'text-red-400 bg-red-400/10'
    if (type.includes('text/') || type.includes('json') || type.includes('javascript')) return 'text-purple-400 bg-purple-400/10'
    if (type.includes('zip') || type.includes('archive')) return 'text-orange-400 bg-orange-400/10'
    return 'text-gray-400 bg-gray-400/10'
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const validateFile = (file) => {
    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      return `File size must be less than ${maxSize}MB`
    }

    // Check file type if specified
    if (acceptedTypes.length > 0) {
      const fileType = file.type.toLowerCase()
      const fileExtension = file.name.split('.').pop().toLowerCase()
      
      const isAccepted = acceptedTypes.some(type => 
        fileType.includes(type) || fileExtension === type
      )

      if (!isAccepted) {
        return `File type not accepted. Accepted types: ${acceptedTypes.join(', ')}`
      }
    }

    return null
  }

  const handleFiles = useCallback((newFiles) => {
    const fileArray = Array.from(newFiles)
    const validFiles = []
    
    // Check max files limit
    if (files.length + fileArray.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`)
      return
    }

    // Validate each file
    for (const file of fileArray) {
      const error = validateFile(file)
      if (error) {
        toast.error(`${file.name}: ${error}`)
        continue
      }

      // Check for duplicates
      const isDuplicate = files.some(existingFile => 
        existingFile.name === file.name && existingFile.size === file.size
      )

      if (isDuplicate) {
        toast.error(`${file.name} is already added`)
        continue
      }

      validFiles.push({
        file,
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'ready', // ready, uploading, uploaded, error
        progress: 0,
        url: null,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
      })
    }

    if (validFiles.length > 0) {
      const updatedFiles = [...files, ...validFiles]
      setFiles(updatedFiles)
      onFilesChange(updatedFiles)
    }
  }, [files, maxFiles, maxSize, acceptedTypes, onFilesChange])

  const handleDrag = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files)
    }
  }, [handleFiles])

  const handleFileInput = useCallback((e) => {
    if (e.target.files) {
      handleFiles(e.target.files)
    }
  }, [handleFiles])

  const removeFile = (fileId) => {
    const updatedFiles = files.filter(f => f.id !== fileId)
    setFiles(updatedFiles)
    onFilesChange(updatedFiles)
  }

  const simulateUpload = async (fileId) => {
    const fileIndex = files.findIndex(f => f.id === fileId)
    if (fileIndex === -1) return

    const updatedFiles = [...files]
    updatedFiles[fileIndex].status = 'uploading'
    setFiles(updatedFiles)

    // Simulate upload progress
    for (let progress = 0; progress <= 100; progress += 10) {
      await new Promise(resolve => setTimeout(resolve, 100))
      updatedFiles[fileIndex].progress = progress
      setFiles([...updatedFiles])
    }

    updatedFiles[fileIndex].status = 'uploaded'
    updatedFiles[fileIndex].url = `https://example.com/uploads/${updatedFiles[fileIndex].name}`
    setFiles([...updatedFiles])
    onFilesChange([...updatedFiles])
  }

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        className={cn(
          "relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200",
          dragActive
            ? "border-purple-500 bg-purple-500/10"
            : "border-white/20 hover:border-white/40"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.length > 0 ? acceptedTypes.map(t => `.${t}`).join(',') : undefined}
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        <div className="space-y-4">
          <div className={cn(
            "w-16 h-16 mx-auto rounded-full flex items-center justify-center transition-colors duration-200",
            dragActive ? "bg-purple-500/20" : "bg-gray-800"
          )}>
            <Upload className={cn(
              "w-8 h-8 transition-colors duration-200",
              dragActive ? "text-purple-400" : "text-gray-400"
            )} />
          </div>

          <div>
            <h3 className="text-lg font-medium text-white mb-2">
              Drop files here or click to browse
            </h3>
            <p className="text-gray-400 text-sm">
              {acceptedTypes.length > 0 
                ? `Accepted types: ${acceptedTypes.join(', ')}`
                : 'All file types accepted'
              }
            </p>
            <p className="text-gray-500 text-xs mt-1">
              Maximum {maxFiles} files, {maxSize}MB each
            </p>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200"
          >
            Select Files
          </button>
        </div>
      </div>

      {/* Files List */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-medium text-white">
              Files ({files.length}/{maxFiles})
            </h4>
            {files.length > 0 && (
              <button
                onClick={() => {
                  setFiles([])
                  onFilesChange([])
                }}
                className="text-sm text-red-400 hover:text-red-300 transition-colors duration-200"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="grid gap-3">
            <AnimatePresence>
              {files.map((file) => {
                const Icon = getFileIcon(file)
                const colorClasses = getFileColor(file)

                return (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="flex items-center gap-4 p-4 bg-gray-900/50 border border-white/10 rounded-xl hover:border-white/20 transition-colors duration-200"
                  >
                    {/* File Preview/Icon */}
                    <div className="flex-shrink-0">
                      {file.preview ? (
                        <img
                          src={file.preview}
                          alt={file.name}
                          className="w-12 h-12 object-cover rounded-lg"
                        />
                      ) : (
                        <div className={cn("p-2 rounded-lg", colorClasses)}>
                          <Icon className="w-8 h-8" />
                        </div>
                      )}
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{file.name}</p>
                      <p className="text-gray-400 text-sm">{formatFileSize(file.size)}</p>
                      
                      {/* Upload Progress */}
                      {file.status === 'uploading' && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                            <span>Uploading...</span>
                            <span>{file.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-800 rounded-full h-1.5">
                            <div 
                              className="bg-purple-600 h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${file.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Status & Actions */}
                    <div className="flex items-center gap-2">
                      {file.status === 'ready' && (
                        <button
                          onClick={() => simulateUpload(file.id)}
                          className="p-2 text-gray-400 hover:text-white transition-colors duration-200"
                          title="Upload"
                        >
                          <Upload className="w-4 h-4" />
                        </button>
                      )}

                      {file.status === 'uploading' && (
                        <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                      )}

                      {file.status === 'uploaded' && (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <button
                            onClick={() => window.open(file.url, '_blank')}
                            className="p-2 text-gray-400 hover:text-white transition-colors duration-200"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </>
                      )}

                      {file.status === 'error' && (
                        <AlertCircle className="w-4 h-4 text-red-400" />
                      )}

                      <button
                        onClick={() => removeFile(file.id)}
                        className="p-2 text-gray-400 hover:text-red-400 transition-colors duration-200"
                        title="Remove"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Upload All Button */}
      {files.some(f => f.status === 'ready') && (
        <div className="flex justify-end">
          <button
            onClick={() => {
              files.forEach(file => {
                if (file.status === 'ready') {
                  simulateUpload(file.id)
                }
              })
            }}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200"
          >
            Upload All Files
          </button>
        </div>
      )}
    </div>
  )
}

export default FileUploader