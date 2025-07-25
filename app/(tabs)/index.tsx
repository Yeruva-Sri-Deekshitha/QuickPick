import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OTPService } from '@/services/otpService';
import { Shield, Phone, Lock, ArrowRight } from 'lucide-react-native';

type Step = 'phone' | 'verify';

export default function OTPScreen() {
  const [step, setStep] = useState<Step>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedOTP, setGeneratedOTP] = useState('');

  const handleSendOTP = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Error', 'Please enter a phone number');
      return;
    }

    setLoading(true);
    try {
      const response = await OTPService.sendOTP(phoneNumber);
      
      if (response.success) {
        setGeneratedOTP(response.otp || '');
        setStep('verify');
        Alert.alert(
          'OTP Sent!', 
          'OTP has been generated. Check the console for testing.\n\n' + 
          `For testing: ${response.otp}`
        );
      } else {
        Alert.alert('Error', response.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp.trim()) {
      Alert.alert('Error', 'Please enter the OTP');
      return;
    }

    setLoading(true);
    try {
      const response = await OTPService.verifyOTP(phoneNumber, otp);
      
      if (response.success) {
        Alert.alert('Success!', response.message, [
          { text: 'OK', onPress: () => resetForm() }
        ]);
      } else {
        Alert.alert('Error', response.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep('phone');
    setPhoneNumber('');
    setOtp('');
    setGeneratedOTP('');
  };

  const renderPhoneStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Phone color="#3B82F6" size={48} />
      </View>
      
      <Text style={styles.title}>Enter Phone Number</Text>
      <Text style={styles.subtitle}>
        We'll send you an OTP for verification
      </Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter your phone number"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
          maxLength={15}
        />
      </View>

      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        onPress={handleSendOTP}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : (
          <>
            <Text style={styles.buttonText}>Send OTP</Text>
            <ArrowRight color="#ffffff" size={20} />
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderVerifyStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Lock color="#3B82F6" size={48} />
      </View>
      
      <Text style={styles.title}>Enter OTP</Text>
      <Text style={styles.subtitle}>
        We've sent a 6-digit OTP to {phoneNumber}
      </Text>

      {generatedOTP && (
        <View style={styles.testOTPContainer}>
          <Text style={styles.testOTPLabel}>Test OTP:</Text>
          <Text style={styles.testOTP}>{generatedOTP}</Text>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, styles.otpInput]}
          placeholder="Enter 6-digit OTP"
          value={otp}
          onChangeText={setOtp}
          keyboardType="numeric"
          maxLength={6}
          textAlign="center"
          autoFocus
        />
      </View>

      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        onPress={handleVerifyOTP}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : (
          <>
            <Text style={styles.buttonText}>Verify OTP</Text>
            <Shield color="#ffffff" size={20} />
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.backButton} 
        onPress={resetForm}
      >
        <Text style={styles.backButtonText}>Change Phone Number</Text>
      </TouchableOpacity>
    </View>
  );

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
            <Shield color="#3B82F6" size={32} />
            <Text style={styles.headerTitle}>OTP Verification</Text>
          </View>

          {step === 'phone' ? renderPhoneStep() : renderVerifyStep()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
  },
  stepContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  inputContainer: {
    marginBottom: 24,
  },
  input: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    backgroundColor: '#f9fafb',
  },
  otpInput: {
    fontSize: 24,
    letterSpacing: 8,
    fontWeight: '600',
  },
  testOTPContainer: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  testOTPLabel: {
    fontSize: 14,
    color: '#92400e',
    fontWeight: '500',
  },
  testOTP: {
    fontSize: 16,
    color: '#92400e',
    fontWeight: '700',
  },
  button: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  backButtonText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '500',
  },
});