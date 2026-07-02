const router = require('express').Router();
const { linkCreateLimiter } = require('../middleware/rateLimiters');
const {
    createInviteLink,
    getInviteLinks,
    getInviteLinkDetails,
    disableInviteLink
} = require('../controllers/inviteLinkController');

// GET  /api/invite-links              → list all links (dashboard)
router.get('/',             getInviteLinks);

// POST /api/invite-links              → create new link (requires verified access_code_id)
router.post('/', linkCreateLimiter, createInviteLink);

// GET  /api/invite-links/:token       → single link with sessions
router.get('/:token',       getInviteLinkDetails);

// PATCH /api/invite-links/:token/disable → admin disable
router.patch('/:token/disable', disableInviteLink);

module.exports = router;
