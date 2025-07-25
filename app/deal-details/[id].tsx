import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { DealService, Deal } from '@/services/dealService';
import { OrderService } from '@/services/orderService';
import { useAuth } from '@/contexts/AuthContext';
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

export default function DealDetailsScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);

  useEffect(() => {
    if (id) {
      loadDealDetails();
    }
  }, [id]);

  const loadDealDetails = async () => {
    try {
      const response = await DealService.getDealById(id as string);
      
      if (response.success && response.deal) {
        setDeal(response.deal);
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

  const handleReserveDeal = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to reserve deals');
      return;
    }

    if (user.profile.role !== 'buyer') {
      Alert.alert('Access Denied', 'Only buyers can reserve deals');
      return;
    }

    Alert.alert(
      'Reserve Deal',
      'Are you sure you want to reserve this deal?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reserve',
          onPress: async () => {
            setReserving(true);
            try {
              const response = await OrderService.createOrder(id as string);
              
              if (response.success) {
                Alert.alert('Success!', 'Deal reserved successfully!', [
                  { text: 'OK', onPress: () => router.back() }
                ]);
              } else {
                Alert.alert('Error', response.message);
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to reserve deal');
            } finally {
              setReserving(false);
            }
          }
        }
      ]
    );
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

  // Debug: Log the image URL
  console.log('Deal image_url:', deal.image_url);

  const savings = deal.original_price - deal.discounted_price;
  const isExpired = new Date(deal.expiry_time) <= new Date();
  const canReserve = user?.profile.role === 'buyer' && deal.status === 'active' && !isExpired;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
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
    ₹{typeof deal.discounted_price === 'number' ? deal.discounted_price.toFixed(2) : 'N/A'}
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
            <Text style={styles.infoText}>{deal.quantity} items available</Text>
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

          {deal.distance !== undefined && (
            <View style={styles.infoRow}>
              <MapPin color="#6B7280" size={20} />
              <Text style={styles.infoText}>
                {deal.distance < 1
                  ? `${Math.round(deal.distance * 1000)}m away`
                  : `${deal.distance.toFixed(1)}km away`
                }
              </Text>
            </View>
          )}
        </View>

        {/* Vendor Info */}
        <View style={styles.vendorCard}>
          <Text style={styles.cardTitle}>Vendor</Text>
          <View style={styles.vendorInfo}>
            <User color="#F97316" size={24} />
            <Text style={styles.vendorName}>{deal.vendor_name}</Text>
          </View>
        </View>

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

        {/* Reserve Button */}
        {canReserve && (
          <View style={styles.actions}>
            <Button
              title="Reserve This Deal"
              onPress={handleReserveDeal}
              loading={reserving}
              size="large"
              icon={<ShoppingBag color="#ffffff" size={20} />}
            />
          </View>
        )}

        {!canReserve && deal.status === 'active' && !isExpired && user?.profile.role === 'vendor' && (
          <View style={styles.vendorNote}>
            <Text style={styles.vendorNoteText}>
              This is your deal. Buyers can see and reserve it.
            </Text>
          </View>
        )}

        {isExpired && (
          <View style={styles.expiredNote}>
            <Text style={styles.expiredNoteText}>This deal has expired</Text>
          </View>
        )}
      </ScrollView>
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
  promoCode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    padding: 8,
    borderRadius: 8,
  },
  promoCodeText: {
    fontSize: 14,
    color: '#F97316',
    fontWeight: '600',
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
  vendorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
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
  actions: {
    padding: 20,
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
});