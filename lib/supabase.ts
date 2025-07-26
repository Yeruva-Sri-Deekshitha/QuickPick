import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl ?? '';
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey ?? '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string;
          role: 'vendor' | 'buyer';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          phone: string;
          role: 'vendor' | 'buyer';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          phone?: string;
          role?: 'vendor' | 'buyer';
          created_at?: string;
          updated_at?: string;
        };
      };
      deals: {
        Row: {
          id: string;
          vendor_id: string;
          item_name: string;
          quantity: number;
          quantity_unit: string;
          remaining_quantity: number;
          discount_percent: number;
          original_price: number;
          discounted_price: number;
          expiry_time: string;
          latitude: number;
          longitude: number;
          location_name: string | null;
          image_url: string | null;
          status: 'active' | 'sold' | 'expired';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          vendor_id: string;
          item_name: string;
          quantity: number;
          quantity_unit?: string;
          remaining_quantity?: number;
          discount_percent: number;
          original_price: number;
          discounted_price: number;
          expiry_time: string;
          latitude: number;
          longitude: number;
          location_name?: string | null;
          image_url?: string | null;
          status?: 'active' | 'sold' | 'expired';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          vendor_id?: string;
          item_name?: string;
          quantity?: number;
          quantity_unit?: string;
          remaining_quantity?: number;
          discount_percent?: number;
          original_price?: number;
          discounted_price?: number;
          expiry_time?: string;
          latitude?: number;
          longitude?: number;
          location_name?: string | null;
          image_url?: string | null;
          status?: 'active' | 'sold' | 'expired';
          created_at?: string;
          updated_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          buyer_id: string;
          deal_id: string;
          status: 'reserved' | 'collected' | 'missed' | 'expired';
          purchase_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          buyer_id: string;
          deal_id: string;
          status?: 'reserved' | 'collected' | 'missed' | 'expired';
          purchase_date?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          buyer_id?: string;
          deal_id?: string;
          status?: 'reserved' | 'collected' | 'missed' | 'expired';
          purchase_date?: string;
          created_at?: string;
        };
      };
      otps: {
        Row: {
          id: string;
          phone_number: string;
          otp: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          phone_number: string;
          otp: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          phone_number?: string;
          otp?: string;
          created_at?: string;
        };
      };
    };
  };
};