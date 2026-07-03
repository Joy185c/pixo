-- ============================================================
-- Migration 004: Fix invite_links schema
-- Drop NOT NULL constraint on created_by_code_id since users
-- can now create links directly without an access code via JWT.
-- ============================================================

ALTER TABLE invite_links ALTER COLUMN created_by_code_id DROP NOT NULL;
