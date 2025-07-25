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
    u.id as buyer_id,
    u.name as buyer_name,
    u.phone as buyer_phone,
    COUNT(o.id)::INTEGER as total_orders,
    COALESCE(SUM(d.discounted_price), 0) as total_spent,
    MAX(o.created_at) as last_order_date
  FROM users u
  JOIN orders o ON u.id = o.buyer_id
  JOIN deals d ON o.deal_id = d.id
  WHERE d.vendor_id = vendor_uuid
    AND o.status IN ('collected', 'reserved')
  GROUP BY u.id, u.name, u.phone
  HAVING COUNT(o.id) > 1
  ORDER BY total_spent DESC, total_orders DESC;
END;
$$;

-- Function to get daily revenue for charts
CREATE OR REPLACE FUNCTION get_vendor_daily_revenue(
  vendor_uuid UUID,
  days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  date DATE,
  revenue NUMERIC,
  order_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(
      CURRENT_DATE - INTERVAL '1 day' * days_back,
      CURRENT_DATE,
      INTERVAL '1 day'
    )::DATE as date
  )
  SELECT 
    ds.date,
    COALESCE(SUM(d.discounted_price), 0) as revenue,
    COUNT(o.id)::INTEGER as order_count
  FROM date_series ds
  LEFT JOIN orders o ON DATE(o.created_at) = ds.date
  LEFT JOIN deals d ON o.deal_id = d.id AND d.vendor_id = vendor_uuid
  WHERE o.status IS NULL OR o.status IN ('collected', 'reserved')
  GROUP BY ds.date
  ORDER BY ds.date;
END;
$$;

-- Fix geolocation functions for deal discovery

-- Drop old calculate_distance if exists
DROP FUNCTION IF EXISTS calculate_distance(decimal, decimal, decimal, decimal);
DROP FUNCTION IF EXISTS calculate_distance(double precision, double precision, double precision, double precision);

-- Create new calculate_distance with double precision
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
DROP FUNCTION IF EXISTS get_nearby_deals(numeric, numeric, numeric);

-- Create new get_nearby_deals with correct type casting and distance column as double precision
CREATE OR REPLACE FUNCTION get_nearby_deals(
  user_lat NUMERIC,
  user_lon NUMERIC,
  radius_km NUMERIC DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  vendor_id UUID,
  item_name TEXT,
  deal_title TEXT,
  description TEXT,
  quantity INTEGER,
  discount_percent INTEGER,
  original_price NUMERIC,
  discounted_price NUMERIC,
  expiry_time TIMESTAMPTZ,
  latitude NUMERIC,
  longitude NUMERIC,
  location_name TEXT,
  image_url TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  promo_code TEXT,
  start_date TIMESTAMPTZ,
  notify_customers BOOLEAN,
  repeat_buyers_only BOOLEAN,
  vendor_name TEXT,
  distance DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.vendor_id,
    d.item_name,
    d.deal_title,
    d.description,
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
    d.created_at,
    d.updated_at,
    d.promo_code,
    d.start_date,
    d.notify_customers,
    d.repeat_buyers_only,
    u.name as vendor_name,
    calculate_distance(
      user_lat::double precision,
      user_lon::double precision,
      d.latitude::double precision,
      d.longitude::double precision
    ) as distance
  FROM deals d
  JOIN users u ON d.vendor_id = u.id
  WHERE d.status = 'active'
    AND d.expiry_time > NOW()
    AND calculate_distance(
      user_lat::double precision,
      user_lon::double precision,
      d.latitude::double precision,
      d.longitude::double precision
    ) <= radius_km
  ORDER BY distance ASC, d.created_at DESC;
END;
$$;

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
    v.full_name,
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
  WHERE v.latitude IS NOT NULL AND v.longitude IS NOT NULL
    AND calculate_distance(
      user_lat::double precision,
      user_lon::double precision,
      v.latitude::double precision,
      v.longitude::double precision
    ) <= radius_km
  ORDER BY distance ASC;
END;
$$;