const router = require('express').Router();
const { requireAuth, scopedRequesterAccess } = require('../middleware/authMiddleware');
const { requestDownload, getDownloadRequestStatus } = require('../controllers/fileDownloadController');

router.post('/:fileToken/download-request', requireAuth, scopedRequesterAccess, requestDownload);
router.get('/download-requests/:requestId', requireAuth, scopedRequesterAccess, getDownloadRequestStatus);

module.exports = router;
