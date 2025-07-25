import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { AuthService, RegisterData } from '@/services/authService';
import { User, Mail, Lock, Phone, ArrowRight } from 'lucide-react-native';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function RegisterScreen() {
  const [formData, setFormData] = useState<RegisterData>({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'buyer'
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await AuthService.register({
        ...formData,
        phone: formData.phone.replace(/\D/g, '') // Remove non-digits
      });
      
      if (response.success) {
        // Navigate to OTP verification with form data
        router.push({
          pathname: '/auth/verify-otp',
          params: { 
            phone: formData.phone.replace(/\D/g, ''),
            userData: JSON.stringify(formData)
          }
        });
      } else {
        Alert.alert('Registration Failed', response.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: keyof RegisterData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Join QuickPick and start discovering great deals
            </Text>
          </View>

          <View style={styles.roleSelector}>
            <Text style={styles.roleLabel}>I want to:</Text>
            <View style={styles.roleButtons}>
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  formData.role === 'buyer' && styles.roleButtonActive
                ]}
                onPress={() => updateFormData('role', 'buyer')}
              >
                <Text style={[
                  styles.roleButtonText,
                  formData.role === 'buyer' && styles.roleButtonTextActive
                ]}>
                  Buy Deals
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  formData.role === 'vendor' && styles.roleButtonActive
                ]}
                onPress={() => updateFormData('role', 'vendor')}
              >
                <Text style={[
                  styles.roleButtonText,
                  formData.role === 'vendor' && styles.roleButtonTextActive
                ]}>
                  Sell Deals
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.form}>
            <Input
              label="Full Name"
              placeholder="Enter your full name"
              value={formData.name}
              onChangeText={(value) => updateFormData('name', value)}
              icon={<User color="#9CA3AF" size={20} />}
              error={errors.name}
            />

            <Input
              label="Email"
              placeholder="Enter your email"
              value={formData.email}
              onChangeText={(value) => updateFormData('email', value)}
              keyboardType="email-address"
              autoCapitalize="none"
              icon={<Mail color="#9CA3AF" size={20} />}
              error={errors.email}
            />

            <Input
              label="Phone Number"
              placeholder="Enter 10-digit phone number"
              value={formData.phone}
              onChangeText={(value) => updateFormData('phone', value)}
              keyboardType="phone-pad"
              maxLength={10}
              icon={<Phone color="#9CA3AF" size={20} />}
              error={errors.phone}
            />

            <Input
              label="Password"
              placeholder="Create a password"
              value={formData.password}
              onChangeText={(value) => updateFormData('password', value)}
              isPassword
              icon={<Lock color="#9CA3AF" size={20} />}
              error={errors.password}
            />

            <Input
              label="Confirm Password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              isPassword
              icon={<Lock color="#9CA3AF" size={20} />}
              error={errors.confirmPassword}
            />

            <Button
              title="Create Account"
              onPress={handleRegister}
              loading={loading}
              size="large"
              icon={<ArrowRight color="#ffffff" size={20} />}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Already have an account?{' '}
            </Text>
            <Button
              title="Sign In"
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
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  roleSelector: {
    marginBottom: 24,
  },
  roleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
  },
  roleButtonActive: {
    borderColor: '#F97316',
    backgroundColor: '#FEF3C7',
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  roleButtonTextActive: {
    color: '#F97316',
  },
  form: {
    gap: 8,
    marginBottom: 32,
  },
  footer: {
    alignItems: 'center',
    gap: 16,
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
  },
});