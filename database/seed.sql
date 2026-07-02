-- ============================================================
-- Pixo Seed — Initial Access Code
-- ============================================================
-- Raw code:  pixoaccess26
-- Hash below was generated with bcrypt (cost=12):
--   node -e "const b=require('bcryptjs');b.hash('pixoaccess26',12).then(console.log)"
--
-- IMPORTANT: Re-generate this hash yourself before deploying.
-- Never commit the plaintext code to source control.
-- ============================================================

-- Insert the hashed MVP access code
-- (Replace the hash below with one freshly generated on your machine)
INSERT INTO access_codes (
    code_hash,
    label,
    is_active,
    max_link_create,
    expires_at
)
VALUES (
    -- bcrypt hash of "pixoaccess26" — REPLACE in production
    '$2b$12$PLACEHOLDER_REPLACE_WITH_REAL_BCRYPT_HASH_OF_pixoaccess26',
    'MVP Global Access Code',
    TRUE,
    0,       -- 0 = unlimited link creation for now
    NULL     -- no expiry for MVP
)
ON CONFLICT (code_hash) DO NOTHING;
