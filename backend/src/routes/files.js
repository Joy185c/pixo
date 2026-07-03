const router = require('express').Router();
const { requireAuth, requireSuperAdmin } = require('../middleware/authMiddleware');
const { requestDownload, getDownloadRequestStatus } = require('../controllers/fileDownloadController');

// super_admin can download any file; regular users download their own
router.post('/:fileToken/download-request', requireAuth, requestDownload);
router.get('/download-requests/:requestId', requireAuth, getDownloadRequestStatus);

module.exports = router;
