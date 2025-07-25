import { supabase } from '@/lib/supabase';

export interface Order {
  id: string;
  buyer_id: string;
  deal_id: string;
  status: 'reserved' | 'collected' | 'missed' | 'expired';
  purchase_date: string;
  created_at: string;
  deal?: any;
  vendor_name?: string;
  tracking_id?: string;
  pickup_window_start?: string;
  pickup_window_end?: string;
  special_instructions?: string;
  delivery_eta?: string;
  collected_at?: string;
  buyer_details?: {
    name: string;
    phone: string;
    email: string;
  };
}

export interface OrderResponse {
  success: boolean;
  message: string;
  order?: Order;
  orders?: Order[];
}

export class OrderService {
  /**
   * Create a new order (reserve a deal)
   */
  static async createOrder(dealId: string): Promise<OrderResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return {
          success: false,
          message: 'User not authenticated'
        };
      }

      // Check if user already has an order for this deal
      const { data: existingOrder } = await supabase
        .from('orders')
        .select('id')
        .eq('buyer_id', user.id)
        .eq('deal_id', dealId)
        .single();

      if (existingOrder) {
        return {
          success: false,
          message: 'You have already reserved this deal'
        };
      }

      // Create the order
      const { data, error } = await supabase
        .from('orders')
        .insert([{
          buyer_id: user.id,
          deal_id: dealId,
          status: 'reserved'
        }])
        .select()
        .single();

      if (error) {
        console.error('Create order error:', error);
        return {
          success: false,
          message: 'Failed to reserve deal'
        };
      }

      return {
        success: true,
        message: 'Deal reserved successfully!',
        order: data
      };
    } catch (error) {
      console.error('Create order error:', error);
      return {
        success: false,
        message: 'Failed to reserve deal'
      };
    }
  }

  /**
   * Get buyer's orders
   */
  static async getBuyerOrders(): Promise<OrderResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return {
          success: false,
          message: 'User not authenticated'
        };
      }

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          deals!orders_deal_id_fkey(
            id,
            item_name,
            discount_percent,
            original_price,
            discounted_price,
            expiry_time,
            image_url,
            vendor_id,
            users!deals_vendor_id_fkey(name)
          )
        `)
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Get buyer orders error:', error);
        return {
          success: false,
          message: 'Failed to load orders'
        };
      }

      // Format the data
      const orders = data?.map(order => ({
        ...order,
        deal: order.deals,
        vendor_name: order.deals?.users?.name
      })) || [];

      return {
        success: true,
        message: 'Orders loaded successfully',
        orders
      };
    } catch (error) {
      console.error('Get buyer orders error:', error);
      return {
        success: false,
        message: 'Failed to load orders'
      };
    }
  }

  /**
   * Update order status
   */
  static async updateOrderStatus(
    orderId: string, 
    status: 'reserved' | 'collected' | 'missed' | 'expired'
  ): Promise<OrderResponse> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId)
        .select()
        .single();

      if (error) {
        console.error('Update order status error:', error);
        return {
          success: false,
          message: 'Failed to update order status'
        };
      }

      return {
        success: true,
        message: 'Order status updated successfully',
        order: data
      };
    } catch (error) {
      console.error('Update order status error:', error);
      return {
        success: false,
        message: 'Failed to update order status'
      };
    }
  }

  /**
   * Get vendor's orders (orders for their deals)
   */
  static async getVendorOrders(): Promise<OrderResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return {
          success: false,
          message: 'User not authenticated'
        };
      }

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          deals!orders_deal_id_fkey(
            id,
            item_name,
            discount_percent,
            original_price,
            discounted_price,
            expiry_time,
            image_url,
            vendor_id
          ),
          users!orders_buyer_id_fkey(name, phone)
        `)
        .eq('deals.vendor_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Get vendor orders error:', error);
        return {
          success: false,
          message: 'Failed to load orders'
        };
      }

      return {
        success: true,
        message: 'Orders loaded successfully',
        orders: data || []
      };
    } catch (error) {
      console.error('Get vendor orders error:', error);
      return {
        success: false,
        message: 'Failed to load orders'
      };
    }
  }

  /**
   * Get order details by ID
   */
  static async getOrderById(orderId: string): Promise<OrderResponse> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          deals!orders_deal_id_fkey(
            id,
            item_name,
            deal_title,
            description,
            discount_percent,
            original_price,
            discounted_price,
            expiry_time,
            image_url,
            vendor_id,
            users!deals_vendor_id_fkey(name, phone)
          ),
          users!orders_buyer_id_fkey(name, phone, email)
        `)
        .eq('id', orderId)
        .single();

      if (error) {
        console.error('Get order details error:', error);
        return {
          success: false,
          message: 'Order not found'
        };
      }

      const order = {
        ...data,
        deal: data.deals,
        buyer_details: data.users
      };

      return {
        success: true,
        message: 'Order details loaded successfully',
        order
      };
    } catch (error) {
      console.error('Get order details error:', error);
      return {
        success: false,
        message: 'Failed to load order details'
      };
    }
  }

  /**
   * Update order with tracking information
   */
  static async updateOrderTracking(orderId: string, trackingData: {
    tracking_id?: string;
    pickup_window_start?: string;
    pickup_window_end?: string;
    special_instructions?: string;
    delivery_eta?: string;
  }): Promise<OrderResponse> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update(trackingData)
        .eq('id', orderId)
        .select()
        .single();

      if (error) {
        console.error('Update tracking error:', error);
        return {
          success: false,
          message: 'Failed to update tracking information'
        };
      }

      return {
        success: true,
        message: 'Tracking information updated successfully',
        order: data
      };
    } catch (error) {
      console.error('Update tracking error:', error);
      return {
        success: false,
        message: 'Failed to update tracking information'
      };
    }
  }

  /**
   * Mark order as collected
   */
  static async markAsCollected(orderId: string): Promise<OrderResponse> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ 
          status: 'collected',
          collected_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select()
        .single();

      if (error) {
        console.error('Mark as collected error:', error);
        return {
          success: false,
          message: 'Failed to mark order as collected'
        };
      }

      return {
        success: true,
        message: 'Order marked as collected successfully',
        order: data
      };
    } catch (error) {
      console.error('Mark as collected error:', error);
      return {
        success: false,
        message: 'Failed to mark order as collected'
      };
    }
  }

  /**
   * Subscribe to real-time order updates
   */
  static subscribeToOrders(callback: (payload: any) => void) {
    return supabase
      .channel('orders')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'orders' 
        }, 
        callback
      )
      .subscribe();
  }
}