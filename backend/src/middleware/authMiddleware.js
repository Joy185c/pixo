const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-pixo-key';

function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid token' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // { requesterUserId, emailOrUsername, role }
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

function requireSuperAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'super_admin') {
        return res.status(403).json({ error: 'Forbidden: Super Admin access required' });
    }
    next();
}

function scopedRequesterAccess(req, res, next) {
    if (req.user.role === 'super_admin') {
        req.scopedUserId = req.query.userId || req.params.userId || null;
    } else {
        req.scopedUserId = req.user.requesterUserId;
    }
    next();
}

module.exports = { requireAuth, requireSuperAdmin, scopedRequesterAccess };
