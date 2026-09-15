-- Separate website-only database. Apply explicitly; never migrate on requests.
CREATE TABLE IF NOT EXISTS beta_waitlist (
  email text PRIMARY KEY,
  consent_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS beta_rate_limits (
  bucket text PRIMARY KEY,
  attempts integer NOT NULL,
  expires_at timestamptz NOT NULL
);
