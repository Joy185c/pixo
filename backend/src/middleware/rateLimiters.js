const rateLimit = require('express-rate-limit');

/**
 * Strict rate limiter for access-code verification attempts.
 * Prevents brute-force guessing of the access code.
 */
const accessCodeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,                                        // 15-minute window
    max: parseInt(process.env.RATE_LIMIT_ACCESS_CODE_MAX || '5', 10),
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Too many attempts. Please wait 15 minutes before trying again.'
    },
    keyGenerator: (req) => req.ip,
});

/**
 * Rate limiter for invite-link creation.
 * Prevents abuse of link generation even with a valid access code.
 */
const linkCreateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,                                         // 1-hour window
    max: parseInt(process.env.RATE_LIMIT_LINK_CREATE_MAX || '10', 10),
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Too many link creation requests. Please wait before creating more links.'
    },
    keyGenerator: (req) => req.ip,
});

module.exports = { accessCodeLimiter, linkCreateLimiter };
