const db = require('../db');

const requireProjectOwner = (parameterName = 'projectId') => async (req, res, next) => {
  try {
    const projectId = req.params[parameterName];
    const userId = req.user?.user_id || req.user?.id;
    const result = await db.query(
      'SELECT owner_id FROM projects WHERE project_id = $1',
      [projectId]
    );

    if (!result.rows?.length) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    if (result.rows[0].owner_id !== userId) {
      return res.status(403).json({ success: false, message: 'Project owner access required' });
    }

    req.projectAccess = { projectId, ownerId: userId };
    next();
  } catch (error) {
    console.error('Project ownership authorization error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to verify project access' });
  }
};

module.exports = requireProjectOwner;
