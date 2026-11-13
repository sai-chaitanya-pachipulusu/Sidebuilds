const express = require('express');
const router = express.Router();
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const xss = require('xss');
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');
const requireProjectOwner = require('../middleware/requireProjectOwner');
const { uploadMultiple, handleMulterError, getFileType, getFileCategory } = require('../config/multer');
const {
    resolveStoredUploadPath,
    sanitizeDownloadName,
    SAFE_INLINE_IMAGE_TYPES
} = require('../utils/uploadSecurity');

// Apply auth middleware to all routes
router.use(authMiddleware);

/**
 * @route   POST /api/files/upload/:projectId
 * @desc    Upload files to a project
 * @access  Private (Project owner only)
 */
router.post('/upload/:projectId', requireProjectOwner('projectId'), require('../middleware/rateLimiter').uploadLimiter, uploadMultiple('files', 10), handleMulterError, async (req, res) => {
    try {
        const { projectId } = req.params;
        const userId = req.user.user_id;
        const { description, is_public } = req.body;

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No files uploaded'
            });
        }

        const uploadedFiles = await require('../services/fileStorage').persistUploads(req.files, projectId, userId, req.body);

        res.status(201).json({
            success: true,
            message: `${uploadedFiles.length} file(s) uploaded successfully`,
            files: uploadedFiles
        });

    } catch (error) {
        console.error('Upload failed:', error.code || error.message);
        res.status(error.status || 500).json({ success:false,message:error.status ? error.message : 'Upload could not be saved. Please retry.' });
    }
});

/**
 * @route   GET /api/files/project/:projectId
 * @desc    Get all files for a project
 * @access  Private (Project owner or public if project is public)
 */
router.get('/project/:projectId', async (req, res) => {
    try {
        const { projectId } = req.params;
        const userId = req.user.user_id;

        // Check project access
        const projectResult = await db.query(
            'SELECT * FROM projects WHERE project_id = $1',
            [projectId]
        );

        if (projectResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        const project = projectResult.rows[0];
        const isOwner = (project.owner_id || project.user_id) === userId;
        const isPublic = project.is_public === true || project.is_public === 1;

        // Build query based on access level
        let query = `SELECT file_id, project_id, user_id, file_name, original_name,
                            file_type, file_category, file_size, mime_type,
                            is_public, description, download_count, created_at, updated_at
                     FROM project_files WHERE project_id = $1`;
        let params = [projectId];

        // If not owner, only show public files or files from public projects
        if (!isOwner && !await require('../services/fileStorage').isPaidBuyer(projectId,userId)) {
            if (isPublic) {
                query += ` AND ${db.trueExpr('is_public')}`;
            } else {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }
        }

        query += ' ORDER BY created_at DESC';

        const filesResult = await db.query(query, params);

        // Add download URLs
        const files = filesResult.rows.map(file => ({
            ...file,
            url: `/api/files/download/${file.file_id}`,
            is_owner: isOwner
        }));

        res.json({
            success: true,
            files: files,
            is_owner: isOwner
        });

    } catch (error) {
        console.error('Get project files error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching files'
        });
    }
});

/**
 * @route   GET /api/files/download/:fileId
 * @desc    Download a file
 * @access  Private (File owner, project owner, or public if file is public)
 */
