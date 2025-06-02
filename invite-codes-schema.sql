-- Create invite_codes table
CREATE TABLE IF NOT EXISTS invite_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  uses_remaining INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code);
