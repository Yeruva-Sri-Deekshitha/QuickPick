import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput, Modal, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, User, MapPin } from 'lucide-react-native';
import Button from '@/components/ui/Button';
import MapView, { Marker } from 'react-native-maps';
import { supabase } from '@/lib/supabase';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { LocationService } from '@/services/locationService';

export default function BuyerProfileScreen() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapVisible, setMapVisible] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [vendors, setVendors] = useState<any[]>([]);
  const [backPressCount, setBackPressCount] = useState(0);

  useEffect(() => {
    // Check authentication before loading
    if (!user) {
      router.replace('/auth');
      return;
    }
    
    fetchProfile();
    fetchPhone();
  }, [user]);

  // Redirect if user becomes unauthenticated
  useEffect(() => {
    if (!user) {
      router.replace('/auth');
    }
  }, [user]);

  useEffect(() => {
    // Handle back button press with exit confirmation
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      console.log('Back button pressed in buyer profile');
      
      // If we're in a nested screen, let it go back normally
      if (router.canGoBack()) {
        router.back();
        return true;
      }
      
      // From profile screen, handle exit confirmation
      if (backPressCount === 0) {
        setBackPressCount(1);
        Alert.alert(
          'Exit App',
          'Press back again to exit the app',
          [
            {
              text: 'Cancel',
              onPress: () => setBackPressCount(0),
              style: 'cancel',
            },
          ],
          { cancelable: false }
        );
        
        // Reset back press count after 2 seconds
        setTimeout(() => {
          setBackPressCount(0);
        }, 2000);
        
        return true;
      } else {
        // Exit the app
        BackHandler.exitApp();
        return true;
      }
    });

    return () => {
      backHandler.remove();
    };
  }, [backPressCount]);

  useEffect(() => {
    if (location) {
      // Get address from lat/lng
      LocationService.getLocationName(location.latitude, location.longitude).then(setAddress);
      // Load nearby vendors
      loadVendors(location);
    }
  }, [location]);

  const loadVendors = async (coords: { latitude: number; longitude: number }) => {
    const response = await LocationService.getNearbyVendors(coords);
    if (response.success && response.vendors) {
      setVendors(response.vendors);
    } else {
      setVendors([]);
    }
  };

  const fetchProfile = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('buyer_profile')
      .select('*')
      .eq('user_id', user.id)
      .single();
    if (data) {
      setProfile(data);
      setFullName(data.full_name || '');
      if (data.latitude && data.longitude) setLocation({ latitude: data.latitude, longitude: data.longitude });
    }
  };

  const fetchPhone = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('phone')
      .eq('id', user.id)
      .single();
    if (data) setPhone(data.phone);
  };

  const handleSave = async () => {
    if (!fullName || !location) {
      Alert.alert('Error', 'Please fill all fields and select location.');
      return;
    }
    if (!user) return;
    const { error } = await supabase
      .from('buyer_profile')
      .upsert({
        user_id: user.id,
        full_name: fullName,
        latitude: location.latitude,
        longitude: location.longitude
      }, { onConflict: 'user_id' });
    if (error) {
      console.error('Supabase error:', error);
      Alert.alert('Error', error.message || 'Failed to update profile');
    } else {
      setEditing(false);
      fetchProfile();
      Alert.alert('Success', 'Profile updated!');
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              router.replace('/auth');
            } catch (error) {
              Alert.alert('Error', 'Failed to logout');
            }
          }
        }
      ]
    );
  };

  const openMapPicker = async () => {
    setGettingLocation(true);
    if (!location) {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to pick your location.');
        setGettingLocation(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    }
    setGettingLocation(false);
    setMapVisible(true);
  };

  if (!user) return null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <User color="#F97316" size={32} />
        </View>
        <Text style={styles.name}>{profile?.full_name || user.profile?.name}</Text>
        <Text style={styles.role}>Buyer</Text>
      </View>

      <View style={styles.profileInfo}>
        {editing ? (
          <>
            <TextInput style={styles.input} placeholder="Full Name" value={fullName} onChangeText={setFullName} />
            <TouchableOpacity style={styles.locationBtn} onPress={openMapPicker} disabled={gettingLocation}>
              <MapPin color="#F97316" size={20} />
              <Text style={styles.locationText}>{location ? `Lat: ${location.latitude.toFixed(4)}, Lon: ${location.longitude.toFixed(4)}` : gettingLocation ? 'Getting current location...' : 'Pick Location'}</Text>
            </TouchableOpacity>
            {address ? <Text style={styles.locationText}>{address}</Text> : null}
            <Button title="Save" onPress={handleSave} />
            <Button title="Cancel" onPress={() => setEditing(false)} variant="outline" />
          </>
        ) : (
          <>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Phone:</Text>
              <Text style={styles.infoText}>{phone}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Location:</Text>
              <Text style={styles.infoText}>{location ? `Lat: ${location.latitude.toFixed(4)}, Lon: ${location.longitude.toFixed(4)}` : '-'}</Text>
            </View>
            {address ? <View style={styles.infoItem}><Text style={styles.infoLabel}>Address:</Text><Text style={styles.infoText}>{address}</Text></View> : null}
            <Button title="Edit Profile" onPress={() => setEditing(true)} />
          </>
        )}
      </View>
      {/* Nearby Vendors List */}
      {vendors.length > 0 && (
        <View style={{ paddingHorizontal: 20, paddingBottom: 10 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 6 }}>Vendors Near You</Text>
          {vendors.map((vendor) => (
            <View key={vendor.user_id} style={{ marginBottom: 8, backgroundColor: '#fff', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#eee' }}>
              <Text style={{ fontWeight: '600', fontSize: 15 }}>{vendor.shop_name}</Text>
              <Text style={{ color: '#6B7280', fontSize: 13 }}>{vendor.location_name}</Text>
              <Text style={{ color: '#F97316', fontSize: 12 }}>Distance: {vendor.distance ? vendor.distance.toFixed(2) + ' km' : '-'}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.actions}>
        <Button
          title="Logout"
          onPress={handleLogout}
          variant="danger"
          size="large"
          icon={<LogOut color="#ffffff" size={20} />}
        />
      </View>

      {/* Map Picker Modal */}
      <Modal visible={mapVisible} animationType="slide">
        <SafeAreaView style={{ flex: 1 }}>
          <MapView
            style={{ flex: 1 }}
            initialRegion={{
              latitude: location?.latitude || 17.385044,
              longitude: location?.longitude || 78.486671,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            region={location ? {
              latitude: location.latitude,
              longitude: location.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            } : undefined}
            onPress={e => setLocation(e.nativeEvent.coordinate)}
          >
            {location && <Marker coordinate={location} />}
          </MapView>
          <Button title="Done" onPress={() => setMapVisible(false)} />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    paddingVertical: 20,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  role: {
    fontSize: 16,
    color: '#F97316',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  profileInfo: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    gap: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoLabel: {
    fontWeight: '600',
    color: '#374151',
    marginRight: 8,
    minWidth: 80,
  },
  infoText: {
    fontSize: 16,
    color: '#6b7280',
    flex: 1,
    flexWrap: 'wrap',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    fontSize: 16,
    color: '#111827',
  },
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  locationText: {
    fontSize: 14,
    color: '#F97316',
    marginLeft: 4,
  },
  actions: {
    gap: 16,
  },
}); 