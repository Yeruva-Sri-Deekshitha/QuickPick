import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

export interface ImageUploadResponse {
  success: boolean;
  message: string;
  url?: string;
}

export class ImageService {
  /**
   * Request camera and media library permissions
   */
  static async requestPermissions(): Promise<boolean> {
    try {
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      return cameraPermission.status === 'granted' && mediaPermission.status === 'granted';
    } catch (error) {
      console.error('Permission request error:', error);
      return false;
    }
  }

  /**
   * Pick image from camera or gallery
   */
  static async pickImage(useCamera: boolean = false): Promise<ImagePicker.ImagePickerResult | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return null;
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      };

      let result;
      if (useCamera) {
        result = await ImagePicker.launchCameraAsync(options);
      } else {
        result = await ImagePicker.launchImageLibraryAsync(options);
      }

      return result;
    } catch (error) {
      console.error('Image picker error:', error);
      return null;
    }
  }

  /**
   * Upload image to Supabase Storage
   */
  static async uploadImage(uriOrFile: string | File): Promise<ImageUploadResponse> {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Uploading as user:', user);
      if (!user) {
        return { success: false, message: 'User not authenticated' };
      }

      // Create unique filename
      const fileExt = typeof uriOrFile === 'string'
        ? uriOrFile.split('.').pop()?.split('?')[0]
        : (uriOrFile as File).name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // React Native/Expo: Use FormData + fetch for local files
      if (typeof uriOrFile === 'string' && uriOrFile.startsWith('file://')) {
        const formData = new FormData();
        formData.append('file', {
          uri: uriOrFile,
          name: fileName,
          type: `image/${fileExt}`,
        });

        // Get the current session/access token
        const session = await supabase.auth.getSession();
        const accessToken = session.data.session?.access_token;
        const response = await fetch(
          `https://zxxpdxgrqbsxioyzmolm.supabase.co/storage/v1/object/vendor-images/${fileName}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4eHBkeGdycWJzeGlveXptb2xtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxNzUzNjEsImV4cCI6MjA2ODc1MTM2MX0.Ex-0YxgYTcDZCxRevq4YVInl5HcvOAj_aYpxjbHoaZc',
            },
            body: formData,
          }
        );
        if (!response.ok) {
          const errorText = await response.text();
          return { success: false, message: `Failed to upload image: ${errorText}` };
        }
        // Get public URL
        const publicUrl = `https://zxxpdxgrqbsxioyzmolm.supabase.co/storage/v1/object/public/vendor-images/${fileName}`;
        return {
          success: true,
          message: 'Image uploaded successfully',
          url: publicUrl,
        };
      }

      // Web/remote URLs: Use supabase-js
      let uploadData: any = null;
      if (typeof uriOrFile === 'string') {
        // For remote URLs
        const response = await fetch(uriOrFile);
        uploadData = await response.blob();
      } else {
        // For web File object
        uploadData = uriOrFile;
      }

      if (!uploadData) return { success: false, message: 'No upload data' };
      const { data, error } = await supabase.storage
        .from('vendor-images')
        .upload(fileName, uploadData, {
          cacheControl: '3600',
          upsert: false,
          contentType: `image/${fileExt}`,
        });
      console.log('Upload result:', { data, error });

      if (error) {
        return { success: false, message: `Failed to upload image: ${error.message || error}` };
      }

      // Get public URL
      const { data: publicData } = supabase.storage
        .from('vendor-images')
        .getPublicUrl(data.path);

      return {
        success: true,
        message: 'Image uploaded successfully',
        url: publicData.publicUrl,
      };
    } catch (error) {
      return { success: false, message: `Failed to upload image: ${error}` };
    }
  }

  /**
   * Delete image from Supabase Storage
   */
  static async deleteImage(url: string): Promise<boolean> {
    try {
      // Extract file path from URL
      const urlParts = url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const userId = urlParts[urlParts.length - 2];
      const filePath = `${userId}/${fileName}`;

      const { error } = await supabase.storage
        .from('vendor-images')
        .remove([filePath]);

      if (error) {
        console.error('Delete image error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Delete image error:', error);
      return false;
    }
  }
}