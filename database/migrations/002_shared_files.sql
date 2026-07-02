-- ============================================================
-- Migration 002: shared_files table
-- Stores safe file metadata indexed by provider devices.
-- SECURITY: Real local file paths are NEVER stored here.
--           Only fileToken, name, mime, size, category.
-- ============================================================

CREATE TABLE IF NOT EXISTS shared_files (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id     UUID        NOT NULL REFERENCES provider_sessions(id) ON DELETE CASCADE,
    file_token     TEXT        NOT NULL UNIQUE,                 -- opaque token; provider maps this -> localUri
    file_name      TEXT        NOT NULL,                        -- original filename, e.g. IMG_001.jpg
    mime_type      TEXT        NOT NULL DEFAULT 'application/octet-stream',
    file_size      BIGINT      NOT NULL DEFAULT 0,             -- bytes
    category       TEXT        NOT NULL DEFAULT 'documents'
                       CHECK (category IN ('photos','videos','pdfs','documents','whatsapp')),
    modified_at    TIMESTAMPTZ,                                 -- file's own last-modified timestamp
    is_available   BOOLEAN     NOT NULL DEFAULT TRUE,          -- set false when session revokes/expires
    expires_at     TIMESTAMPTZ NOT NULL,                       -- mirrors parent session expires_at
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shared_files_session   ON shared_files(session_id);
CREATE INDEX IF NOT EXISTS idx_shared_files_category  ON shared_files(session_id, category);
CREATE INDEX IF NOT EXISTS idx_shared_files_token     ON shared_files(file_token);

COMMENT ON TABLE  shared_files                   IS 'Safe file metadata sent by provider. No real paths stored.';
COMMENT ON COLUMN shared_files.file_token         IS 'Opaque token. Only provider app maps this to actual localUri.';
COMMENT ON COLUMN shared_files.file_name          IS 'Display filename only. No path components.';
COMMENT ON COLUMN shared_files.is_available       IS 'Set FALSE when session expires/revokes to hide from requester.';

-- Auto-hide files when their parent session is revoked/expired
CREATE OR REPLACE FUNCTION sync_shared_files_availability()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status IN ('revoked', 'expired') AND OLD.status = 'active' THEN
        UPDATE shared_files
        SET    is_available = FALSE
        WHERE  session_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_files_availability ON provider_sessions;
CREATE TRIGGER trg_sync_files_availability
AFTER UPDATE OF status ON provider_sessions
FOR EACH ROW EXECUTE FUNCTION sync_shared_files_availability();
