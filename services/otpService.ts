import { supabase } from '@/lib/supabase';

export interface OTPResponse {
  success: boolean;
  message: string;
  otp?: string;
}

export interface VerifyOTPResponse {
  success: boolean;
  message: string;
}

export class OTPService {
  /**
   * Generate and store OTP for the given phone number
   */
  static async sendOTP(phone: string): Promise<OTPResponse> {
    try {
      // Validate phone number
      if (!phone || phone.length < 10) {
        return {
          success: false,
          message: 'Please enter a valid phone number'
        };
      }

      // Clean up old OTPs for this phone number
      await supabase
        .from('otps')
        .delete()
        .eq('phone_number', phone);

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Store OTP in Supabase
      const { error } = await supabase
        .from('otps')
        .insert([{ 
          phone_number: phone, 
          otp: otp 
        }]);

      if (error) {
        console.error('Error storing OTP:', error);
        return {
          success: false,
          message: 'Failed to generate OTP. Please try again.'
        };
      }

      // Display OTP in console for testing
      console.log(`🔐 OTP for ${phone}: ${otp}`);
      
      return {
        success: true,
        message: 'OTP generated successfully. Check console for testing.',
        otp: otp // Include OTP in response for testing
      };

    } catch (error) {
      console.error('Error in sendOTP:', error);
      return {
        success: false,
        message: 'Something went wrong. Please try again.'
      };
    }
  }

  /**
   * Verify OTP for the given phone number
   */
  static async verifyOTP(phone: string, enteredOtp: string): Promise<VerifyOTPResponse> {
    try {
      // Validate inputs
      if (!phone || !enteredOtp) {
        return {
          success: false,
          message: 'Phone number and OTP are required'
        };
      }

      // Fetch the latest OTP for this phone number
      const { data: otpRecords, error } = await supabase
        .from('otps')
        .select('*')
        .eq('phone_number', phone)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching OTP:', error);
        return {
          success: false,
          message: 'Failed to verify OTP. Please try again.'
        };
      }

      if (!otpRecords || otpRecords.length === 0) {
        return {
          success: false,
          message: 'No OTP found. Please request a new OTP.'
        };
      }

      const otpRecord = otpRecords[0];

      // Check if OTP is expired (5 minutes = 300,000 milliseconds)
      const otpCreatedAt = new Date(otpRecord.created_at).getTime();
      const currentTime = new Date().getTime();
      const timeDifference = currentTime - otpCreatedAt;
      const fiveMinutesInMs = 5 * 60 * 1000;

      if (timeDifference > fiveMinutesInMs) {
        // Clean up expired OTP
        await supabase
          .from('otps')
          .delete()
          .eq('id', otpRecord.id);

        return {
          success: false,
          message: 'OTP has expired. Please request a new OTP.'
        };
      }

      // Verify OTP
      if (otpRecord.otp !== enteredOtp) {
        return {
          success: false,
          message: 'Invalid OTP. Please check and try again.'
        };
      }

      // OTP is valid - clean up used OTP
      await supabase
        .from('otps')
        .delete()
        .eq('id', otpRecord.id);

      return {
        success: true,
        message: 'OTP verified successfully!'
      };

    } catch (error) {
      console.error('Error in verifyOTP:', error);
      return {
        success: false,
        message: 'Something went wrong. Please try again.'
      };
    }
  }

  /**
   * Clean up expired OTPs (utility method)
   */
  static async cleanupExpiredOTPs(): Promise<void> {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      await supabase
        .from('otps')
        .delete()
        .lt('created_at', fiveMinutesAgo);

    } catch (error) {
      console.error('Error cleaning up expired OTPs:', error);
    }
  }
}