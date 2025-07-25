/*
  # Enhanced QuickPick Features

  1. New Tables
    - `deal_templates` - Save frequently used deal templates
    - `customer_favorites` - Track vendor-buyer relationships
    - `order_tracking` - Enhanced order tracking with delivery details
    
  2. Enhanced Tables
    - Add tracking fields to existing `orders` table
    - Add template and notification fields to `deals` table
    
  3. Security
    - Enable RLS on all new tables
    - Add appropriate policies for vendors and buyers
    
  4. Functions
    - Revenue calculation functions
    - Customer analytics functions
*/

-- Add new columns to existing deals table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'deal_title'
  ) THEN
    ALTER TABLE deals ADD COLUMN deal_title text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'description'
  ) THEN
    ALTER TABLE deals ADD COLUMN description text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'promo_code'
  ) THEN
    ALTER TABLE deals ADD COLUMN promo_code text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'start_date'
  ) THEN
    ALTER TABLE deals ADD COLUMN start_date timestamptz DEFAULT now();
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'notify_customers'
  ) THEN
    ALTER TABLE deals ADD COLUMN notify_customers boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'repeat_buyers_only'
  ) THEN
    ALTER TABLE deals ADD COLUMN repeat_buyers_only boolean DEFAULT false;
  END IF;
END $$;

-- Add new columns to existing orders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'tracking_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN tracking_id text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'pickup_window_start'
  ) THEN
    ALTER TABLE orders ADD COLUMN pickup_window_start timestamptz;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'pickup_window_end'
  ) THEN
    ALTER TABLE orders ADD COLUMN pickup_window_end timestamptz;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'special_instructions'
  ) THEN
    ALTER TABLE orders ADD COLUMN special_instructions text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'delivery_eta'
  ) THEN
    ALTER TABLE orders ADD COLUMN delivery_eta timestamptz;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'collected_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN collected_at timestamptz;
  END IF;
END $$;

-- Create deal_templates table
CREATE TABLE IF NOT EXISTS deal_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES users(id) ON DELETE CASCADE,
  template_name text NOT NULL,
  item_name text NOT NULL,
  description text,
  discount_percent integer NOT NULL CHECK (discount_percent >= 0 AND discount_percent <= 100),
  original_price numeric(10,2) NOT NULL CHECK (original_price > 0),
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE deal_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors can manage own templates"
  ON deal_templates
  FOR ALL
  TO authenticated
  USING (auth.uid() = vendor_id)
  WITH CHECK (auth.uid() = vendor_id);

-- Create customer_favorites table
CREATE TABLE IF NOT EXISTS customer_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid REFERENCES users(id) ON DELETE CASCADE,
  vendor_id uuid REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(buyer_id, vendor_id)
);

ALTER TABLE customer_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own favorites"
  ON customer_favorites
  FOR ALL
  TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = vendor_id);

-- Create order_tracking table for detailed tracking
CREATE TABLE IF NOT EXISTS order_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  status text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id)
);

ALTER TABLE order_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Order tracking visibility"
  ON order_tracking
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      JOIN deals d ON o.deal_id = d.id
      WHERE o.id = order_tracking.order_id
      AND (o.buyer_id = auth.uid() OR d.vendor_id = auth.uid())
    )
  );

CREATE POLICY "Vendors can add tracking"
  ON order_tracking
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders o
      JOIN deals d ON o.deal_id = d.id
      WHERE o.id = order_tracking.order_id
      AND d.vendor_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS deal_templates_vendor_idx ON deal_templates(vendor_id);
CREATE INDEX IF NOT EXISTS customer_favorites_buyer_idx ON customer_favorites(buyer_id);
CREATE INDEX IF NOT EXISTS customer_favorites_vendor_idx ON customer_favorites(vendor_id);
CREATE INDEX IF NOT EXISTS order_tracking_order_idx ON order_tracking(order_id);
CREATE INDEX IF NOT EXISTS orders_purchase_date_idx ON orders(purchase_date);

-- Function to get vendor revenue summary
CREATE OR REPLACE FUNCTION get_vendor_revenue_summary(vendor_uuid uuid, period_days integer DEFAULT 30)
RETURNS TABLE (
  total_revenue numeric,
  total_orders bigint,
  avg_order_value numeric,
  period_start date,
  period_end date
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(d.discounted_price), 0) as total_revenue,
    COUNT(o.id) as total_orders,
    COALESCE(AVG(d.discounted_price), 0) as avg_order_value,
    (CURRENT_DATE - period_days)::date as period_start,
    CURRENT_DATE as period_end
  FROM orders o
  JOIN deals d ON o.deal_id = d.id
  WHERE d.vendor_id = vendor_uuid
    AND o.status IN ('collected', 'reserved')
    AND o.purchase_date >= (CURRENT_DATE - period_days);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get repeat buyers for a vendor
CREATE OR REPLACE FUNCTION get_vendor_repeat_buyers(vendor_uuid uuid)
RETURNS TABLE (
  buyer_id uuid,
  buyer_name text,
  buyer_phone text,
  total_orders bigint,
  total_spent numeric,
  last_order_date timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id as buyer_id,
    u.name as buyer_name,
    u.phone as buyer_phone,
    COUNT(o.id) as total_orders,
    COALESCE(SUM(d.discounted_price), 0) as total_spent,
    MAX(o.purchase_date) as last_order_date
  FROM users u
  JOIN orders o ON u.id = o.buyer_id
  JOIN deals d ON o.deal_id = d.id
  WHERE d.vendor_id = vendor_uuid
    AND o.status IN ('collected', 'reserved')
  GROUP BY u.id, u.name, u.phone
  HAVING COUNT(o.id) > 1
  ORDER BY total_orders DESC, total_spent DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get daily revenue for charts
CREATE OR REPLACE FUNCTION get_vendor_daily_revenue(vendor_uuid uuid, days_back integer DEFAULT 30)
RETURNS TABLE (
  date date,
  revenue numeric,
  order_count bigint
) AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(
      CURRENT_DATE - days_back,
      CURRENT_DATE,
      '1 day'::interval
    )::date as date
  )
  SELECT 
    ds.date,
    COALESCE(SUM(d.discounted_price), 0) as revenue,
    COUNT(o.id) as order_count
  FROM date_series ds
  LEFT JOIN orders o ON ds.date = o.purchase_date::date
  LEFT JOIN deals d ON o.deal_id = d.id AND d.vendor_id = vendor_uuid
  WHERE o.status IS NULL OR o.status IN ('collected', 'reserved')
  GROUP BY ds.date
  ORDER BY ds.date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;