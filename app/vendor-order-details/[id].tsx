import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  Linking,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { OrderService, Order } from '@/services/orderService';
import { ArrowLeft, User, Phone, Mail, Package, Calendar, Clock, MapPin, CircleCheck as CheckCircle, Truck, MessageSquare } from 'lucide-react-native';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import CountdownTimer from '@/components/ui/CountdownTimer';

export default function VendorOrderDetailsScreen() {
  const { id } = useLocalSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [trackingData, setTrackingData] = useState({
    tracking_id: '',
    pickup_window_start: '',
    pickup_window_end: '',
    special_instructions: '',
    delivery_eta: ''
  });

  useEffect(() => {
    if (id) {
      loadOrderDetails();
    }
  }, [id]);

  const loadOrderDetails = async () => {
    try {
      const response = await OrderService.getOrderById(id as string);
      
      if (response.success && response.order) {
        setOrder(response.order);
        setTrackingData({
          tracking_id: response.order.tracking_id || '',
          pickup_window_start: response.order.pickup_window_start || '',
          pickup_window_end: response.order.pickup_window_end || '',
          special_instructions: response.order.special_instructions || '',
          delivery_eta: response.order.delivery_eta || ''
        });
      } else {
        Alert.alert('Error', response.message);
        router.back();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load order details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsCollected = async () => {
    Alert.alert(
      'Mark as Collected',
      'Confirm that the customer has collected this order?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setUpdating(true);
            try {
              const response = await OrderService.markAsCollected(id as string);
              
              if (response.success) {
                Alert.alert('Success', 'Order marked as collected!');
                loadOrderDetails();
              } else {
                Alert.alert('Error', response.message);
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to update order status');
            } finally {
              setUpdating(false);
            }
          }
        }
      ]
    );
  };

  const handleUpdateTracking = async () => {
    setUpdating(true);
    try {
      const response = await OrderService.updateOrderTracking(id as string, trackingData);
      
      if (response.success) {
        Alert.alert('Success', 'Tracking information updated!');
        loadOrderDetails();
      } else {
        Alert.alert('Error', response.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update tracking information');
    } finally {
      setUpdating(false);
    }
  };

  const handleCallBuyer = () => {
    if (order?.buyer_details?.phone) {
      const phoneUrl = `tel:${order.buyer_details.phone}`;
      Linking.canOpenURL(phoneUrl).then((supported) => {
        if (supported) {
          Linking.openURL(phoneUrl);
        } else {
          Alert.alert('Error', 'Phone calls are not supported on this device');
        }
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'collected':
        return '#059669';
      case 'missed':
      case 'expired':
        return '#EF4444';
      default:
        return '#F59E0B';
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading order details..." />;
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Order not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft color="#111827" size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Order Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Order Status */}
        <View style={styles.statusCard}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </Text>
          </View>
          <Text style={styles.orderDate}>
            Ordered on {new Date(order.purchase_date).toLocaleDateString()}
          </Text>
        </View>

        {/* Deal Information */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Deal Information</Text>
          
          {order.deal?.image_url && (
            <Image source={{ uri: order.deal.image_url }} style={styles.dealImage} />
          )}
          
          <View style={styles.dealInfo}>
            <Text style={styles.dealTitle}>{order.deal?.deal_title || order.deal?.item_name}</Text>
            {order.deal?.description && (
              <Text style={styles.dealDescription}>{order.deal.description}</Text>
            )}
            
            <View style={styles.priceContainer}>
              <Text style={styles.originalPrice}>₹{order.deal?.original_price?.toFixed(2)}</Text>
              <Text style={styles.discountedPrice}>₹{order.deal?.discounted_price?.toFixed(2)}</Text>
              <Text style={styles.discount}>{order.deal?.discount_percent}% off</Text>
            </View>

            {order.deal?.expiry_time && (
              <CountdownTimer expiryTime={order.deal.expiry_time} size="medium" />
            )}
          </View>
        </View>

        {/* Buyer Information */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Buyer Information</Text>
          
          <View style={styles.buyerInfo}>
            <View style={styles.infoRow}>
              <User color="#6B7280" size={20} />
              <Text style={styles.infoText}>{order.buyer_details?.name}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Phone color="#6B7280" size={20} />
              <Text style={styles.infoText}>{order.buyer_details?.phone}</Text>
              <TouchableOpacity onPress={handleCallBuyer} style={styles.callButton}>
                <Text style={styles.callButtonText}>Call</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.infoRow}>
              <Mail color="#6B7280" size={20} />
              <Text style={styles.infoText}>{order.buyer_details?.email}</Text>
            </View>
          </View>
        </View>

        {/* Tracking Information */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tracking & Delivery</Text>
          
          <View style={styles.trackingForm}>
            <Input
              label="Tracking ID"
              placeholder="Enter tracking ID"
              value={trackingData.tracking_id}
              onChangeText={(value) => setTrackingData(prev => ({ ...prev, tracking_id: value }))}
              icon={<Package color="#9CA3AF" size={20} />}
            />

            <View style={styles.row}>
              <View style={styles.halfWidth}>
                <Input
                  label="Pickup Window Start"
                  placeholder="Start time"
                  value={trackingData.pickup_window_start ? new Date(trackingData.pickup_window_start).toLocaleString() : ''}
                  onChangeText={(value) => setTrackingData(prev => ({ ...prev, pickup_window_start: value }))}
                  icon={<Clock color="#9CA3AF" size={20} />}
                />
              </View>
              
              <View style={styles.halfWidth}>
                <Input
                  label="Pickup Window End"
                  placeholder="End time"
                  value={trackingData.pickup_window_end ? new Date(trackingData.pickup_window_end).toLocaleString() : ''}
                  onChangeText={(value) => setTrackingData(prev => ({ ...prev, pickup_window_end: value }))}
                  icon={<Clock color="#9CA3AF" size={20} />}
                />
              </View>
            </View>

            <Input
              label="Delivery ETA"
              placeholder="Estimated delivery time"
              value={trackingData.delivery_eta ? new Date(trackingData.delivery_eta).toLocaleString() : ''}
              onChangeText={(value) => setTrackingData(prev => ({ ...prev, delivery_eta: value }))}
              icon={<Truck color="#9CA3AF" size={20} />}
            />

            <Input
              label="Special Instructions"
              placeholder="Any special notes for the buyer..."
              value={trackingData.special_instructions}
              onChangeText={(value) => setTrackingData(prev => ({ ...prev, special_instructions: value }))}
              multiline
              numberOfLines={3}
              icon={<MessageSquare color="#9CA3AF" size={20} />}
            />

            <Button
              title="Update Tracking Info"
              onPress={handleUpdateTracking}
              loading={updating}
              variant="secondary"
            />
          </View>
        </View>

        {/* Actions */}
        {order.status === 'reserved' && (
          <View style={styles.actions}>
            <Button
              title="Mark as Collected"
              onPress={handleMarkAsCollected}
              loading={updating}
              size="large"
              icon={<CheckCircle color="#ffffff" size={20} />}
            />
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
    padding: 20,
    paddingBottom: 100,
  },
  statusCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  orderDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  dealImage: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    marginBottom: 12,
  },
  dealInfo: {
    gap: 8,
  },
  dealTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  dealDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  originalPrice: {
    fontSize: 14,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  discountedPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#059669',
  },
  discount: {
    fontSize: 14,
    color: '#F97316',
    fontWeight: '600',
  },
  buyerInfo: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  callButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#3B82F6',
    borderRadius: 6,
  },
  callButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  trackingForm: {
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  actions: {
    marginTop: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 50,
  },
});