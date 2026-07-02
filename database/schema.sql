-- ============================================================
-- Pixo Database Schema
-- "Access your files, fluently."
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLE: access_codes
-- Stores hashed Pixo Access Codes used to gate invite-link
-- creation. Only the bcrypt hash is stored — never plaintext.
-- ============================================================
CREATE TABLE IF NOT EXISTS access_codes (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    code_hash        TEXT        NOT NULL UNIQUE,          -- bcrypt hash of the access code
    label            TEXT        NOT NULL,                 -- human-readable label, e.g. "MVP Global Code"
    is_active        BOOLEAN     NOT NULL DEFAULT TRUE,    -- admin can disable without deleting
    max_link_create  INT         NOT NULL DEFAULT 100,     -- max invite links this code may create (0 = unlimited)
    used_count       INT         NOT NULL DEFAULT 0,       -- incremented each time a link is created
    expires_at       TIMESTAMPTZ,                          -- NULL = never expires
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  access_codes                IS 'Pixo Access Codes that authorise invite-link creation. Only hashes stored.';
COMMENT ON COLUMN access_codes.code_hash      IS 'bcrypt hash of the raw access code. Never store plaintext.';
COMMENT ON COLUMN access_codes.max_link_create IS '0 means unlimited link creation.';

-- ============================================================
-- TABLE: invite_links
-- Each row represents one shareable invite link (e.g. PX-8K29A).
-- Multiple provider devices can connect to the same link.
-- ============================================================
CREATE TABLE IF NOT EXISTS invite_links (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    token                   TEXT        NOT NULL UNIQUE,   -- e.g. "PX-8K29A"
    created_by_code_id      UUID        NOT NULL REFERENCES access_codes(id) ON DELETE RESTRICT,
    requester_user_id       TEXT,                          -- optional: tie to an app user later
    max_devices             INT         NOT NULL DEFAULT 50, -- max phones that can connect
    connected_devices_count INT         NOT NULL DEFAULT 0,
    status                  TEXT        NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active','expired','disabled')),
    expires_at              TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invite_links_token      ON invite_links(token);
CREATE INDEX IF NOT EXISTS idx_invite_links_status     ON invite_links(status);
CREATE INDEX IF NOT EXISTS idx_invite_links_code_id    ON invite_links(created_by_code_id);

COMMENT ON TABLE  invite_links                        IS 'Shareable invite links created after access-code verification.';
COMMENT ON COLUMN invite_links.token                  IS 'Short human-readable token shown in the app, e.g. PX-8K29A.';
COMMENT ON COLUMN invite_links.max_devices            IS 'Admin-configurable; default 50 phones per link.';
COMMENT ON COLUMN invite_links.connected_devices_count IS 'Cached count; kept in sync via trigger.';

-- ============================================================
-- TABLE: provider_sessions
-- One row per phone that opens an invite link and grants access.
-- Each session is fully independent: its own expiry, files, etc.
-- ============================================================
CREATE TABLE IF NOT EXISTS provider_sessions (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    invite_id             UUID        NOT NULL REFERENCES invite_links(id) ON DELETE CASCADE,
    provider_device_id    TEXT        NOT NULL,            -- fingerprint / unique device ID from mobile app
    provider_device_name  TEXT        NOT NULL,            -- e.g. "Samsung A52"
    provider_user_agent   TEXT,                            -- HTTP User-Agent of the provider device
    provider_ip           INET,                            -- IP at time of connection
    status                TEXT        NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active','expired','revoked')),
    allowed_permissions   JSONB       NOT NULL DEFAULT '[]',  -- e.g. ["photos","documents","videos"]
    expires_at            TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '6 months'),
    revoked_at            TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One physical device may only have ONE active session per invite link at a time
    CONSTRAINT uq_invite_device UNIQUE (invite_id, provider_device_id)
);

CREATE INDEX IF NOT EXISTS idx_provider_sessions_invite_id  ON provider_sessions(invite_id);
CREATE INDEX IF NOT EXISTS idx_provider_sessions_status     ON provider_sessions(status);
CREATE INDEX IF NOT EXISTS idx_provider_sessions_device_id  ON provider_sessions(provider_device_id);

COMMENT ON TABLE  provider_sessions                       IS 'One row per phone session opened under an invite link.';
COMMENT ON COLUMN provider_sessions.provider_device_id    IS 'Unique device fingerprint — never a phone number or PII.';
COMMENT ON COLUMN provider_sessions.allowed_permissions   IS 'JSON array of permitted file categories for this session.';
COMMENT ON COLUMN provider_sessions.expires_at            IS 'Session auto-expires 6 months after creation by default.';

-- ============================================================
-- TABLE: access_history  (audit log per session)
-- ============================================================
CREATE TABLE IF NOT EXISTS access_history (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id    UUID        NOT NULL REFERENCES provider_sessions(id) ON DELETE CASCADE,
    event_type    TEXT        NOT NULL,   -- 'connected','file_listed','file_downloaded','session_ended','revoked'
    file_path     TEXT,                  -- populated for file-level events
    metadata      JSONB,                 -- extra event data
    occurred_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_access_history_session ON access_history(session_id);
CREATE INDEX IF NOT EXISTS idx_access_history_event   ON access_history(event_type);

COMMENT ON TABLE access_history IS 'Immutable audit trail for every action taken during a provider session.';

-- ============================================================
-- TRIGGER: keep connected_devices_count in sync
-- ============================================================
CREATE OR REPLACE FUNCTION update_connected_devices_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    UPDATE invite_links
    SET connected_devices_count = (
        SELECT COUNT(*)
        FROM   provider_sessions
        WHERE  invite_id = COALESCE(NEW.invite_id, OLD.invite_id)
          AND  status = 'active'
    )
    WHERE id = COALESCE(NEW.invite_id, OLD.invite_id);
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_device_count ON provider_sessions;
CREATE TRIGGER trg_sync_device_count
AFTER INSERT OR UPDATE OF status OR DELETE ON provider_sessions
FOR EACH ROW EXECUTE FUNCTION update_connected_devices_count();

-- ============================================================
-- TRIGGER: auto-expire invite_links past their expires_at
-- (called periodically or on every read via the API)
-- ============================================================
CREATE OR REPLACE FUNCTION expire_invite_links()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    UPDATE invite_links
    SET    status = 'expired'
    WHERE  status = 'active'
      AND  expires_at < NOW();
END;
$$;

-- ============================================================
-- TRIGGER: auto-expire provider_sessions past their expires_at
-- ============================================================
CREATE OR REPLACE FUNCTION expire_provider_sessions()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    UPDATE provider_sessions
    SET    status = 'expired'
    WHERE  status = 'active'
      AND  expires_at < NOW();
END;
$$;
