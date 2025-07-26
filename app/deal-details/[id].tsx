import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  TouchableOpacity,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { DealService, Deal } from '@/services/dealService';

import { useAuth } from '@/contexts/AuthContext';
import * as Linking from 'expo-linking';
import { 
  ArrowLeft,
  MapPin,
  Percent,
  Package,
  Clock,
  User,
  ShoppingBag,
  Tag
} from 'lucide-react-native';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import CountdownTimer from '@/components/ui/CountdownTimer';
import Dialog from 'react-native-dialog';

export default function DealDetailsScreen() {
  const { id, from } = useLocalSearchParams();
  const { user } = useAuth();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);
  const [vendor, setVendor] = useState<any>(null);
  const [backPressCount, setBackPressCount] = useState(0);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogValue, setDialogValue] = useState('');
  const [dialogError, setDialogError] = useState('');

  // Determine where to go back based on user role or from parameter
  const getBackDestination = () => {
    // If from parameter is provided, use it
    if (from === 'buyer') {
      return '/(buyer)/buyer';
    } else if (from === 'vendor') {
      return '/(vendor)/vendor';
    }
    
    // Otherwise use user role
    if (user?.profile.role === 'buyer') {
      return '/(buyer)/buyer';
    } else if (user?.profile.role === 'vendor') {
      return '/(vendor)/vendor';
    }
    
    return '/auth';
  };

  const handleBackPress = () => {
    // Increment back press count
    const newCount = backPressCount + 1;
    setBackPressCount(newCount);

    // If this is the first back press, go back to previous screen
    if (newCount === 1) {
      // Check if we can go back in navigation stack
      if (router.canGoBack()) {
        router.back();
      } else {
        // Fallback navigation to correct destination
        const destination = getBackDestination();
        router.replace(destination);
      }
      
      // Reset count after 2 seconds
      setTimeout(() => {
        setBackPressCount(0);
      }, 2000);
      
      return;
    }

    // If multiple back presses, ask to exit app
    if (newCount >= 2) {
      Alert.alert(
        'Exit App',
        'Do you want to exit the app?',
        [
          {
            text: 'Cancel',
            onPress: () => {
              setBackPressCount(0); // Reset count
            },
            style: 'cancel',
          },
          {
            text: 'Exit',
            onPress: () => {
              BackHandler.exitApp();
            },
            style: 'destructive',
          },
        ]
      );
      setBackPressCount(0); // Reset count
    }
  };

  const handleBackButtonPress = () => {
    // This is for the header back button (single press)
    // Check if we can go back in navigation stack
    if (router.canGoBack()) {
      router.back();
    } else {
      // Fallback navigation to correct destination
      const destination = getBackDestination();
      router.replace(destination);
    }
  };

  const handleEditQuantity = () => {
    if (!deal) return;
    setDialogValue(deal.remaining_quantity.toString());
    setDialogError('');
    setDialogVisible(true);
  };

  const handleDialogCancel = () => {
    setDialogVisible(false);
    setDialogValue('');
    setDialogError('');
  };

  const handleDialogConfirm = async () => {
    if (!deal) return;
    const quantity = parseInt(dialogValue);
    if (isNaN(quantity) || quantity < 0 || quantity > deal.quantity) {
      setDialogError(`Quantity must be between 0 and ${deal.quantity}`);
      return;
    }
    try {
      const response = await DealService.updateDealQuantity(deal.id, quantity);
      if (response.success) {
        Alert.alert('Success', 'Quantity updated successfully!');
        loadDealDetails();
        handleDialogCancel();
      } else {
        setDialogError(response.message);
      }
    } catch (error) {
      setDialogError('Failed to update quantity');
    }
  };

  useEffect(() => {
    // Check authentication before loading
    if (!user) {
      router.replace('/auth');
      return;
    }
    
    if (id) {
      loadDealDetails();
    }

    // Handle back button press
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBackPress();
      return true; // Prevent default back behavior
    });

    return () => {
      backHandler.remove();
    };
  }, [id, user, backPressCount]);

  // Redirect if user becomes unauthenticated
  useEffect(() => {
    if (!user) {
      router.replace('/auth');
    }
  }, [user]);

  const loadDealDetails = async () => {
    try {
      const response = await DealService.getDealById(id as string);
      
      if (response.success && response.deal) {
        setDeal(response.deal);
        // Fetch vendor details
        if (response.deal.vendor_id) {
          const vendorRes = await DealService.getVendorProfileById(response.deal.vendor_id);
          if (vendorRes.success) {
            setVendor(vendorRes.vendor);
          }
        }
      } else {
        Alert.alert('Error', response.message);
        router.back();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load deal details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading deal details..." />;
  }

  if (!deal) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Deal not found</Text>
      </SafeAreaView>
    );
  }

  const savings = deal.original_price - deal.discounted_price;
  const isExpired = new Date(deal.expiry_time) <= new Date();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackButtonPress}>
          <ArrowLeft color="#111827" size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Deal Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Deal Image */}
        {deal.image_url ? (
          <Image source={{ uri: deal.image_url }} style={styles.dealImage} />
        ) : (
          <View style={[styles.dealImage, { alignItems: 'center', justifyContent: 'center' }]}> 
            <Text style={{ color: '#9CA3AF' }}>No image available</Text>
          </View>
        )}

        {/* Deal Header */}
        <View style={styles.dealHeader}>
          <View style={styles.titleContainer}>
            <Text style={styles.dealTitle}>
              {deal.deal_title || deal.item_name}
            </Text>
            <View style={styles.discountBadge}>
              <Percent color="#ffffff" size={16} />
              <Text style={styles.discountText}>{deal.discount_percent}%</Text>
            </View>
          </View>

          {deal.description && (
            <Text style={styles.description}>{deal.description}</Text>
          )}
        </View>

        {/* Pricing */}
        <View style={styles.pricingCard}>
          <Text style={styles.cardTitle}>Pricing</Text>
          <View style={styles.priceContainer}>
            <Text style={styles.originalPrice}>
              ₹{typeof deal.original_price === 'number' ? deal.original_price.toFixed(2) : 'N/A'}
            </Text>
            <Text style={styles.discountedPrice}>
              ₹{typeof deal.discounted_price === 'number' ? deal.discounted_price.toFixed(2) : 'N/A'} per 1 {deal.quantity_unit}
            </Text>
          </View>
          <Text style={styles.savings}>
            You save ₹
            {typeof deal.original_price === 'number' && typeof deal.discounted_price === 'number'
              ? (deal.original_price - deal.discounted_price).toFixed(2)
              : '0.00'}
          </Text>
        </View>

        {/* Deal Info */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Deal Information</Text>
          
          <View style={styles.infoRow}>
            <Package color="#6B7280" size={20} />
            <View style={styles.quantityInfo}>
              <Text style={styles.infoText}>
                {deal.remaining_quantity}/{deal.quantity} {deal.quantity_unit} available
              </Text>
              {user?.profile.role === 'vendor' && deal.status === 'active' && !isExpired && (
                <TouchableOpacity
                  style={styles.editQuantityButton}
                  onPress={() => handleEditQuantity()}
                >
                  <Text style={styles.editQuantityText}>Edit Quantity</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.infoRow}>
            <Clock color="#6B7280" size={20} />
            <View style={styles.timerContainer}>
              <Text style={styles.infoText}>Expires in: </Text>
              <CountdownTimer expiryTime={deal.expiry_time} size="small" />
            </View>
          </View>

          <View style={styles.infoRow}>
            <MapPin color="#6B7280" size={20} />
            <Text style={styles.infoText}>
              {deal.location_name
                ? deal.location_name
                : 'This deal does not include a location'}
            </Text>
          </View>

          {typeof deal.distance_km === 'number' && (
            <View style={styles.infoRow}>
              <MapPin color="#6B7280" size={20} />
              <Text style={styles.infoText}>
                {deal.distance_km < 1
                  ? `${Math.round(deal.distance_km * 1000)}m away`
                  : `${deal.distance_km.toFixed(1)}km away`
                }
              </Text>
            </View>
          )}
        </View>

        {/* Vendor Info - Visible to both buyers and vendors */}
        {vendor && (
          <View style={styles.vendorCard}>
            <Text style={styles.cardTitle}>Vendor</Text>
            <View style={styles.vendorInfo}>
              <User color="#F97316" size={24} />
              <View>
                <Text style={styles.vendorDetail}>Shop: {vendor?.shop_name || 'Not available'}</Text>
                <Text style={styles.vendorDetail}>Phone: {vendor?.phone || 'Not available'}</Text>
                <Text style={styles.vendorDetail}>Address: {vendor?.location_name || 'Not available'}</Text>
              </View>
            </View>

            {/* Only for buyers: Call Vendor */}
            {user?.profile.role === 'buyer' && vendor?.phone && (
              <View style={styles.buyerActions}>
                <TouchableOpacity
                  style={styles.callButton}
                  onPress={() => Linking.openURL(`tel:${vendor.phone}`)}
                >
                  <Text style={styles.callButtonText}>Call Vendor</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Status */}
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Status:</Text>
          <Text style={[
            styles.statusText,
            deal.status === 'active' && styles.activeStatus,
            deal.status === 'sold' && styles.soldStatus,
            deal.status === 'expired' && styles.expiredStatus
          ]}>
            {deal.status.charAt(0).toUpperCase() + deal.status.slice(1)}
          </Text>
        </View>

        {/* Vendor note for vendors only */}
        {user?.profile.role === 'vendor' && deal.status === 'active' && !isExpired && (
          <View style={styles.vendorNote}>
            <Text style={styles.vendorNoteText}>
              This is your deal. Buyers can see it.
            </Text>
          </View>
        )}

        {isExpired && (
          <View style={styles.expiredNote}>
            <Text style={styles.expiredNoteText}>This deal has expired</Text>
          </View>
        )}
      </ScrollView>
      <Dialog.Container visible={dialogVisible}>
        <Dialog.Title>Update Remaining Quantity</Dialog.Title>
        <Dialog.Description>
          Enter the remaining quantity (0-{deal?.quantity ?? 0}):
        </Dialog.Description>
        <Dialog.Input
          value={dialogValue}
          onChangeText={setDialogValue}
          keyboardType="numeric"
        />
        {!!dialogError && <Text style={{ color: 'red', marginTop: 4 }}>{dialogError}</Text>}
        <Dialog.Button label="Cancel" onPress={handleDialogCancel} />
        <Dialog.Button label="Update" onPress={handleDialogConfirm} />
      </Dialog.Container>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  scrollContainer: {
    paddingBottom: 100,
  },
  dealImage: {
    width: '100%',
    height: 250,
    backgroundColor: '#F3F4F6',
  },
  dealHeader: {
    padding: 20,
    backgroundColor: '#ffffff',
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  dealTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginRight: 12,
  },
  discountBadge: {
    backgroundColor: '#F97316',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  discountText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
  },
  pricingCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    marginTop: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  originalPrice: {
    fontSize: 18,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  discountedPrice: {
    fontSize: 28,
    fontWeight: '700',
    color: '#059669',
  },
  savings: {
    fontSize: 16,
    color: '#059669',
    fontWeight: '600',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    marginTop: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  vendorCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    marginTop: 8,
  },
  vendorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  vendorDetail: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  statusCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  activeStatus: {
    color: '#059669',
  },
  soldStatus: {
    color: '#3B82F6',
  },
  expiredStatus: {
    color: '#EF4444',
  },
  vendorNote: {
    backgroundColor: '#DBEAFE',
    padding: 16,
    margin: 20,
    borderRadius: 8,
  },
  vendorNoteText: {
    fontSize: 14,
    color: '#1E40AF',
    textAlign: 'center',
  },
  expiredNote: {
    backgroundColor: '#FEE2E2',
    padding: 16,
    margin: 20,
    borderRadius: 8,
  },
  expiredNoteText: {
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 50,
  },
  buyerActions: {
    marginTop: 16,
    gap: 12,
  },
  actionButton: {
    backgroundColor: '#E0F2FE',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#0284C7',
    fontWeight: '600',
    fontSize: 14,
  },
  callButton: {
    backgroundColor: '#DCFCE7',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  callButtonText: {
    color: '#16A34A',
    fontWeight: '600',
    fontSize: 14,
  },
  quantityInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editQuantityButton: {
    backgroundColor: '#F97316',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  editQuantityText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
}); 