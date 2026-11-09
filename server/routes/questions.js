const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');
const { createNotification } = require('../services/notificationService');

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array().map(err => ({ field: err.path, message: err.msg }))
        });
    }
    next();
};

// GET /api/questions/project/:projectId — public Q&A for a listing
router.get('/project/:projectId',
    [param('projectId').isUUID().withMessage('Invalid project ID')],
    handleValidationErrors,
    async (req, res) => {
        try {
            const result = await db.query(
                `SELECT q.question_id, q.question, q.answer, q.answered_at, q.created_at,
                        asker.username AS asker_username,
                        answerer.username AS answerer_username
                 FROM project_questions q
                 JOIN projects p ON p.project_id = q.project_id
                 JOIN users asker ON q.asker_id = asker.user_id
                 LEFT JOIN users answerer ON q.answered_by = answerer.user_id
                 WHERE q.project_id = $1 AND p.is_public = true AND COALESCE(q.is_public, true) = true
                 ORDER BY q.created_at DESC
                 LIMIT 100`,
                [req.params.projectId]
            );
            res.json(result.rows);
        } catch (err) {
            console.error('Error fetching questions:', err.message);
            res.status(500).json({ error: 'Failed to fetch questions' });
        }
    }
);

// POST /api/questions/project/:projectId — ask a question
router.post('/project/:projectId',
    authMiddleware,
    [
        param('projectId').isUUID().withMessage('Invalid project ID'),
        body('question').trim().isLength({ min: 5, max: 2000 }).withMessage('Question must be 5-2000 characters')
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const { projectId } = req.params;
            const askerId = req.user.user_id;

            const project = await db.query(
                'SELECT owner_id, name FROM projects WHERE project_id = $1 AND is_public = true',
                [projectId]
            );
            if (project.rows.length === 0) {
                return res.status(404).json({ error: 'Project not found' });
            }
            if (project.rows[0].owner_id === askerId) {
                return res.status(400).json({ error: 'You cannot ask a question on your own project.' });
            }

            const inserted = await db.query(
                `INSERT INTO project_questions (project_id, asker_id, question, is_public)
                 VALUES ($1, $2, $3, true)
                 RETURNING question_id, question, created_at`,
                [projectId, askerId, req.body.question.trim()]
            );

            try {
                await createNotification(
                    project.rows[0].owner_id,
                    'new_question',
                    `New question on your project "${project.rows[0].name}".`,
                    `/projects/${projectId}`
                );
            } catch (notifyErr) {
                console.error('Question notification failed:', notifyErr.message);
            }

            res.status(201).json({
                ...inserted.rows[0],
                asker_username: req.user.username
            });
        } catch (err) {
            console.error('Error creating question:', err.message);
            res.status(500).json({ error: 'Failed to post question' });
        }
    }
);

// POST /api/questions/:questionId/answer — project owner answers
router.post('/:questionId/answer',
    authMiddleware,
    [
        param('questionId').isUUID().withMessage('Invalid question ID'),
        body('answer').trim().isLength({ min: 1, max: 3000 }).withMessage('Answer must be 1-3000 characters')
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const { questionId } = req.params;
            const userId = req.user.user_id;

            const questionRow = await db.query(
                `SELECT q.question_id, q.asker_id, q.project_id, p.owner_id, p.name AS project_name
                 FROM project_questions q
                 JOIN projects p ON q.project_id = p.project_id
                 WHERE q.question_id = $1`,
                [questionId]
            );
            if (questionRow.rows.length === 0) {
                return res.status(404).json({ error: 'Question not found' });
            }

            const question = questionRow.rows[0];
            if (question.owner_id !== userId) {
                return res.status(403).json({ error: 'Only the project owner can answer questions.' });
            }

            const updated = await db.query(
                `UPDATE project_questions
                 SET answer = $1, answered_by = $2, answered_at = CURRENT_TIMESTAMP
                 WHERE question_id = $3
                 RETURNING question_id, question, answer, answered_at`,
                [req.body.answer.trim(), userId, questionId]
            );

            try {
                await createNotification(
                    question.asker_id,
                    'question_answered',
                    `The seller answered your question on "${question.project_name}".`,
                    `/projects/${question.project_id}`
                );
            } catch (notifyErr) {
                console.error('Answer notification failed:', notifyErr.message);
            }

            res.json(updated.rows[0]);
        } catch (err) {
            console.error('Error answering question:', err.message);
            res.status(500).json({ error: 'Failed to post answer' });
        }
    }
);

module.exports = router;
