import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { AuthService, RegisterData } from '@/services/authService';
import { Shield, ArrowRight } from 'lucide-react-native';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function VerifyOTPScreen() {
  const { phone, userData } = useLocalSearchParams();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const parsedUserData: RegisterData = userData ? JSON.parse(userData as string) : null;

  const handleVerifyOTP = async () => {
    if (!otp.trim()) {
      Alert.alert('Error', 'Please enter the OTP');
      return;
    }

    if (!parsedUserData) {
      Alert.alert('Error', 'Registration data not found');
      return;
    }

    setLoading(true);
    try {
      const response = await AuthService.completeRegistration(parsedUserData, otp);
      
      if (response.success) {
        Alert.alert('Success!', 'Account created successfully!', [
          { 
            text: 'OK', 
            onPress: () => router.replace('/auth') 
          }
        ]);
      } else {
        Alert.alert('Verification Failed', response.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Shield color="#F97316" size={48} />
            </View>
            <Text style={styles.title}>Verify Phone Number</Text>
            <Text style={styles.subtitle}>
              We've sent a 6-digit OTP to {phone}
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Enter OTP"
              placeholder="000000"
              value={otp}
              onChangeText={setOtp}
              keyboardType="numeric"
              maxLength={6}
              style={styles.otpInput}
            />

            <Button
              title="Verify & Create Account"
              onPress={handleVerifyOTP}
              loading={loading}
              size="large"
              icon={<ArrowRight color="#ffffff" size={20} />}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Check the console for the OTP code during testing
            </Text>
            <Button
              title="Back to Registration"
              onPress={() => router.back()}
              variant="outline"
              size="medium"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  form: {
    gap: 24,
    marginBottom: 32,
  },
  otpInput: {
    textAlign: 'center',
    fontSize: 24,
    letterSpacing: 8,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    gap: 16,
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});