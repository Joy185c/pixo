-- ============================================================
-- 005_end_to_end_fix.sql
-- ============================================================

-- 1. Add fields to requester_users
ALTER TABLE requester_users
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'frozen', 'banned', 'deleted')),
ADD COLUMN IF NOT EXISTS status_reason TEXT,
ADD COLUMN IF NOT EXISTS frozen_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 2. Add fields to shared_files
ALTER TABLE shared_files
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES requester_users(id) ON DELETE SET NULL;

-- 3. Create download_requests table
CREATE TABLE IF NOT EXISTS download_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_user_id UUID NOT NULL REFERENCES requester_users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES provider_sessions(id) ON DELETE CASCADE,
    file_token TEXT NOT NULL,
    requested_by_user_id UUID NOT NULL REFERENCES requester_users(id) ON DELETE CASCADE,
    requested_by_role TEXT NOT NULL DEFAULT 'user',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'uploading', 'ready', 'failed', 'expired')),
    temp_url TEXT,
    error_reason TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_download_requests_session_id ON download_requests(session_id);
CREATE INDEX IF NOT EXISTS idx_download_requests_file_token ON download_requests(file_token);
CREATE INDEX IF NOT EXISTS idx_download_requests_status ON download_requests(status);
