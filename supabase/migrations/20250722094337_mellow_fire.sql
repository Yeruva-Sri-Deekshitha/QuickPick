/*
  # QuickPick Database Schema

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `email` (text, unique, not null)
      - `phone` (text, unique, not null)
      - `role` (text, not null, check: vendor or buyer)
      - `created_at` (timestamp, default: now())
      - `updated_at` (timestamp, default: now())

    - `deals`
      - `id` (uuid, primary key)
      - `vendor_id` (uuid, foreign key to users)
      - `item_name` (text, not null)
      - `quantity` (integer, not null)
      - `discount_percent` (integer, not null)
      - `original_price` (decimal, not null)
      - `discounted_price` (decimal, not null)
      - `expiry_time` (timestamp, not null)
      - `latitude` (decimal, not null)
      - `longitude` (decimal, not null)
      - `location_name` (text)
      - `image_url` (text)
      - `status` (text, default: 'active', check: active, sold, expired)
      - `created_at` (timestamp, default: now())
      - `updated_at` (timestamp, default: now())

    - `orders`
      - `id` (uuid, primary key)
      - `buyer_id` (uuid, foreign key to users)
      - `deal_id` (uuid, foreign key to deals)
      - `status` (text, default: 'reserved', check: reserved, collected, missed, expired)
      - `purchase_date` (timestamp, default: now())
      - `created_at` (timestamp, default: now())

  2. Security
    - Enable RLS on all tables
    - Add policies for role-based access
    - Users can only access their own data
    - Buyers can view active deals
    - Vendors can manage their own deals

  3. Indexes
    - Index on deals latitude/longitude for geolocation queries
    - Index on deals expiry_time for filtering
    - Index on deals status for active deal queries
*/

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('vendor', 'buyer')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Deals table
CREATE TABLE IF NOT EXISTS deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES users(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  discount_percent integer NOT NULL CHECK (discount_percent >= 0 AND discount_percent <= 100),
  original_price decimal(10,2) NOT NULL CHECK (original_price > 0),
  discounted_price decimal(10,2) NOT NULL CHECK (discounted_price > 0),
  expiry_time timestamptz NOT NULL,
  latitude decimal(10,8) NOT NULL,
  longitude decimal(11,8) NOT NULL,
  location_name text,
  image_url text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'sold', 'expired')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid REFERENCES users(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE,
  status text DEFAULT 'reserved' CHECK (status IN ('reserved', 'collected', 'missed', 'expired')),
  purchase_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Deals policies
CREATE POLICY "Anyone can view active deals"
  ON deals FOR SELECT
  TO authenticated
  USING (status = 'active' AND expiry_time > now());

CREATE POLICY "Vendors can insert own deals"
  ON deals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = vendor_id);

CREATE POLICY "Vendors can update own deals"
  ON deals FOR UPDATE
  TO authenticated
  USING (auth.uid() = vendor_id);

CREATE POLICY "Vendors can delete own deals"
  ON deals FOR DELETE
  TO authenticated
  USING (auth.uid() = vendor_id);

-- Orders policies
CREATE POLICY "Buyers can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (auth.uid() = buyer_id);

CREATE POLICY "Buyers can insert own orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Buyers can update own orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (auth.uid() = buyer_id);

-- Vendors can view orders for their deals
CREATE POLICY "Vendors can view orders for their deals"
  ON orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM deals 
      WHERE deals.id = orders.deal_id 
      AND deals.vendor_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS deals_location_idx ON deals(latitude, longitude);
CREATE INDEX IF NOT EXISTS deals_expiry_idx ON deals(expiry_time);
CREATE INDEX IF NOT EXISTS deals_status_idx ON deals(status);
CREATE INDEX IF NOT EXISTS deals_vendor_idx ON deals(vendor_id);
CREATE INDEX IF NOT EXISTS orders_buyer_idx ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS orders_deal_idx ON orders(deal_id);

-- Function to calculate distance between two points (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 decimal, lon1 decimal, lat2 decimal, lon2 decimal
) RETURNS decimal AS $$
DECLARE
  R decimal := 6371; -- Earth's radius in kilometers
  dLat decimal;
  dLon decimal;
  a decimal;
  c decimal;
BEGIN
  dLat := radians(lat2 - lat1);
  dLon := radians(lon2 - lon1);
  
  a := sin(dLat/2) * sin(dLat/2) + 
       cos(radians(lat1)) * cos(radians(lat2)) * 
       sin(dLon/2) * sin(dLon/2);
  
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  
  RETURN R * c;
END;
$$ LANGUAGE plpgsql;

-- Function to get nearby deals within radius
CREATE OR REPLACE FUNCTION get_nearby_deals(
  user_lat decimal, 
  user_lon decimal, 
  radius_km decimal DEFAULT 5
) RETURNS TABLE (
  id uuid,
  vendor_id uuid,
  item_name text,
  quantity integer,
  discount_percent integer,
  original_price decimal,
  discounted_price decimal,
  expiry_time timestamptz,
  latitude decimal,
  longitude decimal,
  location_name text,
  image_url text,
  status text,
  distance decimal,
  vendor_name text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.vendor_id,
    d.item_name,
    d.quantity,
    d.discount_percent,
    d.original_price,
    d.discounted_price,
    d.expiry_time,
    d.latitude,
    d.longitude,
    d.location_name,
    d.image_url,
    d.status,
    calculate_distance(user_lat, user_lon, d.latitude, d.longitude) as distance,
    u.name as vendor_name
  FROM deals d
  JOIN users u ON d.vendor_id = u.id
  WHERE d.status = 'active' 
    AND d.expiry_time > now()
    AND calculate_distance(user_lat, user_lon, d.latitude, d.longitude) <= radius_km
  ORDER BY distance ASC;
END;
$$ LANGUAGE plpgsql;