router.get('/download/:fileId', async (req, res) => {
    try {
        const { fileId } = req.params;
        const userId = req.user?.user_id;

        // Get file metadata
        const fileResult = await db.query(
            'SELECT * FROM project_files WHERE file_id = $1',
            [fileId]
        );

        if (fileResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'File not found'
            });
        }

        const file = fileResult.rows[0];

        // Check access permissions
        const projectResult = await db.query(
            'SELECT * FROM projects WHERE project_id = $1',
            [file.project_id]
        );

        if (projectResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        const project = projectResult.rows[0];
        const isProjectOwner = (project.owner_id || project.user_id) === userId;
        const isFileOwner = file.user_id === userId;
        const isPublic = file.is_public === true || file.is_public === 1;
        const isProjectPublic = project.is_public === true || project.is_public === 1;

        // Allow download if:
        // 1. User is file owner
        // 2. User is project owner
        // 3. File is public AND project is public
        if (!isFileOwner && !isProjectOwner && !(isPublic && isProjectPublic) && !await require('../services/fileStorage').isPaidBuyer(file.project_id, userId)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const content = await require('../services/fileStorage').readContent(file);
        if (!content) return res.status(404).json({success:false,message:'File content unavailable'});
        res.setHeader('Cache-Control','private, no-store');
        // Increment download count
        await db.query(
            'UPDATE project_files SET download_count = download_count + 1 WHERE file_id = $1',
            [fileId]
        );

        // Set headers for download
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${sanitizeDownloadName(file.original_name)}"`);
        res.setHeader('Content-Length', content.length);
        res.setHeader('X-Content-Type-Options', 'nosniff');

        // Stream file to response
        res.end(content);

    } catch (error) {
        console.error('File download error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during file download'
        });
    }
});

/**
 * @route   GET /api/files/preview/:fileId
 * @desc    Preview a file (for images)
 * @access  Private (File owner, project owner, or public if file is public)
 */
router.get('/preview/:fileId', async (req, res) => {
    try {
        const { fileId } = req.params;
        const userId = req.user?.user_id;

        // Get file metadata
        const fileResult = await db.query(
            'SELECT * FROM project_files WHERE file_id = $1',
            [fileId]
        );

        if (fileResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'File not found'
            });
        }

        const file = fileResult.rows[0];

        // Only allow preview for images
        if (!SAFE_INLINE_IMAGE_TYPES.has(file.mime_type)) {
            return res.status(400).json({
                success: false,
                message: 'Preview only available for images'
            });
        }

        // Check access permissions
        const projectResult = await db.query(
            'SELECT * FROM projects WHERE project_id = $1',
            [file.project_id]
        );

        if (projectResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        const project = projectResult.rows[0];
        const isProjectOwner = (project.owner_id || project.user_id) === userId;
        const isFileOwner = file.user_id === userId;
        const isPublic = file.is_public === true || file.is_public === 1;
        const isProjectPublic = project.is_public === true || project.is_public === 1;

        if (!isFileOwner && !isProjectOwner && !(isPublic && isProjectPublic) && !await require('../services/fileStorage').isPaidBuyer(file.project_id, userId)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const content = await require('../services/fileStorage').readContent(file);
        if (!content) return res.status(404).json({success:false,message:'File content unavailable'});
        res.setHeader('Cache-Control','private, no-store');
        // Set headers for inline display
        res.setHeader('Content-Type', file.mime_type);
        res.setHeader('Content-Disposition', `inline; filename="${sanitizeDownloadName(file.original_name)}"`);
        res.setHeader('Content-Length', content.length);
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");

        // Stream file to response
        res.end(content);

    } catch (error) {
        console.error('File preview error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during file preview'
        });
    }
});

/**
 * @route   DELETE /api/files/:fileId
 * @desc    Delete a file
 * @access  Private (File owner or project owner only)
 */
router.delete('/:fileId', async (req, res) => {
    try {
        const { fileId } = req.params;
        const userId = req.user.user_id;

        // Get file metadata
        const fileResult = await db.query(
            'SELECT * FROM project_files WHERE file_id = $1',
            [fileId]
        );

        if (fileResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'File not found'
            });
        }

        const file = fileResult.rows[0];

        // Check if user is file owner or project owner
        const projectResult = await db.query(
            'SELECT * FROM projects WHERE project_id = $1',
            [file.project_id]
        );

        if (projectResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        const project = projectResult.rows[0];
        const isProjectOwner = (project.owner_id || project.user_id) === userId;
        const isFileOwner = file.user_id === userId;

        if (!isProjectOwner) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to delete this file'
            });
        }

        // Delete the database record first, then unlink from disk best-effort.
        // If the file is already gone, deletion still succeeds; if the DB
        // delete fails, no orphaned "deleted" state is created.
        await require('../services/fileStorage').deleteStoredFile(fileId,userId);

        const filePath = resolveStoredUploadPath(file.storage_path);
        if (filePath) {
            try {
                fs.unlinkSync(filePath);
            } catch (unlinkErr) {
                if (unlinkErr.code !== 'ENOENT') {
                    console.error('File unlink failed after DB delete:', unlinkErr.message);
                }
            }
        }

        res.json({
            success: true,
            message: 'File deleted successfully'
        });

    } catch (error) {
        console.error('File deletion error:', error);
        if(error.status) return res.status(error.status).json({success:false,message:error.message});
        res.status(500).json({
            success: false,
            message: 'Server error during file deletion'
        });
    }
});

