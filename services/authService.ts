import { supabase } from '@/lib/supabase';
import { OTPService } from './otpService';

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: any;
}

export interface RegisterData {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: 'vendor' | 'buyer';
}

export class AuthService {
  static async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const otpResponse = await OTPService.sendOTP(data.phone);
      if (!otpResponse.success) {
        return { success: false, message: otpResponse.message };
      }

      return {
        success: true,
        message: 'OTP sent successfully. Please verify your phone number.',
        user: data
      };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: 'Registration failed. Please try again.' };
    }
  }

  static async completeRegistration(data: RegisterData, otp: string): Promise<AuthResponse> {
    try {
      const otpVerification = await OTPService.verifyOTP(data.phone, otp);
      if (!otpVerification.success) {
        return { success: false, message: otpVerification.message };
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      });

      if (authError || !authData.user) {
        return {
          success: false,
          message: authError?.message || 'Failed to create user account'
        };
      }

      const { error: profileError } = await supabase.from('users').insert([{
        id: authData.user.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        role: data.role
      }]);

      if (profileError) {
        console.error('Profile creation error:', profileError);
        return { success: false, message: 'Failed to create user profile' };
      }

      return {
        success: true,
        message: 'Registration completed successfully!',
        user: authData.user
      };
    } catch (error) {
      console.error('Complete registration error:', error);
      return { success: false, message: 'Registration failed. Please try again.' };
    }
  }

  static async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.user) {
        return { success: false, message: error?.message || 'Login failed' };
      }

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        return { success: false, message: 'Failed to load user profile' };
      }

      return { success: true, message: 'Login successful!', user: { ...data.user, profile } };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Login failed. Please try again.' };
    }
  }

  static async logout(): Promise<AuthResponse> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) return { success: false, message: error.message };
      return { success: true, message: 'Logged out successfully' };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, message: 'Logout failed' };
    }
  }

  static async getCurrentUser() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return null;

      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      return { ...session.user, profile };
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  static async isAuthenticated(): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return !!session?.user;
    } catch {
      return false;
    }
  }
}
