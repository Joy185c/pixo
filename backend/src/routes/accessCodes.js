const router = require('express').Router();
const { accessCodeLimiter }  = require('../middleware/rateLimiters');
const { verifyAccessCode }   = require('../controllers/accessCodeController');

/**
 * POST /api/access-codes/verify
 *
 * Rate-limited endpoint. Client submits the raw access code;
 * backend verifies and returns an access_code_id to use when
 * creating an invite link. The plaintext code is NEVER stored.
 */
router.post('/verify', accessCodeLimiter, verifyAccessCode);

module.exports = router;
