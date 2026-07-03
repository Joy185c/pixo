const router = require('express').Router();
const {
    joinSession,
    getSessionDetails,
    revokeSession,
} = require('../controllers/sessionController');
const {
    indexFiles,
    getIndexedFiles,
} = require('../controllers/sharedFilesController');
const { requireAuth, scopedRequesterAccess } = require('../middleware/authMiddleware');

// POST  /api/sessions/join
// Provider phone joins via an invite token
router.post('/join', joinSession);

// GET   /api/sessions/:session_id
// Full session details
router.get('/:session_id', requireAuth, scopedRequesterAccess, getSessionDetails);

// POST  /api/sessions/:session_id/files/index
// Provider app sends real file metadata after permission approval
// MUST come before the GET /:session_id/files route to avoid conflict
router.post('/:session_id/files/index', indexFiles);

// GET   /api/sessions/:session_id/files[?category=photos]
// Requester fetches real indexed file metadata
router.get('/:session_id/files', requireAuth, scopedRequesterAccess, getIndexedFiles);

// PATCH /api/sessions/:session_id/revoke
// Requester forcibly ends a session
router.patch('/:session_id/revoke', requireAuth, scopedRequesterAccess, revokeSession);

module.exports = router;
