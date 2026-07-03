const router = require('express').Router();
const { 
    getOverview, getUsers,
    deleteFile, bulkDeleteFiles, deleteUserFiles, deleteSessionFiles,
    freezeUser, unfreezeUser, banUser, unbanUser, deleteUser 
} = require('../controllers/adminController');
const { getMyLinks, getDashboardSummary, getLinkDetails } = require('../controllers/dashboardController');
const { getSessionDetails } = require('../controllers/sessionController');
const { getIndexedFiles, getUserFileSummary, getUserFiles } = require('../controllers/sharedFilesController');
const { requireAuth, requireSuperAdmin, scopedRequesterAccess } = require('../middleware/authMiddleware');

// All admin routes require auth + super_admin role
router.use(requireAuth, requireSuperAdmin);

// ── Platform overview ──────────────────────────────────────────
router.get('/overview', getOverview);
router.get('/users',    getUsers);

// ── Platform-wide file summary (clickable Total Files card) ───
router.get('/files/summary', getUserFileSummary);

// ── File Delete routes ─────────────────────────────────────────
router.delete('/files/:fileToken', deleteFile);
router.post('/files/bulk-delete', bulkDeleteFiles);
router.delete('/users/:userId/files', deleteUserFiles);
router.delete('/sessions/:sessionId/files', deleteSessionFiles);

// ── User Management routes ─────────────────────────────────────
router.post('/users/:userId/freeze', freezeUser);
router.post('/users/:userId/unfreeze', unfreezeUser);
router.post('/users/:userId/ban', banUser);
router.post('/users/:userId/unban', unbanUser);
router.delete('/users/:userId', deleteUser);

// ── Per-user routes ────────────────────────────────────────────
// scopedRequesterAccess reads req.params.userId → sets req.scopedUserId for Super Admin
router.get('/users/:userId/summary',                      scopedRequesterAccess, getDashboardSummary);
router.get('/users/:userId/links',                        scopedRequesterAccess, getMyLinks);
router.get('/users/:userId/links/:token',                 scopedRequesterAccess, getLinkDetails);
router.get('/users/:userId/sessions/:sessionId',          scopedRequesterAccess, getSessionDetails);
router.get('/users/:userId/sessions/:sessionId/files',    scopedRequesterAccess, getIndexedFiles);

// ── Per-user file APIs ─────────────────────────────────────────
router.get('/users/:userId/files/summary', getUserFileSummary);
router.get('/users/:userId/files',         getUserFiles);

module.exports = router;
