import { supabase } from '@/lib/supabase';
import { LocationCoords } from './locationService';

export interface Deal {
  id: string;
  vendor_id: string;
  item_name: string;
  quantity: number;
  discount_percent: number;
  original_price: number;
  discounted_price: number;
  expiry_time: string;
  image_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  deal_title?: string;
  description?: string;
  start_date: string;
  latitude: number;
  longitude: number;
  location_name?: string;
  shop_name?: string;
  distance_km: number;
}

export interface DealResponse {
  success: boolean;
  message: string;
  deal?: Deal;
  deals?: Deal[];
}

export class DealService {
  /**
   * GET nearby deals using Supabase stored procedure
   */
  static async getNearbyDeals(userLocation: LocationCoords, radius = 5): Promise<DealResponse> {
    try {
      const { data, error } = await supabase.rpc('get_nearby_deals', {
        user_latitude: userLocation.latitude,
        user_longitude: userLocation.longitude,
        radius_meters: radius * 1000
      });

      if (error) {
        console.error('Get nearby deals error:', error);
        return { success: false, message: 'Failed to load nearby deals' };
      }

      // Map the response to the Deal interface
      const deals = (data || []).map((deal: any) => ({
        id: deal.id,
        vendor_id: deal.vendor_id,
        item_name: deal.item_name,
        quantity: deal.quantity,
        discount_percent: deal.discount_percent,
        original_price: deal.original_price,
        discounted_price: deal.discounted_price,
        expiry_time: deal.expiry_time,
        image_url: deal.image_url,
        status: deal.status,
        created_at: deal.created_at,
        updated_at: deal.updated_at,
        deal_title: deal.deal_title,
        description: deal.description,
        start_date: deal.start_date,
        latitude: deal.latitude,
        longitude: deal.longitude,
        location_name: deal.location_name,
        shop_name: deal.shop_name,
        distance_km: deal.distance_km,
      }));

      return { success: true, message: 'Nearby deals loaded successfully', deals };
    } catch (error) {
      console.error('Unexpected error in getNearbyDeals:', error);
      return { success: false, message: 'Unexpected error while loading nearby deals' };
    }
  }

  /**
   * CREATE new deal
   */
  static async createDeal(dealData: any): Promise<DealResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, message: 'User not authenticated' };

      // Calculate discounted price
      const discounted_price = dealData.original_price * (1 - dealData.discount_percent / 100);

      const { data, error } = await supabase
        .from('deals')
        .insert([{
          vendor_id: user.id,
          deal_title: dealData.deal_title,
          item_name: dealData.item_name,
          description: dealData.description,
          quantity: dealData.quantity,
          discount_percent: dealData.discount_percent,
          original_price: dealData.original_price,
          discounted_price,
          start_date: dealData.start_date,
          expiry_time: dealData.expiry_time,
          image_url: dealData.image_url,
          latitude: dealData.latitude,
          longitude: dealData.longitude,
          location_name: dealData.location_name
        }])
        .select()
        .single();

      if (error) {
        console.error('Create deal error:', error);
        return { success: false, message: 'Failed to create deal' };
      }

      return { success: true, message: 'Deal created successfully!', deal: data };
    } catch (error) {
      console.error('Unexpected error in createDeal:', error);
      return { success: false, message: 'Unexpected error while creating deal' };
    }
  }

  /**
   * GET all vendor's deals
   */
  static async getVendorDeals(): Promise<DealResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, message: 'User not authenticated' };

      const { data, error } = await supabase
        .from('deals')
        .select('*, users!deals_vendor_id_fkey(name)')
        .eq('vendor_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Get vendor deals error:', error);
        return { success: false, message: 'Failed to load deals' };
      }

      const formattedDeals = data?.map(deal => ({
        ...deal,
        vendor_name: deal.users?.name
      })) || [];

      return { success: true, message: 'Deals loaded successfully', deals: formattedDeals };
    } catch (error) {
      console.error('Unexpected error in getVendorDeals:', error);
      return { success: false, message: 'Failed to load deals' };
    }
  }

  /**
   * UPDATE deal status
   */
  static async updateDealStatus(dealId: string, status: 'active' | 'sold' | 'expired'): Promise<DealResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, message: 'User not authenticated' };

      const { data, error } = await supabase
        .from('deals')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', dealId)
        .eq('vendor_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Update deal status error:', error);
        return { success: false, message: error.message || 'Failed to update deal status' };
      }

      return { success: true, message: 'Deal status updated successfully', deal: data };
    } catch (error) {
      console.error('Unexpected error in updateDealStatus:', error);
      return { success: false, message: 'Failed to update deal status' };
    }
  }

  /**
   * DELETE a deal
   */
  static async deleteDeal(dealId: string): Promise<DealResponse> {
    try {
      const { error } = await supabase.from('deals').delete().eq('id', dealId);
      if (error) return { success: false, message: 'Failed to delete deal' };
      return { success: true, message: 'Deal deleted successfully' };
    } catch (error) {
      console.error('Delete deal error:', error);
      return { success: false, message: 'Failed to delete deal' };
    }
  }

  /**
   * GET a deal by ID
   */
  static async getDealById(dealId: string): Promise<DealResponse> {
    try {
      const { data, error } = await supabase
        .from('deals')
        .select('*, users!deals_vendor_id_fkey(name)')
        .eq('id', dealId)
        .single();

      if (error) return { success: false, message: 'Deal not found' };

      const deal = { ...data, vendor_name: data.users?.name };
      return { success: true, message: 'Deal loaded successfully', deal };
    } catch (error) {
      console.error('Get deal by ID error:', error);
      return { success: false, message: 'Failed to load deal' };
    }
  }

  /**
   * Subscribe to real-time deal updates
   */
  static subscribeToDeals(callback: (payload: any) => void) {
    return supabase
      .channel('deals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deals' }, callback)
      .subscribe();
  }

  /**
   * Utility: Check if a deal is expired
   */
  static isDealExpired(expiryTime: string): boolean {
    return new Date(expiryTime) <= new Date();
  }

  /**
   * Utility: Get time remaining for a deal
   */
  static getTimeRemaining(expiryTime: string) {
    const total = Date.parse(expiryTime) - Date.now();
    if (total <= 0) return { hours: 0, minutes: 0, seconds: 0, total: 0 };

    const seconds = Math.floor((total / 1000) % 60);
    const minutes = Math.floor((total / 1000 / 60) % 60);
    const hours = Math.floor(total / (1000 * 60 * 60));
    return { hours, minutes, seconds, total };
  }
}