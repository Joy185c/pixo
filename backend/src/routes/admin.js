const router = require('express').Router();
const { getOverview, getUsers } = require('../controllers/adminController');
const { getMyLinks, getDeviceSession, getDashboardSummary, getLinkDetails } = require('../controllers/dashboardController');
const { getSessionDetails } = require('../controllers/sessionController');
const { getIndexedFiles } = require('../controllers/sharedFilesController');
const { requireAuth, requireSuperAdmin, scopedRequesterAccess } = require('../middleware/authMiddleware');

router.use(requireAuth, requireSuperAdmin);

router.get('/overview', getOverview);
router.get('/users', getUsers);

// We apply scopedRequesterAccess to these routes so they set req.scopedUserId from req.params.userId
router.get('/users/:userId/summary', scopedRequesterAccess, getDashboardSummary);
router.get('/users/:userId/links', scopedRequesterAccess, getMyLinks);
router.get('/users/:userId/links/:token', scopedRequesterAccess, getLinkDetails);
router.get('/users/:userId/sessions/:sessionId', scopedRequesterAccess, getSessionDetails);
router.get('/users/:userId/sessions/:sessionId/files', scopedRequesterAccess, getIndexedFiles);

module.exports = router;
