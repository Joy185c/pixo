const { pool } = require('../db/pool');

const ALLOWED_CATEGORIES = new Set(['photos', 'videos', 'pdfs', 'documents', 'whatsapp']);

/**
 * indexFiles
 * POST /api/sessions/:sessionId/files/index
 *
 * Provider app calls this after file/folder selection.
 * Stores SAFE metadata only — no local paths ever sent or stored.
 *
 * Body: { files: [ { fileToken, fileName, mimeType, fileSize, category, modifiedAt } ] }
 */
async function indexFiles(req, res) {
    const sessionId = req.params.session_id || req.params.sessionId;
    const { files } = req.body;

    if (!Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ error: 'files array is required and must not be empty.' });
    }

    // Basic validation of each file object
    for (const f of files) {
        if (!f.fileToken || typeof f.fileToken !== 'string') {
            return res.status(400).json({ error: `Invalid fileToken in file entry: ${JSON.stringify(f)}` });
        }
        if (!f.fileName || typeof f.fileName !== 'string') {
            return res.status(400).json({ error: `Missing fileName for token: ${f.fileToken}` });
        }
        // Reject if fileName looks like a path (security check)
        if (f.fileName.includes('/') || f.fileName.includes('\\') || f.fileName.includes('content://') || f.fileName.includes('storage/')) {
            return res.status(400).json({ error: `File name must not contain path components. Got: ${f.fileName}` });
        }
        if (f.category && !ALLOWED_CATEGORIES.has(f.category)) {
            return res.status(400).json({ error: `Invalid category "${f.category}". Must be one of: ${[...ALLOWED_CATEGORIES].join(', ')}` });
        }
    }

    // Verify session is active
    let sessionRow;
    try {
        const { rows } = await pool.query(
            `SELECT id, status, expires_at, requester_user_id FROM provider_sessions WHERE id = $1`,
            [sessionId]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Session not found.' });
        sessionRow = rows[0];
    } catch (err) {
        console.error('[indexFiles] DB error checking session:', err.message);
        return res.status(500).json({ error: 'Internal server error.' });
    }

    if (sessionRow.status !== 'active') {
        return res.status(403).json({ error: `Cannot index files: session is ${sessionRow.status}.` });
    }

    let client;
    try {
        client = await pool.connect();
    } catch (connErr) {
        console.error('[indexFiles] DB connection failed:', connErr.message);
        return res.status(503).json({ error: 'Database temporarily unavailable.' });
    }

    try {
        await client.query('BEGIN');

        // Upsert each file (ON CONFLICT on file_token → update metadata)
        let insertedCount = 0;
        for (const f of files) {
            const category  = ALLOWED_CATEGORIES.has(f.category) ? f.category : 'documents';
            const mimeType  = typeof f.mimeType === 'string' ? f.mimeType.slice(0, 128) : 'application/octet-stream';
            const fileSize  = Number(f.fileSize) || 0;
            const modifiedAt = f.modifiedAt ? new Date(f.modifiedAt) : null;

            await client.query(
                `INSERT INTO shared_files
                     (session_id, file_token, file_name, mime_type, file_size, category, modified_at, is_available, expires_at, preview_data, requester_user_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, $8, $9, $10)
                 ON CONFLICT (file_token) DO UPDATE SET
                     file_name    = EXCLUDED.file_name,
                     mime_type    = EXCLUDED.mime_type,
                     file_size    = EXCLUDED.file_size,
                     category     = EXCLUDED.category,
                     modified_at  = EXCLUDED.modified_at,
                     preview_data = EXCLUDED.preview_data,
                     is_available = TRUE`,
                [sessionId, f.fileToken, f.fileName, mimeType, fileSize, category, modifiedAt, sessionRow.expires_at, f.previewData || null, sessionRow.requester_user_id]
            );
            insertedCount++;
        }

        // Log in access_history
        await client.query(
            `INSERT INTO access_history (session_id, event_type, metadata)
             VALUES ($1, 'files_indexed', $2)`,
            [sessionId, JSON.stringify({ total_files: insertedCount })]
        );

        await client.query('COMMIT');

        console.log(`[indexFiles] Session ${sessionId}: indexed ${insertedCount} files.`);
        return res.status(201).json({
            message: `Successfully indexed ${insertedCount} file(s).`,
            sessionId,
            totalIndexed: insertedCount,
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[indexFiles] Error:', err.message);
        return res.status(500).json({ error: 'Internal server error during file indexing.' });
    } finally {
        client.release();
    }
}

/**
 * getIndexedFiles
 * GET /api/sessions/:sessionId/files?category=photos
 *
 * Requester side calls this to get real indexed file metadata.
 * Optional ?category= filter for a specific category.
 * Never returns localUri or real file paths.
 */
async function getIndexedFiles(req, res) {
    const sessionId = req.params.session_id || req.params.sessionId;
    const { category } = req.query;

    // Validate optional category filter
    if (category && !ALLOWED_CATEGORIES.has(category)) {
        return res.status(400).json({ error: `Invalid category filter. Must be one of: ${[...ALLOWED_CATEGORIES].join(', ')}` });
    }

    try {
        // Verify session exists and is active
        const { rows: sessRows } = await pool.query(
            `SELECT ps.id, ps.status, ps.provider_device_name, ps.expires_at, ps.allowed_permissions
             FROM provider_sessions ps
             WHERE ps.id = $1 AND ($2::uuid IS NULL OR ps.requester_user_id = $2::uuid)`,
            [sessionId, req.scopedUserId]
        );
        if (sessRows.length === 0) return res.status(404).json({ error: 'Session not found.' });

        const session = sessRows[0];
        if (session.status !== 'active') {
            return res.status(403).json({ error: `Session is ${session.status}. Files are no longer accessible.` });
        }

        // Fetch files — optionally filter by category
        let query = `
            SELECT
                file_token   AS "fileToken",
                file_name    AS "fileName",
                mime_type    AS "mimeType",
                file_size    AS "fileSize",
                category,
                preview_data AS "previewData",
                modified_at  AS "modifiedAt",
                created_at   AS "createdAt"
            FROM shared_files
            WHERE session_id   = $1
              AND is_available = TRUE`;
        const params = [sessionId];

        if (category) {
            query += ` AND category = $2`;
            params.push(category);
        }
        query += ` ORDER BY created_at DESC`;

        const { rows: files } = await pool.query(query, params);

        // Build category counts from DB
        const { rows: catRows } = await pool.query(
            `SELECT category, COUNT(*)::int AS count
             FROM shared_files
             WHERE session_id = $1 AND is_available = TRUE
             GROUP BY category`,
            [sessionId]
        );

        const categories = { photos: 0, videos: 0, pdfs: 0, documents: 0, whatsapp: 0 };
        for (const row of catRows) {
            if (categories.hasOwnProperty(row.category)) {
                categories[row.category] = row.count;
            }
        }

        return res.json({
            sessionId,
            deviceName: session.provider_device_name,
            status: session.status,
            expiresAt: session.expires_at,
            allowedPermissions: session.allowed_permissions,
            totalFiles: files.length,
            categories,
            files,
        });

    } catch (err) {
        console.error('[getIndexedFiles] Error:', err.message);
        return res.status(500).json({ error: 'Internal server error.' });
    }
}

/**
 * getUserFileSummary
 * GET /api/admin/files/summary              — platform-wide counts
 * GET /api/admin/users/:userId/files/summary — per-user counts
 */
async function getUserFileSummary(req, res) {
    const userId = req.params.userId || null;
    try {
        const { rows } = await pool.query(`
            SELECT
                COUNT(*)::int                                          AS "totalFiles",
                COUNT(*) FILTER (WHERE category = 'photos')::int      AS photos,
                COUNT(*) FILTER (WHERE category = 'videos')::int      AS videos,
                COUNT(*) FILTER (WHERE category = 'pdfs')::int        AS pdfs,
                COUNT(*) FILTER (WHERE category = 'documents')::int   AS documents,
                COUNT(*) FILTER (WHERE category = 'whatsapp')::int    AS whatsapp
            FROM shared_files
            WHERE is_available = TRUE
              AND ($1::uuid IS NULL OR requester_user_id = $1::uuid)
        `, [userId]);
        return res.json({ userId, summary: rows[0] });
    } catch (err) {
        console.error('[getUserFileSummary] Error:', err.message);
        return res.status(500).json({ error: 'Internal server error.' });
    }
}

/**
 * getUserFiles
 * GET /api/admin/users/:userId/files?category=photos&limit=250&offset=0
 */
async function getUserFiles(req, res) {
    const userId = req.params.userId;
    const { category } = req.query;
    const limit  = Math.min(parseInt(req.query.limit)  || 250, 500);
    const offset = parseInt(req.query.offset) || 0;

    if (category && !ALLOWED_CATEGORIES.has(category)) {
        return res.status(400).json({ error: `Invalid category. Must be one of: ${[...ALLOWED_CATEGORIES].join(', ')}` });
    }

    try {
        const baseParams = [userId];
        let catClause = '';
        if (category) { catClause = ` AND category = $2`; baseParams.push(category); }
        const baseWhere = `WHERE is_available = TRUE AND requester_user_id = $1::uuid${catClause}`;

        const { rows: files } = await pool.query(`
            SELECT
                file_token   AS "fileToken",
                file_name    AS "fileName",
                mime_type    AS "mimeType",
                file_size    AS "fileSize",
                category,
                preview_data AS "previewData",
                modified_at  AS "modifiedAt",
                created_at   AS "createdAt",
                session_id   AS "sessionId"
            FROM shared_files ${baseWhere}
            ORDER BY created_at DESC
            LIMIT $${baseParams.length + 1} OFFSET $${baseParams.length + 2}
        `, [...baseParams, limit, offset]);

        const { rows: countRows } = await pool.query(
            `SELECT COUNT(*)::int AS total FROM shared_files ${baseWhere}`, baseParams
        );
        const total = countRows[0]?.total || 0;

        const { rows: catRows } = await pool.query(`
            SELECT category, COUNT(*)::int AS count FROM shared_files
            WHERE is_available = TRUE AND requester_user_id = $1::uuid GROUP BY category
        `, [userId]);
        const categories = { photos: 0, videos: 0, pdfs: 0, documents: 0, whatsapp: 0 };
        for (const row of catRows) { if (categories.hasOwnProperty(row.category)) categories[row.category] = row.count; }

        return res.json({ files, total, limit, offset, hasMore: offset + limit < total, categories });
    } catch (err) {
        console.error('[getUserFiles] Error:', err.message);
        return res.status(500).json({ error: 'Internal server error.' });
    }
}

module.exports = { indexFiles, getIndexedFiles, getUserFileSummary, getUserFiles };
