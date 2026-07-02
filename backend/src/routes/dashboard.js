const router = require('express').Router();
const {
    getDashboardSummary,
    getMyLinks,
    getLinkDetails,
    getDeviceSession
} = require('../controllers/dashboardController');

// GET /api/dashboard/summary               → home screen stats
router.get('/summary',                getDashboardSummary);

// GET /api/dashboard/links                 → My Links screen
router.get('/links',                  getMyLinks);

// GET /api/dashboard/links/:token          → Link details screen
router.get('/links/:token',           getLinkDetails);

// GET /api/dashboard/sessions/:session_id  → Device session screen
router.get('/sessions/:session_id',   getDeviceSession);

module.exports = router;
