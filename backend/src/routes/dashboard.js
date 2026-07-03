const router = require('express').Router();
const {
    getDashboardSummary,
    getMyLinks,
    getLinkDetails,
    getDeviceSession
} = require('../controllers/dashboardController');

const { requireAuth, scopedRequesterAccess } = require('../middleware/authMiddleware');

// GET /api/dashboard/summary               → home screen stats
router.get('/summary', requireAuth, scopedRequesterAccess, getDashboardSummary);

// GET /api/dashboard/links                 → My Links screen
router.get('/links', requireAuth, scopedRequesterAccess, getMyLinks);

// GET /api/dashboard/links/:token          → Link details screen
router.get('/links/:token', requireAuth, scopedRequesterAccess, getLinkDetails);

// GET /api/dashboard/sessions/:session_id  → Device session screen
router.get('/sessions/:session_id', requireAuth, scopedRequesterAccess, getDeviceSession);

module.exports = router;
