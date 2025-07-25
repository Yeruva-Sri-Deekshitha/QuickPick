import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { MapPin, Percent, Package } from 'lucide-react-native';
import { Deal } from '@/services/dealService';
import { LocationService } from '@/services/locationService';
import CountdownTimer from './CountdownTimer';

interface DealCardProps {
  deal: Deal;
  onPress: () => void;
  showDistance?: boolean;
}

export default function DealCard({ deal, onPress, showDistance = true }: DealCardProps) {
  const savings = deal.original_price - deal.discounted_price;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      {deal.image_url && (
        <Image source={{ uri: deal.image_url }} style={styles.image} />
      )}
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.itemName} numberOfLines={2}>
            {deal.item_name}
          </Text>
          <View style={styles.discountBadge}>
            <Percent color="#ffffff" size={12} />
            <Text style={styles.discountText}>{deal.discount_percent}%</Text>
          </View>
        </View>

        <View style={styles.details}>
          <View style={styles.priceContainer}>
            <Text style={styles.originalPrice}>₹{deal.original_price.toFixed(2)}</Text>
            <Text style={styles.discountedPrice}>₹{deal.discounted_price.toFixed(2)}</Text>
            <Text style={styles.savings}>Save ₹{savings.toFixed(2)}</Text>
          </View>

          <View style={styles.metaInfo}>
            <View style={styles.quantity}>
              <Package color="#6B7280" size={14} />
              <Text style={styles.quantityText}>{deal.quantity} left</Text>
            </View>

            {showDistance && (deal.distance_km !== undefined || deal.distance !== undefined) && (
              <View style={styles.distance}>
                <MapPin color="#6B7280" size={14} />
                <Text style={styles.distanceText}>
                  {LocationService.formatDistance(deal.distance_km ?? deal.distance)}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.footer}>
          <CountdownTimer 
            expiryTime={deal.expiry_time} 
            size="small"
          />
          {'vendor_name' in deal && deal.vendor_name && (
            <Text style={styles.vendorName}>by {deal.vendor_name}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
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
  image: {
    width: '100%',
    height: 160,
    backgroundColor: '#F3F4F6',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginRight: 12,
  },
  discountBadge: {
    backgroundColor: '#F97316',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  discountText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  details: {
    marginBottom: 12,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
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
  savings: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
  },
  metaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quantity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quantityText: {
    fontSize: 12,
    color: '#6B7280',
  },
  distance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distanceText: {
    fontSize: 12,
    color: '#6B7280',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vendorName: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
});