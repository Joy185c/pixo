const router = require('express').Router();
const { linkCreateLimiter } = require('../middleware/rateLimiters');
const {
    createInviteLink,
    getInviteLinks,
    getInviteLinkDetails,
    disableInviteLink,
    verifyInviteLink
} = require('../controllers/inviteLinkController');

const { requireAuth, scopedRequesterAccess } = require('../middleware/authMiddleware');

// GET  /api/invite-links              → list all links (dashboard)
router.get('/', requireAuth, scopedRequesterAccess, getInviteLinks);

// POST /api/invite-links              → create new link (requires verified access_code_id)
router.post('/', requireAuth, linkCreateLimiter, createInviteLink);

// GET  /api/invite-links/verify/:token → public provider verification
router.get('/verify/:token', verifyInviteLink);

// GET  /api/invite-links/:token       → single link with sessions
router.get('/:token', requireAuth, scopedRequesterAccess, getInviteLinkDetails);

// PATCH /api/invite-links/:token/disable → admin disable
router.patch('/:token/disable', requireAuth, scopedRequesterAccess, disableInviteLink);

module.exports = router;