/**
 * @route   PUT /api/files/:fileId
 * @desc    Update file metadata
 * @access  Private (File owner or project owner only)
 */
router.put('/:fileId', async (req, res) => {
    try {
        const { fileId } = req.params;
        const userId = req.user.user_id;
        const { description, is_public } = req.body;

        // Get file metadata
        const fileResult = await db.query(
            'SELECT * FROM project_files WHERE file_id = $1',
            [fileId]
        );

        if (fileResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'File not found'
            });
        }

        const file = fileResult.rows[0];

        // Check if user is file owner or project owner
        const projectResult = await db.query(
            'SELECT * FROM projects WHERE project_id = $1',
            [file.project_id]
        );

        if (projectResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        const project = projectResult.rows[0];
        const isProjectOwner = (project.owner_id || project.user_id) === userId;
        const isFileOwner = file.user_id === userId;

        if (!isProjectOwner) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to update this file'
            });
        }

        // Build update query
        const updates = [];
        const values = [];
        let paramIndex = 1;

        if (description !== undefined) {
            updates.push(`description = $${paramIndex}`);
            // Sanitize free-text metadata (parity with upload path)
            values.push(description === null ? null : xss(String(description)));
            paramIndex++;
        }

        if (is_public !== undefined) {
            updates.push(`is_public = $${paramIndex}`);
            values.push(is_public === true || is_public === 'true');
            paramIndex++;
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        values.push(fileId);

        const result = await require('../services/fileStorage').withFileOwner(fileId,userId,client=>client.query(
            `UPDATE project_files SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP 
             WHERE file_id = $${paramIndex} 
             RETURNING file_id, project_id, user_id, file_name, original_name,
                       file_type, file_category, file_size, mime_type,
                       is_public, description, download_count, created_at, updated_at`,
            values
        ));

        res.json({
            success: true,
            message: 'File updated successfully',
            file: result.rows[0]
        });

    } catch (error) {
        console.error('File update error:', error);
        if(error.status) return res.status(error.status).json({success:false,message:error.message});
        res.status(500).json({
            success: false,
            message: 'Server error during file update'
        });
    }
});

/**
 * @route   GET /api/files/stats/:projectId
 * @desc    Get file statistics for a project
 * @access  Private (Project owner)
 */
router.get('/stats/:projectId', async (req, res) => {
    try {
        const { projectId } = req.params;
        const userId = req.user.user_id;

        // Check project ownership
        const projectResult = await db.query(
            'SELECT * FROM projects WHERE project_id = $1',
            [projectId]
        );

        if (projectResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        const project = projectResult.rows[0];
        if ((project.owner_id || project.user_id) !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Get file statistics
        const statsResult = await db.query(
            `SELECT 
                COUNT(*) as total_files,
                SUM(file_size) as total_size,
                SUM(download_count) as total_downloads,
                COUNT(CASE WHEN file_category = 'images' THEN 1 END) as image_count,
                COUNT(CASE WHEN file_category = 'documents' THEN 1 END) as document_count,
                COUNT(CASE WHEN file_category = 'code' THEN 1 END) as code_count
             FROM project_files 
             WHERE project_id = $1`,
            [projectId]
        );

        res.json({
            success: true,
            stats: statsResult.rows[0]
        });

    } catch (error) {
        console.error('File stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching file statistics'
        });
    }
});

module.exports = router;
