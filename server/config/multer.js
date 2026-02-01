const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Create subdirectories for different file types
const subdirs = ['images', 'documents', 'code', 'thumbnails'];
subdirs.forEach(subdir => {
    const subdirPath = path.join(uploadsDir, subdir);
    if (!fs.existsSync(subdirPath)) {
        fs.mkdirSync(subdirPath, { recursive: true });
    }
});

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Determine subdirectory based on file type
        let subdir = 'documents';
        if (file.mimetype.startsWith('image/')) {
            subdir = 'images';
        } else if (file.mimetype === 'application/zip' || 
                   file.mimetype === 'application/x-zip-compressed' ||
                   file.name?.endsWith('.zip') ||
                   file.originalname?.endsWith('.zip')) {
            subdir = 'code';
        }
        
        const destPath = path.join(uploadsDir, subdir);
        cb(null, destPath);
    },
    filename: (req, file, cb) => {
        // Generate unique filename with original extension
        const uniqueId = uuidv4();
        const ext = path.extname(file.originalname).toLowerCase();
        const sanitizedName = file.originalname
            .replace(ext, '')
            .replace(/[^a-zA-Z0-9-_]/g, '_')
            .substring(0, 50);
        
        const filename = `${sanitizedName}_${uniqueId}${ext}`;
        cb(null, filename);
    }
});

// File filter for validation
const fileFilter = (req, file, cb) => {
    const allowedTypes = {
        images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
        documents: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'text/markdown',
            'application/json'
        ],
        code: [
            'application/zip',
            'application/x-zip-compressed',
            'application/x-7z-compressed',
            'application/x-tar',
            'application/gzip',
            'text/javascript',
            'text/typescript',
            'text/html',
            'text/css',
            'text/x-python',
            'text/x-java',
            'text/x-c',
            'text/x-c++'
        ]
    };

    const allAllowedTypes = [...allowedTypes.images, ...allowedTypes.documents, ...allowedTypes.code];
    
    if (allAllowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        // Check file extension as fallback
        const ext = path.extname(file.originalname).toLowerCase();
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.pdf', '.doc', '.docx', '.txt', '.md', '.json', '.zip', '.7z', '.tar', '.gz', '.js', '.ts', '.jsx', '.tsx', '.html', '.css', '.py', '.java', '.c', '.cpp', '.h', '.go', '.rs', '.php'];
        
        if (allowedExtensions.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error(`File type not allowed: ${file.mimetype || ext}`), false);
        }
    }
};

// Size limits (in bytes)
const sizeLimits = {
    images: 5 * 1024 * 1024,      // 5MB
    documents: 10 * 1024 * 1024,  // 10MB
    code: 50 * 1024 * 1024        // 50MB
};

// Create multer instances for different use cases
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: Math.max(...Object.values(sizeLimits)), // 50MB max
        files: 10 // Max 10 files per upload
    }
});

// Single file upload middleware
const uploadSingle = (fieldName) => upload.single(fieldName);

// Multiple files upload middleware
const uploadMultiple = (fieldName, maxCount = 10) => upload.array(fieldName, maxCount);

// Mixed files upload middleware
const uploadMixed = (fields) => upload.fields(fields);

// Error handler middleware
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        // A Multer error occurred when uploading
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File too large. Maximum size is 50MB.',
                code: 'FILE_TOO_LARGE'
            });
        } else if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                message: 'Too many files. Maximum is 10 files per upload.',
                code: 'TOO_MANY_FILES'
            });
        } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
                success: false,
                message: 'Unexpected field name in upload.',
                code: 'UNEXPECTED_FIELD'
            });
        }
        return res.status(400).json({
            success: false,
            message: err.message,
            code: err.code
        });
    } else if (err) {
        // An unknown error occurred
        return res.status(400).json({
            success: false,
            message: err.message || 'File upload failed',
            code: 'UPLOAD_ERROR'
        });
    }
    next();
};

// File type checker helper
const getFileType = (mimetype, filename) => {
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype === 'application/pdf') return 'pdf';
    if (mimetype.includes('word') || filename.endsWith('.doc') || filename.endsWith('.docx')) return 'document';
    if (mimetype === 'application/zip' || mimetype === 'application/x-zip-compressed' || filename.endsWith('.zip')) return 'zip';
    if (mimetype.includes('compressed') || filename.endsWith('.7z') || filename.endsWith('.tar') || filename.endsWith('.gz')) return 'archive';
    if (mimetype.includes('text') || filename.match(/\.(js|ts|jsx|tsx|html|css|py|java|c|cpp|h|go|rs|php)$/)) return 'code';
    return 'other';
};

// File category checker
const getFileCategory = (fileType) => {
    if (['image'].includes(fileType)) return 'images';
    if (['pdf', 'document'].includes(fileType)) return 'documents';
    if (['zip', 'archive', 'code'].includes(fileType)) return 'code';
    return 'documents';
};

module.exports = {
    upload,
    uploadSingle,
    uploadMultiple,
    uploadMixed,
    handleMulterError,
    getFileType,
    getFileCategory,
    uploadsDir,
    sizeLimits
};