const { pool } = require('../db/pool');
const crypto = require('crypto');

/**
 * requestDownload
 * POST /api/files/:fileToken/download-request
 */
async function requestDownload(req, res) {
    const { fileToken } = req.params;
    const userRole = req.user ? req.user.role : 'user';
    const userId = req.user ? (req.user.requesterUserId || req.user.id) : null;

    try {
        // Find the file and verify access
        const { rows: fileRows } = await pool.query(
            `SELECT session_id, requester_user_id 
             FROM shared_files 
             WHERE file_token = $1 AND is_available = TRUE AND deleted_at IS NULL`,
            [fileToken]
        );
        if (fileRows.length === 0) return res.status(404).json({ error: 'File not found or unavailable.' });

        const fileInfo = fileRows[0];
        if (userRole !== 'super_admin' && fileInfo.requester_user_id !== userId) {
            return res.status(403).json({ error: 'Not authorized to download this file.' });
        }

        // Verify session is active
        const { rows: sessRows } = await pool.query(
            `SELECT status FROM provider_sessions WHERE id = $1`, [fileInfo.session_id]
        );
        if (sessRows.length === 0 || sessRows[0].status !== 'active') {
            return res.status(403).json({ error: 'Provider session is not active. The device may be offline.' });
        }

        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

        const { rows: reqRows } = await pool.query(
            `INSERT INTO download_requests 
             (requester_user_id, session_id, file_token, requested_by_user_id, requested_by_role, status, expires_at)
             VALUES ($1, $2, $3, $4, $5, 'pending', $6)
             RETURNING id`,
            [fileInfo.requester_user_id, fileInfo.session_id, fileToken, userId, userRole, expiresAt]
        );

        return res.status(201).json({ requestId: reqRows[0].id });
    } catch (err) {
        console.error('[requestDownload] Error:', err.message);
        return res.status(500).json({ error: 'Internal server error.' });
    }
}

/**
 * getDownloadRequestStatus
 * GET /api/files/download-requests/:requestId
 */
async function getDownloadRequestStatus(req, res) {
    const { requestId } = req.params;
    const userRole = req.user ? req.user.role : 'user';
    const userId = req.user ? (req.user.requesterUserId || req.user.id) : null;

    try {
        const { rows } = await pool.query(
            `SELECT requested_by_user_id, status, temp_url, error_reason 
             FROM download_requests 
             WHERE id = $1`,
            [requestId]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Request not found.' });
        
        if (userRole !== 'super_admin' && rows[0].requested_by_user_id !== userId) {
            return res.status(403).json({ error: 'Not authorized.' });
        }

        return res.json(rows[0]);
    } catch (err) {
        console.error('[getDownloadRequestStatus] Error:', err.message);
        return res.status(500).json({ error: 'Internal server error.' });
    }
}

/**
 * getPendingRequestsForSession
 * GET /api/app/sessions/:sessionId/download-requests
 * Mobile app calls this polling
 */
async function getPendingRequestsForSession(req, res) {
    const { sessionId } = req.params;
    try {
        const { rows } = await pool.query(
            `SELECT id, file_token 
             FROM download_requests 
             WHERE session_id = $1 AND status = 'pending' AND expires_at > NOW()`,
            [sessionId]
        );
        return res.json({ requests: rows });
    } catch (err) {
        console.error('[getPendingRequestsForSession] Error:', err.message);
        return res.status(500).json({ error: 'Internal server error.' });
    }
}

/**
 * uploadDownloadRequest
 * POST /api/app/download-requests/:requestId/upload
 * Mobile app uploads the original file content here
 */
async function uploadDownloadRequest(req, res) {
    const { requestId } = req.params;
    const { status, errorReason, base64Data } = req.body;
    // In production, base64Data might be large. A true stream upload is better,
    // but base64 works for our MVP/limitations.

    try {
        if (status === 'failed') {
            await pool.query(
                `UPDATE download_requests SET status = 'failed', error_reason = $1, updated_at = NOW() WHERE id = $2`,
                [errorReason || 'Unknown error on provider device', requestId]
            );
            return res.json({ success: true });
        }

        if (!base64Data) {
            return res.status(400).json({ error: 'Missing base64Data.' });
        }

        // Ideally, we'd save this to S3/Cloud Storage and set temp_url.
        // For this Pixo MVP, we'll store it as a massive data URI in the database
        // or a temporary file on the Render server. Let's return the data URL directly in temp_url 
        // to avoid filesystem complexity on Render, although DB size could grow. 
        // We can expire them later.
        
        const tempUrl = base64Data; // Assuming it starts with data:image/png;base64,...
        
        await pool.query(
            `UPDATE download_requests 
             SET status = 'ready', temp_url = $1, updated_at = NOW() 
             WHERE id = $2`,
            [tempUrl, requestId]
        );
        return res.json({ success: true });
    } catch (err) {
        console.error('[uploadDownloadRequest] Error:', err.message);
        return res.status(500).json({ error: 'Internal server error.' });
    }
}

module.exports = {
    requestDownload,
    getDownloadRequestStatus,
    getPendingRequestsForSession,
    uploadDownloadRequest
};
