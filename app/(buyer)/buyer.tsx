import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { DealService, Deal } from '@/services/dealService';
import { LocationService, LocationCoords } from '@/services/locationService';
import { MapPin, RefreshCw } from 'lucide-react-native';
import DealCard from '@/components/ui/DealCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Button from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';

export default function BuyerScreen() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState<LocationCoords | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [profileLocation, setProfileLocation] = useState<LocationCoords | null>(null);

  useEffect(() => {
    fetchBuyerProfileLocation();
    getCurrentLocationAndLoadDeals();
    
    // Subscribe to real-time deal updates
    const subscription = DealService.subscribeToDeals((payload) => {
      console.log('Deal update:', payload);
      loadDeals();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchBuyerProfileLocation = async () => {
    // Fetch the buyer's saved profile location from buyer_profile
    const user = await supabase.auth.getUser();
    if (!user.data.user) return;
    const { data, error } = await supabase
      .from('buyer_profile')
      .select('latitude, longitude')
      .eq('user_id', user.data.user.id)
      .single();
    if (data && data.latitude && data.longitude) {
      setProfileLocation({ latitude: data.latitude, longitude: data.longitude });
    }
  };

  const getCurrentLocationAndLoadDeals = async () => {
    setLocationLoading(true);
    // Prefer profile location if available
    if (profileLocation) {
      setUserLocation(profileLocation);
      await loadDeals(profileLocation);
      setLocationLoading(false);
      return;
    }
    const locationResponse = await LocationService.getCurrentLocation();
    console.log('Buyer current location:', locationResponse);
    if (locationResponse.success && locationResponse.coords) {
      setUserLocation(locationResponse.coords);
      await loadDeals(locationResponse.coords);
    } else {
      Alert.alert('Location Required', locationResponse.message, [
        { text: 'Retry', onPress: getCurrentLocationAndLoadDeals },
        { text: 'Cancel', style: 'cancel' }
      ]);
      setLoading(false);
    }
    setLocationLoading(false);
  };

  const loadDeals = async (location?: LocationCoords) => {
    try {
      const coords = location || userLocation;
      if (!coords) return;
      console.log('Loading deals for coords:', coords);
      const response = await DealService.getNearbyDeals(coords);
      console.log('Nearby deals response:', response);
      if (response.success && response.deals) {
        setDeals(response.deals);
        console.log('Deals set in state:', response.deals);
      } else {
        Alert.alert('Error', response.message);
      }
    } catch (error) {
      console.error('Load deals error:', error);
      Alert.alert('Error', 'Failed to load deals');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadDeals();
  };

  const handleDealPress = (deal: Deal) => {
    router.push({
      pathname: '/deal-details',
      params: { dealId: deal.id }
    });
  };

  const renderDeal = ({ item }: { item: Deal }) => (
    <DealCard
      deal={item}
      onPress={() => handleDealPress(item)}
      showDistance={true}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MapPin color="#9CA3AF" size={48} />
      <Text style={styles.emptyTitle}>No deals nearby</Text>
      <Text style={styles.emptyText}>
        There are no active deals within 5km of your location. Try refreshing or check back later!
      </Text>
      <Button
        title="Refresh Location"
        onPress={getCurrentLocationAndLoadDeals}
        loading={locationLoading}
        icon={<RefreshCw color="#ffffff" size={16} />}
      />
    </View>
  );

  if (loading) {
    return <LoadingSpinner message="Finding deals near you..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Discover Deals</Text>
        {userLocation && (
          <TouchableOpacity 
            style={styles.locationButton}
            onPress={getCurrentLocationAndLoadDeals}
          >
            <MapPin color="#F97316" size={16} />
            <Text style={styles.locationText}>Update Location</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={deals}
        renderItem={renderDeal}
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
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#F97316',
    fontWeight: '500',
  },
  listContainer: {
    padding: 20,
    paddingBottom: 100,
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