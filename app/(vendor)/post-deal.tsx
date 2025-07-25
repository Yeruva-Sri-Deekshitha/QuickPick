import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Image,
  KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { DealService, CreateDealData } from '@/services/dealService';
import { ImageService } from '@/services/imageService';
import { supabase } from '@/lib/supabase';
import { LocationService } from '@/services/locationService';
import {
  Camera, Image as ImageIcon, Percent, Package, Plus, Clock, Tag
} from 'lucide-react-native';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function PostDealScreen() {
  const [formData, setFormData] = useState<CreateDealData>({
    deal_title: '',
    item_name: '',
    description: '',
    quantity: 1,
    discount_percent: 10,
    original_price: 0,
    start_date: new Date().toISOString(),
    expiry_time: '',
    image_url: ''
  });

  const [loading, setLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.item_name.trim()) newErrors.item_name = 'Item name is required';
    if (formData.quantity < 1) newErrors.quantity = 'Quantity must be at least 1';
    if (formData.discount_percent < 0 || formData.discount_percent > 100) {
      newErrors.discount_percent = 'Discount must be between 0-100%';
    }
    if (formData.original_price <= 0) newErrors.original_price = 'Original price must be greater than 0';
    if (!formData.expiry_time) {
      newErrors.expiry_time = 'Expiry time is required';
    } else if (new Date(formData.expiry_time) <= new Date()) {
      newErrors.expiry_time = 'Expiry time must be in the future';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImagePick = async (useCamera: boolean = false) => {
    setImageUploading(true);
    try {
      const result = await ImageService.pickImage(useCamera);
      if (result && !result.canceled && result.assets && result.assets.length > 0 && result.assets[0].uri) {
        setPreviewUri(result.assets[0].uri); // Show local preview immediately
        const uploadResponse = await ImageService.uploadImage(result.assets[0].uri);
        console.log('Image upload result:', uploadResponse); // <--- Added log
        if (uploadResponse.success && uploadResponse.url && uploadResponse.url.startsWith('http')) {
          setFormData(prev => ({ ...prev, image_url: uploadResponse.url! }));
          // Do NOT set previewUri to Supabase URL; keep showing local preview until user picks a new image
        } else {
          Alert.alert('Upload Failed', uploadResponse.message);
          // Do NOT clear previewUri if upload fails
        }
      }
    } catch {
      Alert.alert('Error', 'Failed to process image');
    } finally {
      setImageUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      // Fetch vendor location from vendor_profile
      const { data: vendorProfile, error: profileError } = await supabase
        .from('vendor_profile')
        .select('latitude, longitude')
        .eq('user_id', (await supabase.auth.getUser()).data.user.id)
        .single();
      if (profileError || !vendorProfile || vendorProfile.latitude == null || vendorProfile.longitude == null) {
        Alert.alert('Error', 'Please set your shop location in your profile before posting a deal.');
        setLoading(false);
        return;
      }
      // Get human-readable location name
      let locationName = '';
      try {
        locationName = await LocationService.getLocationName(vendorProfile.latitude, vendorProfile.longitude);
      } catch (e) {
        Alert.alert('Error', 'Failed to get location name. Please try again.');
        setLoading(false);
        return;
      }
      const dealPayload = {
        ...formData,
        latitude: vendorProfile.latitude,
        longitude: vendorProfile.longitude,
        location_name: locationName
      };
      console.log('Creating deal with payload:', dealPayload); // <--- Added log
      const response = await DealService.createDeal(dealPayload);
      if (response.success) {
        Alert.alert('Success!', 'Deal posted successfully!', [
          { text: 'OK', onPress: async () => {
            // Wait briefly to ensure DB is updated
            await new Promise(res => setTimeout(res, 500));
            if (response.deal && response.deal.id) {
              router.replace({ pathname: '/deal-details/[id]', params: { id: response.deal.id } });
            } else {
              router.back();
            }
          }}
        ]);
      } else {
        Alert.alert('Error', response.message);
      }
    } catch {
      Alert.alert('Error', 'Failed to post deal');
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: keyof CreateDealData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const discountedPrice = formData.original_price * (1 - formData.discount_percent / 100);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Post New Deal</Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Deal Title (Optional)"
              placeholder="e.g., Flash Sale on Fresh Fruits"
              value={formData.deal_title}
              onChangeText={(value) => updateFormData('deal_title', value)}
              icon={<Tag color="#9CA3AF" size={20} />}
            />

            <Input
              label="Item Name *"
              placeholder="e.g., Fresh Apples"
              value={formData.item_name}
              onChangeText={(value) => updateFormData('item_name', value)}
              icon={<Package color="#9CA3AF" size={20} />}
              error={errors.item_name}
            />

            <Input
              label="Description"
              placeholder="Describe your deal..."
              value={formData.description}
              onChangeText={(value) => updateFormData('description', value)}
              multiline
              numberOfLines={3}
            />

            <View style={styles.row}>
              <View style={styles.halfWidth}>
                <Input
                  label="Quantity *"
                  placeholder="e.g., 5 kg"
                  value={formData.quantity.toString()}
                  onChangeText={(value) => updateFormData('quantity', value)}
                  keyboardType="default"
                  error={errors.quantity}
                />
              </View>
              <View style={styles.halfWidth}>
                <Input
                  label="Discount % *"
                  placeholder="10"
                  value={formData.discount_percent.toString()}
                  onChangeText={(value) => updateFormData('discount_percent', parseInt(value) || 0)}
                  keyboardType="numeric"
                  icon={<Percent color="#9CA3AF" size={20} />}
                  error={errors.discount_percent}
                />
              </View>
            </View>

            <Input
  label="Original Price (₹) *"
  placeholder="100.00"
  value={formData.original_price.toString()}
  onChangeText={(value) => {
  if (value === '') {
    updateFormData('original_price', 0); // or optionally keep it empty in state
  } else {
    updateFormData('original_price', parseFloat(value));
  }
}}
  keyboardType="numeric"
  error={errors.original_price}
/>

            {formData.original_price > 0 && (
              <View style={styles.pricePreview}>
                <Text style={styles.pricePreviewLabel}>Price Preview:</Text>
                <View style={styles.pricePreviewContainer}>
                  <Text style={styles.originalPrice}>₹{formData.original_price.toFixed(2)}</Text>
                  <Text style={styles.discountedPrice}>₹{discountedPrice.toFixed(2)}</Text>
                  <Text style={styles.savings}>
                    Save ₹{(formData.original_price - discountedPrice).toFixed(2)}
                  </Text>
                </View>
              </View>
            )}

            {/* Time Picker */}
            <View>
              <Text style={{ marginBottom: 6, fontWeight: '600', color: '#374151' }}>
                Expiry Time *
              </Text>
              <TouchableOpacity
                onPress={() => setShowTimePicker(true)}
                style={{
                  borderWidth: 1,
                  borderColor: errors.expiry_time ? 'red' : '#D1D5DB',
                  borderRadius: 8,
                  padding: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 4,
                }}
              >
                <Text style={{ color: formData.expiry_time ? '#111827' : '#9CA3AF' }}>
                  {formData.expiry_time
                    ? new Date(formData.expiry_time).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Select Expiry Time'}
                </Text>
                <Clock color="#9CA3AF" size={20} />
              </TouchableOpacity>
              {errors.expiry_time && (
                <Text style={{ color: 'red', marginTop: 4 }}>{errors.expiry_time}</Text>
              )}

              {showTimePicker && Platform.OS !== 'web' && (
                <DateTimePicker
                  mode="time"
                  value={formData.expiry_time ? new Date(formData.expiry_time) : new Date()}
                  display="default"
                  is24Hour={true}
                  onChange={(event, selectedTime) => {
                    setShowTimePicker(false);
                    if (event.type === 'dismissed' || !selectedTime) return;

                    const now = new Date();
                    const selectedDateTime = new Date();
                    selectedDateTime.setHours(selectedTime.getHours());
                    selectedDateTime.setMinutes(selectedTime.getMinutes());
                    selectedDateTime.setSeconds(0);
                    selectedDateTime.setMilliseconds(0);

                    if (selectedDateTime <= now) {
                      setErrors((prev) => ({
                        ...prev,
                        expiry_time: 'Expiry time must be in the future',
                      }));
                    } else {
                      setErrors((prev) => ({ ...prev, expiry_time: '' }));
                      updateFormData('expiry_time', selectedDateTime.toISOString());
                    }
                  }}
                />
              )}

              {showTimePicker && Platform.OS === 'web' && (
                <Input
                  label="Enter Time (HH:MM, 24h)"
                  placeholder="14:30"
                  value={
                    formData.expiry_time
                      ? new Date(formData.expiry_time).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false,
                        })
                      : ''
                  }
                  onChangeText={(value) => {
                    const [hours, minutes] = value.split(':').map(Number);
                    const now = new Date();
                    const selectedDateTime = new Date();
                    selectedDateTime.setHours(hours || 0);
                    selectedDateTime.setMinutes(minutes || 0);
                    selectedDateTime.setSeconds(0);
                    selectedDateTime.setMilliseconds(0);

                    if (selectedDateTime <= now) {
                      setErrors((prev) => ({
                        ...prev,
                        expiry_time: 'Expiry time must be in the future',
                      }));
                    } else {
                      setErrors((prev) => ({ ...prev, expiry_time: '' }));
                      updateFormData('expiry_time', selectedDateTime.toISOString());
                    }
                    setShowTimePicker(false);
                  }}
                />
              )}
            </View>

            <View style={styles.imageSection}>
              <Text style={styles.imageLabel}>Deal Image</Text>
              {(previewUri || formData.image_url) ? (
                <View style={styles.imagePreview}>
                  <Image source={{ uri: previewUri || formData.image_url }} style={styles.previewImage} />
                  {imageUploading && (
                    <View style={{
                      ...StyleSheet.absoluteFillObject,
                      backgroundColor: 'rgba(255,255,255,0.6)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 12,
                    }}>
                      <Text style={{ color: '#F97316', fontWeight: 'bold' }}>Uploading...</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.changeImageButton}
                    onPress={() => handleImagePick(false)}
                  >
                    <Text style={styles.changeImageText}>Change Image</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.imageButtons}>
                  <Button
                    title="Take Photo"
                    onPress={() => handleImagePick(true)}
                    loading={imageUploading}
                    variant="outline"
                    icon={<Camera color="#F97316" size={16} />}
                  />
                  <Button
                    title="Choose from Gallery"
                    onPress={() => handleImagePick(false)}
                    loading={imageUploading}
                    variant="outline"
                    icon={<ImageIcon color="#F97316" size={16} />}
                  />
                </View>
              )}
            </View>

            <View style={styles.actions}>
              <Button
                title="Post Deal"
                onPress={handleSubmit}
                loading={loading}
                size="large"
                icon={<Plus color="#ffffff" size={20} />}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  scrollContainer: { padding: 16 },
  header: { alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '700', color: '#1F2937' },
  form: { gap: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
  halfWidth: { flex: 1 },
  pricePreview: {
    marginTop: 12, backgroundColor: '#FEF3C7', padding: 12, borderRadius: 8
  },
  pricePreviewLabel: { fontSize: 14, color: '#9CA3AF', marginBottom: 4 },
  pricePreviewContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  originalPrice: { textDecorationLine: 'line-through', color: '#9CA3AF' },
  discountedPrice: { fontWeight: 'bold', color: '#10B981' },
  savings: { color: '#F97316' },
  imageSection: { marginTop: 16 },
  imageLabel: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 8 },
  imagePreview: { alignItems: 'center' },
  previewImage: { width: '100%', height: 200, borderRadius: 12, marginBottom: 8 },
  changeImageButton: { backgroundColor: '#E5E7EB', padding: 8, borderRadius: 6 },
  changeImageText: { color: '#374151' },
  imageButtons: { gap: 12 },
  actions: { marginTop: 24 },
});
