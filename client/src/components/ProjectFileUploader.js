import React, { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  X,
  File,
  Image,
  FileText,
  Code,
  Archive,
  AlertCircle,
  CheckCircle,
  Loader2,
  Trash2,
  Eye,
  Download,
  RefreshCw,
  FolderOpen
} from 'lucide-react'
import { cn } from '../lib/utils'
import toast from 'react-hot-toast'
import { uploadProjectFiles, deleteProjectFile, getProjectFiles } from '../services/api'
import { Button } from '../shadcn/ui/button'
import { Checkbox } from '../shadcn/ui/checkbox'
import { Label } from '../shadcn/ui/label'

const ProjectFileUploader = ({ 
  projectId,
  onFilesUploaded,
  acceptedTypes = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'zip', 'txt', 'md', 'json'], 
  maxFiles = 10, 
  maxSize = 50, // MB
  showExistingFiles = false,
  allowFileDeletion = true
}) => {
  const [files, setFiles] = useState([])
  const [existingFiles, setExistingFiles] = useState([])
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({})
  const [isPublic, setIsPublic] = useState(false)
  const [loadingExisting, setLoadingExisting] = useState(false)
  const fileInputRef = useRef(null)

  // Load existing files if projectId is provided and showExistingFiles is true
  useEffect(() => {
    if (projectId && showExistingFiles) {
      loadExistingFiles()
    }
  }, [projectId, showExistingFiles])

  const loadExistingFiles = async () => {
    try {
      setLoadingExisting(true)
      const response = await getProjectFiles(projectId)
      if (response.success) {
        setExistingFiles(response.files || [])
      }
    } catch (error) {
      console.error('Failed to load existing files:', error)
    } finally {
      setLoadingExisting(false)
    }
  }

  const getFileIcon = (file) => {
    const type = (file.type || file.file_type || '').toLowerCase()
    if (type.startsWith('image/')) return Image
    if (type.includes('pdf')) return FileText
    if (type.includes('text/') || type.includes('json') || type.includes('javascript') || type.includes('code')) return Code
    if (type.includes('zip') || type.includes('archive')) return Archive
    return File
  }

  const getFileColor = (file) => {
    const type = (file.type || file.file_type || '').toLowerCase()
    if (type.startsWith('image/')) return 'text-green-400 bg-green-400/10 border-green-400/20'
    if (type.includes('pdf')) return 'text-red-400 bg-red-400/10 border-red-400/20'
    if (type.includes('text/') || type.includes('json') || type.includes('javascript') || type.includes('code')) return 'text-white bg-gray-400/10 border-white/40/20'
    if (type.includes('zip') || type.includes('archive')) return 'text-orange-400 bg-orange-400/10 border-orange-400/20'
    return 'text-gray-400 bg-gray-400/10 border-gray-400/20'
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

    // Check file type
    const fileExtension = file.name.split('.').pop().toLowerCase()
    const isAccepted = acceptedTypes.some(type => 
      file.type?.toLowerCase().includes(type) || fileExtension === type
    )

    if (!isAccepted) {
      return `File type not accepted. Accepted: ${acceptedTypes.join(', ')}`
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
        error: null,
        preview: file.type?.startsWith('image/') ? URL.createObjectURL(file) : null
      })
    }

    if (validFiles.length > 0) {
      const updatedFiles = [...files, ...validFiles]
      setFiles(updatedFiles)
    }
  }, [files, maxFiles, maxSize, acceptedTypes])

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
  }

  const removeExistingFile = async (fileId) => {
    if (!allowFileDeletion || !projectId) return
    
    try {
      await deleteProjectFile(projectId, fileId)
      setExistingFiles(prev => prev.filter(f => f.file_id !== fileId))
      toast.success('File deleted successfully')
    } catch (error) {
      toast.error(error.message || 'Failed to delete file')
    }
  }

  const uploadFiles = async () => {
    if (files.length === 0) {
      toast.error('No files to upload')
      return
    }

    const readyFiles = files.filter(f => f.status === 'ready')
    if (readyFiles.length === 0) {
      toast.error('No new files to upload')
      return
    }

    setUploading(true)
    const updatedFiles = [...files]

    try {
      // Upload all ready files
      const filesToUpload = readyFiles.map(f => f.file)
      
      const onProgress = (progressEvent) => {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        // Update progress for all uploading files
        readyFiles.forEach(file => {
          const index = updatedFiles.findIndex(f => f.id === file.id)
          if (index !== -1) {
            updatedFiles[index].progress = progress
          }
        })
        setFiles([...updatedFiles])
      }

      const response = await uploadProjectFiles(projectId || 'temp', filesToUpload, {
        is_public: isPublic,
        onProgress
      })

      if (response.success) {
        // Mark files as uploaded
        readyFiles.forEach(file => {
          const index = updatedFiles.findIndex(f => f.id === file.id)
          if (index !== -1) {
            updatedFiles[index].status = 'uploaded'
            updatedFiles[index].progress = 100
            // Find the corresponding server file
            const serverFile = response.files.find(f => f.original_name === file.name)
            if (serverFile) {
              updatedFiles[index].serverData = serverFile
            }
          }
        })
        
        setFiles([...updatedFiles])
        toast.success(`${response.files.length} file(s) uploaded successfully`)
        
        if (onFilesUploaded) {
          onFilesUploaded(response.files)
        }

        // Reload existing files if showing them
        if (showExistingFiles) {
          loadExistingFiles()
        }
      }
    } catch (error) {
      console.error('Upload error:', error)
      
      // Mark files as error
      readyFiles.forEach(file => {
        const index = updatedFiles.findIndex(f => f.id === file.id)
        if (index !== -1) {
          updatedFiles[index].status = 'error'
          updatedFiles[index].error = error.message || 'Upload failed'
        }
      })
      setFiles([...updatedFiles])
      
      toast.error(error.message || 'Failed to upload files')
    } finally {
      setUploading(false)
    }
  }

  const retryUpload = async (fileId) => {
    const fileIndex = files.findIndex(f => f.id === fileId)
    if (fileIndex === -1) return

    const updatedFiles = [...files]
    updatedFiles[fileIndex].status = 'ready'
    updatedFiles[fileIndex].error = null
    updatedFiles[fileIndex].progress = 0
    setFiles(updatedFiles)
  }

  const clearAllFiles = () => {
    setFiles([])
    toast.success('All files cleared')
  }

  const downloadFile = (url, filename) => {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        className={cn(
          "relative border-2 border-dashed rounded-none p-8 text-center transition-all duration-200",
          dragActive
            ? "border-white bg-white/10"
            : "border-gray-600 hover:border-gray-500 bg-gray-900/30"
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
          accept={acceptedTypes.map(t => `.${t}`).join(',')}
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={uploading}
        />

        <div className="space-y-4">
          <div className={cn(
            "w-16 h-16 mx-auto rounded-none flex items-center justify-center transition-colors duration-200",
            dragActive ? "bg-white/20" : "bg-gray-800"
          )}>
            <Upload className={cn(
              "w-8 h-8 transition-colors duration-200",
              dragActive ? "text-white" : "text-gray-400"
            )} />
          </div>

          <div>
            <h3 className="text-lg font-medium text-white mb-2">
              Drop files here or click to browse
            </h3>
            <p className="text-gray-400 text-sm">
              Accepted types: {acceptedTypes.join(', ')}
            </p>
            <p className="text-gray-500 text-xs mt-1">
              Maximum {maxFiles} files, {maxSize}MB each
            </p>
          </div>

          <Button
            type="button"
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <FolderOpen className="w-4 h-4 mr-2" />
            Select Files
          </Button>
        </div>
      </div>

      {/* Privacy Setting */}
      {files.length > 0 && (
        <div className="flex items-center space-x-2 p-4 bg-gray-800/50 rounded-none">
          <Checkbox 
            id="is_public" 
            checked={isPublic} 
            onCheckedChange={setIsPublic}
            disabled={uploading}
          />
          <Label htmlFor="is_public" className="text-sm text-gray-300 cursor-pointer">
            Make uploaded files publicly visible
          </Label>
        </div>
      )}

      {/* New Files List */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-medium text-white">
              New Files ({files.length})
            </h4>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearAllFiles}
                disabled={uploading}
                className="text-red-400 hover:text-red-300"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Clear All
              </Button>
            </div>
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
                    className="flex items-center gap-4 p-4 bg-gray-900/50 border border-white/10 rounded-none hover:border-white/20 transition-colors duration-200"
                  >
                    {/* File Preview/Icon */}
                    <div className="flex-shrink-0">
                      {file.preview ? (
                        <img
                          src={file.preview}
                          alt={file.name}
                          className="w-12 h-12 object-cover rounded-none"
                        />
                      ) : (
                        <div className={cn("p-2 rounded-none border", colorClasses)}>
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
                          <div className="w-full bg-gray-800 rounded-none h-1.5">
                            <div 
                              className="bg-white h-1.5 rounded-none transition-all duration-300"
                              style={{ width: `${file.progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Error Message */}
                      {file.status === 'error' && file.error && (
                        <p className="text-red-400 text-xs mt-1">{file.error}</p>
                      )}
                    </div>

                    {/* Status & Actions */}
                    <div className="flex items-center gap-2">
                      {file.status === 'ready' && (
                        <button
                          onClick={() => removeFile(file.id)}
                          className="p-2 text-gray-400 hover:text-red-400 transition-colors duration-200"
                          title="Remove"
                          disabled={uploading}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}

                      {file.status === 'uploading' && (
                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                      )}

                      {file.status === 'uploaded' && (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      )}

                      {file.status === 'error' && (
                        <>
                          <AlertCircle className="w-5 h-5 text-red-400" />
                          <button
                            onClick={() => retryUpload(file.id)}
                            className="p-2 text-gray-400 hover:text-white transition-colors duration-200"
                            title="Retry"
                            disabled={uploading}
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>

          {/* Upload Button */}
          {files.some(f => f.status === 'ready') && (
            <div className="flex justify-end pt-4">
              <Button
                onClick={uploadFiles}
                disabled={uploading}
                className="bg-white hover:bg-white-700"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload {files.filter(f => f.status === 'ready').length} File(s)
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Existing Files Section */}
      {showExistingFiles && existingFiles.length > 0 && (
        <div className="space-y-3 pt-6 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-medium text-white">
              Project Files ({existingFiles.length})
            </h4>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={loadExistingFiles}
              disabled={loadingExisting}
            >
              <RefreshCw className={cn("w-4 h-4 mr-1", loadingExisting && "animate-spin")} />
              Refresh
            </Button>
          </div>

          <div className="grid gap-3">
            {existingFiles.map((file) => {
              const Icon = getFileIcon(file)
              const colorClasses = getFileColor(file)

              return (
                <div
                  key={file.file_id}
                  className="flex items-center gap-4 p-4 bg-gray-900/30 border border-white/5 rounded-none"
                >
                  <div className={cn("p-2 rounded-none border flex-shrink-0", colorClasses)}>
                    <Icon className="w-6 h-6" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{file.original_name}</p>
                    <p className="text-gray-500 text-xs">
                      {formatFileSize(file.file_size)} • {file.file_category} • {file.download_count} downloads
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => downloadFile(file.download_url, file.original_name)}
                      className="p-2 text-gray-400 hover:text-white transition-colors duration-200"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    
                    {file.preview_url && (
                      <button
                        onClick={() => window.open(file.preview_url, '_blank')}
                        className="p-2 text-gray-400 hover:text-white transition-colors duration-200"
                        title="Preview"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}

                    {allowFileDeletion && file.is_owner && (
                      <button
                        onClick={() => removeExistingFile(file.file_id)}
                        className="p-2 text-gray-400 hover:text-red-400 transition-colors duration-200"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty State for Existing Files */}
      {showExistingFiles && !loadingExisting && existingFiles.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No files uploaded yet</p>
        </div>
      )}
    </div>
  )
}

export default ProjectFileUploader
