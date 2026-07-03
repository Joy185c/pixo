const router = require('express').Router();
const { getOverview, getUsers } = require('../controllers/adminController');
const { requireAuth, requireSuperAdmin } = require('../middleware/authMiddleware');

router.use(requireAuth, requireSuperAdmin);

router.get('/overview', getOverview);
router.get('/users', getUsers);

module.exports = router;
