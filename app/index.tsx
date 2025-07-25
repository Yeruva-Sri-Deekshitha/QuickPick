import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ShoppingBag, MapPin, Clock } from 'lucide-react-native';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function WelcomeScreen() {
  const { user, loading } = useAuth();

  useEffect(() => {
  if (!loading && user && user.profile) {
    if (user.profile.role === 'vendor') {
      router.replace('/(vendor)/vendor');
    } else {
      router.replace('/(buyer)/buyer');
    }
  }
}, [user, loading]);

  if (loading) {
    return <LoadingSpinner message="Loading QuickPick..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <ShoppingBag color="#F97316" size={48} />
          </View>
          <Text style={styles.title}>QuickPick</Text>
          <Text style={styles.subtitle}>
            Discover discounted perishable food deals from local vendors near you
          </Text>
        </View>

        <View style={styles.features}>
          <View style={styles.feature}>
            <MapPin color="#3B82F6" size={24} />
            <Text style={styles.featureTitle}>Location-Based</Text>
            <Text style={styles.featureText}>
              Find deals within 5km radius of your location
            </Text>
          </View>

          <View style={styles.feature}>
            <Clock color="#059669" size={24} />
            <Text style={styles.featureTitle}>Real-Time Updates</Text>
            <Text style={styles.featureText}>
              Live deal status and countdown timers
            </Text>
          </View>

          <View style={styles.feature}>
            <ShoppingBag color="#F97316" size={24} />
            <Text style={styles.featureTitle}>Great Savings</Text>
            <Text style={styles.featureText}>
              Up to 70% off on fresh perishable items
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            title="Get Started"
            onPress={() => router.push('/auth')}
            size="large"
          />
          
          <Text style={styles.guestText}>
            New to QuickPick? Join as a buyer or vendor to start saving!
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },
  features: {
    gap: 32,
  },
  feature: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 12,
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  actions: {
    gap: 16,
  },
  guestText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
});