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
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, Lock, ArrowRight } from 'lucide-react-native';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }
    if (!password.trim()) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and a number';
    } else if (!/(?=.*[!@#$%^&*])/.test(password)) {
      newErrors.password = 'Password must contain at least one special character (!@#$%^&*)';
    } else if ([
      'password', '12345678', 'qwerty', 'letmein', 'welcome'
    ].includes(password.toLowerCase())) {
      newErrors.password = 'Password is too common. Please choose a stronger password.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await login(email.trim(), password);
      
      if (response.success) {
        // Navigation is handled by the AuthContext useEffect
      } else {
        Alert.alert('Login Failed', response.message);
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
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              Sign in to your QuickPick account
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Email"
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              icon={<Mail color="#9CA3AF" size={20} />}
              error={errors.email}
            />

            <Input
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              isPassword
              icon={<Lock color="#9CA3AF" size={20} />}
              error={errors.password}
            />

            <Button
              title="Sign In"
              onPress={handleLogin}
              loading={loading}
              size="large"
              icon={<ArrowRight color="#ffffff" size={20} />}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Don't have an account?{' '}
            </Text>
            <Button
              title="Create Account"
              onPress={() => router.push('/auth/register')}
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