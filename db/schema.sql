-- Enable pgcrypto for UUID generation if not already present
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create users table with all required columns
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  password_hash TEXT NOT NULL,
  company_name TEXT,
  phone_number TEXT,
  profile_image_url TEXT,
  timezone TEXT,
  location TEXT,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  email_code TEXT,
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  password_reset_code TEXT,
  password_reset_expires TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add missing columns if they don't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS logged_in_status BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_online_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_offline_at TIMESTAMPTZ;

-- Add missing columns for businesses table
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS name TEXT;

-- Trigger to keep updated_at in sync
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_on_users ON users;
CREATE TRIGGER set_timestamp_on_users
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT,
  business_category TEXT,
  industry TEXT,
  description TEXT,
  logo_path TEXT,
  company_size TEXT,
  location TEXT,
  feature_preferences TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (owner_user_id)
);

DROP TRIGGER IF EXISTS set_timestamp_on_businesses ON businesses;
CREATE TRIGGER set_timestamp_on_businesses
BEFORE UPDATE ON businesses
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS business_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'guest',
  invite_status TEXT NOT NULL DEFAULT 'pending',
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, email),
  CHECK (role IN ('owner', 'admin', 'guest')),
  CHECK (invite_status IN ('pending', 'accepted', 'declined'))
);

DROP TRIGGER IF EXISTS set_timestamp_on_business_team_members ON business_team_members;
CREATE TRIGGER set_timestamp_on_business_team_members
BEFORE UPDATE ON business_team_members
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS business_payment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL DEFAULT 'free',
  plan_name TEXT NOT NULL DEFAULT 'Free',
  status TEXT NOT NULL DEFAULT 'active',
  payment_provider TEXT,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id)
);

DROP TRIGGER IF EXISTS set_timestamp_on_business_payment_plans ON business_payment_plans;
CREATE TRIGGER set_timestamp_on_business_payment_plans
BEFORE UPDATE ON business_payment_plans
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

INSERT INTO business_payment_plans (business_id, plan_id, plan_name, status)
SELECT b.id, 'free', 'Free', 'active'
  FROM businesses b
 WHERE NOT EXISTS (
   SELECT 1
     FROM business_payment_plans p
    WHERE p.business_id = b.id
 );

CREATE TABLE IF NOT EXISTS business_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  integration_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'inactive',
  settings JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, integration_key)
);

CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  preferences JSONB NOT NULL DEFAULT '{
    "theme": "dark",
    "language": "en",
    "notifications": {
      "sms": false,
      "email": true,
      "push": false
    },
    "marketing": {
      "email_opt_in": false,
      "organization_announcements": true
    },
    "accessibility": {
      "high_contrast": false,
      "reduced_motion": false,
      "large_text": false,
      "screen_reader_optimized": false
    }
  }'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

DROP TRIGGER IF EXISTS set_timestamp_on_business_integrations ON business_integrations;
CREATE TRIGGER set_timestamp_on_business_integrations
BEFORE UPDATE ON business_integrations
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_timestamp_on_user_preferences ON user_preferences;
CREATE TRIGGER set_timestamp_on_user_preferences
BEFORE UPDATE ON user_preferences
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  share_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft',
  accepting_responses BOOLEAN NOT NULL DEFAULT TRUE,
  submission_message TEXT,
  cover_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (status IN ('draft', 'active', 'archived'))
);

CREATE INDEX IF NOT EXISTS idx_forms_business_id ON forms (business_id);
CREATE INDEX IF NOT EXISTS idx_forms_share_id ON forms (share_id);

DROP TRIGGER IF EXISTS set_timestamp_on_forms ON forms;
CREATE TRIGGER set_timestamp_on_forms
BEFORE UPDATE ON forms
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

ALTER TABLE forms ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

CREATE TABLE IF NOT EXISTS form_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  question_type TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  required BOOLEAN NOT NULL DEFAULT FALSE,
  position INTEGER NOT NULL DEFAULT 0,
  settings JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    question_type IN (
      'short_text',
      'long_text',
      'email',
      'number',
      'decimal',
      'boolean',
      'date',
      'time',
      'choice_single',
      'choice_multi',
      'file',
      'rating'
    )
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_form_questions_field_key
  ON form_questions (form_id, field_key);
CREATE INDEX IF NOT EXISTS idx_form_questions_form_id
  ON form_questions (form_id);

DROP TRIGGER IF EXISTS set_timestamp_on_form_questions ON form_questions;
CREATE TRIGGER set_timestamp_on_form_questions
BEFORE UPDATE ON form_questions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS form_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  submitted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  submitted_ip INET,
  submitted_user_agent TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'submitted',
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (status IN ('submitted', 'flagged', 'spam', 'deleted'))
);

CREATE INDEX IF NOT EXISTS idx_form_responses_form_id
  ON form_responses (form_id);
CREATE INDEX IF NOT EXISTS idx_form_responses_submitted_at
  ON form_responses (submitted_at DESC);

DROP TRIGGER IF EXISTS set_timestamp_on_form_responses ON form_responses;
CREATE TRIGGER set_timestamp_on_form_responses
BEFORE UPDATE ON form_responses
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS form_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID NOT NULL REFERENCES form_responses(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES form_questions(id) ON DELETE CASCADE,
  value_text TEXT,
  value_number NUMERIC,
  value_boolean BOOLEAN,
  value_date TIMESTAMPTZ,
  value_json JSONB,
  file_path TEXT,
  file_name TEXT,
  file_size BIGINT,
  file_content_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (response_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_form_answers_response_id
  ON form_answers (response_id);
CREATE INDEX IF NOT EXISTS idx_form_answers_question_id
  ON form_answers (question_id);

DROP TRIGGER IF EXISTS set_timestamp_on_form_answers ON form_answers;
CREATE TRIGGER set_timestamp_on_form_answers
BEFORE UPDATE ON form_answers
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
