import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  Image,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OrderService, Order } from '@/services/orderService';
import { Package, Phone, Calendar, CircleCheck as CheckCircle, Circle as XCircle, Clock } from 'lucide-react-native';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Button from '@/components/ui/Button';

export default function VendorOrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadOrders();
    
    // Subscribe to real-time order updates
    const subscription = OrderService.subscribeToOrders((payload) => {
      console.log('Order update:', payload);
      loadOrders();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadOrders = async () => {
    try {
      const response = await OrderService.getVendorOrders();
      
      if (response.success && response.orders) {
        setOrders(response.orders);
      } else {
        Alert.alert('Error', response.message);
      }
    } catch (error) {
      console.error('Load orders error:', error);
      Alert.alert('Error', 'Failed to load orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const handleCallBuyer = (phone: string) => {
    const phoneUrl = `tel:${phone}`;
    Linking.canOpenURL(phoneUrl).then((supported) => {
      if (supported) {
        Linking.openURL(phoneUrl);
      } else {
        Alert.alert('Error', 'Phone calls are not supported on this device');
      }
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'collected':
        return <CheckCircle color="#059669" size={16} />;
      case 'missed':
      case 'expired':
        return <XCircle color="#EF4444" size={16} />;
      default:
        return <Clock color="#F59E0B" size={16} />;
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

  const renderOrder = ({ item }: { item: Order }) => (
    <View style={styles.orderCard}>
      {item.deal?.image_url && (
        <Image source={{ uri: item.deal.image_url }} style={styles.orderImage} />
      )}
      
      <View style={styles.orderContent}>
        <View style={styles.orderHeader}>
          <Text style={styles.itemName} numberOfLines={2}>
            {item.deal?.item_name}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            {getStatusIcon(item.status)}
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>

        <View style={styles.buyerInfo}>
          <Text style={styles.buyerName}>Buyer: {item.users?.name}</Text>
          <Text style={styles.discount}>{item.deal?.discount_percent}% off</Text>
        </View>

        <View style={styles.priceContainer}>
          <Text style={styles.originalPrice}>₹{item.deal?.original_price?.toFixed(2)}</Text>
          <Text style={styles.discountedPrice}>₹{item.deal?.discounted_price?.toFixed(2)}</Text>
        </View>

        <View style={styles.orderFooter}>
          <View style={styles.dateContainer}>
            <Calendar color="#6B7280" size={14} />
            <Text style={styles.dateText}>
              {new Date(item.purchase_date).toLocaleDateString()}
            </Text>
          </View>

          {item.users?.phone && (
            <Button
              title="Call Buyer"
              onPress={() => handleCallBuyer(item.users.phone)}
              size="small"
              variant="secondary"
              icon={<Phone color="#ffffff" size={14} />}
            />
          )}
          
          <Button
            title="View Details"
            onPress={() => router.push({
              pathname: '/vendor-order-details/[id]',
              params: { id: item.id }
            })}
            size="small"
            variant="outline"
          />
        </View>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Package color="#9CA3AF" size={48} />
      <Text style={styles.emptyTitle}>No orders yet</Text>
      <Text style={styles.emptyText}>
        When buyers reserve your deals, you'll see their orders here!
      </Text>
    </View>
  );

  if (loading) {
    return <LoadingSpinner message="Loading orders..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Customer Orders</Text>
      </View>

      <FlatList
        data={orders}
        renderItem={renderOrder}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#F97316"
          />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  listContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  orderImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#F3F4F6',
  },
  orderContent: {
    padding: 16,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginRight: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  buyerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  buyerName: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  discount: {
    fontSize: 14,
    color: '#F97316',
    fontWeight: '600',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  originalPrice: {
    fontSize: 14,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  discountedPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#059669',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#6B7280',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
});