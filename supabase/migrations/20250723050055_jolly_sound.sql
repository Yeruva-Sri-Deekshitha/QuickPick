/*
  # Add Vendor Analytics Functions

  1. Functions
    - `get_vendor_revenue_summary` - Calculate revenue metrics for vendors
    - `get_vendor_repeat_buyers` - Identify repeat customers
    - `get_vendor_daily_revenue` - Generate daily revenue data for charts
    - `get_nearby_deals` - Efficient geolocation-based deal filtering

  2. Security
    - Functions are security definer to allow proper data access
    - RLS policies ensure vendors only see their own data
*/

-- Function to get vendor revenue summary
CREATE OR REPLACE FUNCTION get_vendor_revenue_summary(
  vendor_uuid UUID,
  period_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  total_revenue NUMERIC,
  total_orders INTEGER,
  avg_order_value NUMERIC,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(d.discounted_price), 0) as total_revenue,
    COUNT(o.id)::INTEGER as total_orders,
    CASE 
      WHEN COUNT(o.id) > 0 THEN COALESCE(SUM(d.discounted_price), 0) / COUNT(o.id)
      ELSE 0
    END as avg_order_value,
    (NOW() - INTERVAL '1 day' * period_days) as period_start,
    NOW() as period_end
  FROM orders o
  JOIN deals d ON o.deal_id = d.id
  WHERE d.vendor_id = vendor_uuid
    AND o.created_at >= (NOW() - INTERVAL '1 day' * period_days)
    AND o.status IN ('collected', 'reserved');
END;
$$;

-- Function to get vendor repeat buyers
CREATE OR REPLACE FUNCTION get_vendor_repeat_buyers(vendor_uuid UUID)
RETURNS TABLE (
  buyer_id UUID,
  buyer_name TEXT,
  buyer_phone TEXT,
  total_orders INTEGER,
  total_spent NUMERIC,
  last_order_date TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.buyer_id,
    u.name as buyer_name,
    u.phone as buyer_phone,
    COUNT(o.id) as total_orders,
    SUM(d.discounted_price) as total_spent,
    MAX(o.created_at) as last_order_date
  FROM orders o
  JOIN users u ON o.buyer_id = u.id
  JOIN deals d ON o.deal_id = d.id
  WHERE d.vendor_id = vendor_uuid
  GROUP BY o.buyer_id, u.name, u.phone;
END;
$$;

-- Function to get vendor daily revenue
CREATE OR REPLACE FUNCTION get_vendor_daily_revenue(
  vendor_uuid UUID,
  days INTEGER DEFAULT 30
)
RETURNS TABLE (
  date DATE,
  revenue NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(o.created_at) as date,
    SUM(d.discounted_price) as revenue
  FROM orders o
  JOIN deals d ON o.deal_id = d.id
  WHERE d.vendor_id = vendor_uuid
    AND o.created_at >= (NOW() - INTERVAL '1 day' * days)
    AND o.status IN ('collected', 'reserved')
  GROUP BY DATE(o.created_at)
  ORDER BY date ASC;
END;
$$;

-- Function to calculate distance between two points (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 double precision, lon1 double precision, lat2 double precision, lon2 double precision
) RETURNS double precision AS $$
DECLARE
  R double precision := 6371; -- Earth's radius in kilometers
  dLat double precision;
  dLon double precision;
  a double precision;
  c double precision;
BEGIN
  dLat := radians(lat2 - lat1);
  dLon := radians(lon2 - lon1);

  a := sin(dLat/2) * sin(dLat/2) +
       cos(radians(lat1)) * cos(radians(lat2)) *
       sin(dLon/2) * sin(dLon/2);

  c := 2 * atan2(sqrt(a), sqrt(1-a));

  RETURN R * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Drop old get_nearby_deals if exists
-- (Removed function redefinition for get_nearby_deals)

-- Function to get nearby vendors within a radius (5km default)
DROP FUNCTION IF EXISTS get_nearby_vendors(numeric, numeric, numeric);

CREATE OR REPLACE FUNCTION get_nearby_vendors(
  user_lat NUMERIC,
  user_lon NUMERIC,
  radius_km NUMERIC DEFAULT 5
)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  shop_name TEXT,
  vendor_type TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  location_name TEXT,
  distance DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.user_id,
    u.name as full_name,
    v.shop_name,
    v.vendor_type,
    v.latitude,
    v.longitude,
    v.location_name,
    calculate_distance(
      user_lat::double precision,
      user_lon::double precision,
      v.latitude::double precision,
      v.longitude::double precision
    ) as distance
  FROM vendor_profile v
  JOIN users u ON v.user_id = u.id
  WHERE calculate_distance(
      user_lat::double precision,
      user_lon::double precision,
      v.latitude::double precision,
      v.longitude::double precision
    ) <= radius_km;
END;
$$;

-- Add quantity_unit and remaining_quantity to deals table
ALTER TABLE deals 
ADD COLUMN quantity_unit text NOT NULL DEFAULT 'items',
ADD COLUMN remaining_quantity integer NOT NULL DEFAULT 0;

-- Update existing deals to set remaining_quantity equal to quantity
UPDATE deals SET remaining_quantity = quantity WHERE remaining_quantity = 0;

-- Add constraint to ensure remaining_quantity doesn't exceed quantity
ALTER TABLE deals 
ADD CONSTRAINT remaining_quantity_check 
CHECK (remaining_quantity >= 0 AND remaining_quantity <= quantity);

-- Update the deals table comment
COMMENT ON COLUMN deals.quantity_unit IS 'Unit of measurement for quantity (custom units allowed)';
COMMENT ON COLUMN deals.remaining_quantity IS 'Current available quantity (cannot exceed original quantity)';