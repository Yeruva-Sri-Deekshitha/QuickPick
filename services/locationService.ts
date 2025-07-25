import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase';

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export interface LocationResponse {
  success: boolean;
  message: string;
  coords?: LocationCoords;
}

export class LocationService {
  /**
   * Request location permissions
   */
  static async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Location permission error:', error);
      return false;
    }
  }

  /**
   * Get current device location
   */
  static async getCurrentLocation(): Promise<LocationResponse> {
    try {
      // Check if location services are enabled
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        return {
          success: false,
          message: 'Location services are disabled. Please enable them in settings.'
        };
      }

      // Request permissions
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return {
          success: false,
          message: 'Location permission denied. Please grant location access.'
        };
      }

      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 10,
      });

      return {
        success: true,
        message: 'Location retrieved successfully',
        coords: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        }
      };
    } catch (error) {
      console.error('Get location error:', error);
      return {
        success: false,
        message: 'Failed to get location. Please try again.'
      };
    }
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Format distance for display
   */
  static formatDistance(distance: number): string {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance.toFixed(1)}km`;
  }

  /**
   * Get location name from coordinates (reverse geocoding)
   */
  static async getLocationName(latitude: number, longitude: number): Promise<string> {
    try {
      const result = await Location.reverseGeocodeAsync({
        latitude,
        longitude
      });

      if (result.length > 0) {
        const location = result[0];
        const parts = [
          location.name,
          location.street,
          location.city,
          location.region
        ].filter(Boolean);
        
        return parts.join(', ');
      }
      
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    }
  }
}