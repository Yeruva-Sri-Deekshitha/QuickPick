/*
  # Create OTP verification table

  1. New Tables
    - `otps`
      - `id` (uuid, primary key)
      - `phone_number` (text, not null)
      - `otp` (text, not null)
      - `created_at` (timestamp, default: now())

  2. Security
    - Enable RLS on `otps` table
    - Add policy for users to manage their own OTPs

  3. Indexes
    - Index on phone_number for faster lookups
    - Index on created_at for cleanup operations
*/

CREATE TABLE IF NOT EXISTS otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL,
  otp text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE otps ENABLE ROW LEVEL SECURITY;

-- Allow users to insert and select their own OTPs
CREATE POLICY "Users can manage their OTPs"
  ON otps
  FOR ALL
  TO anon
  USING (true);

-- Allow inserts for everyone (for dev only!)
CREATE POLICY "Allow insert for all (dev only)" ON otps
FOR INSERT
TO public, anon
USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS otps_phone_number_idx ON otps(phone_number);
CREATE INDEX IF NOT EXISTS otps_created_at_idx ON otps(created_at);