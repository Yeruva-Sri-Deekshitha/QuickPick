import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Clock } from 'lucide-react-native';

interface CountdownTimerProps {
  expiryTime: string;
  onExpire?: () => void;
  size?: 'small' | 'medium' | 'large';
}

export default function CountdownTimer({ 
  expiryTime, 
  onExpire, 
  size = 'medium' 
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
    total: 0
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const total = Date.parse(expiryTime) - Date.now();
      
      if (total <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, total: 0 });
        onExpire?.();
        clearInterval(timer);
        return;
      }

      const seconds = Math.floor((total / 1000) % 60);
      const minutes = Math.floor((total / 1000 / 60) % 60);
      const hours = Math.floor(total / (1000 * 60 * 60));

      setTimeLeft({ hours, minutes, seconds, total });
    }, 1000);

    return () => clearInterval(timer);
  }, [expiryTime, onExpire]);

  const isExpired = timeLeft.total <= 0;
  const isUrgent = timeLeft.total <= 30 * 60 * 1000; // 30 minutes

  const containerStyle = [
    styles.container,
    styles[size],
    isExpired && styles.expired,
    isUrgent && !isExpired && styles.urgent
  ];

  const textStyle = [
    styles.text,
    styles[`${size}Text`],
    isExpired && styles.expiredText,
    isUrgent && !isExpired && styles.urgentText
  ];

  if (isExpired) {
    return (
      <View style={containerStyle}>
        <Clock color="#EF4444" size={size === 'small' ? 14 : size === 'large' ? 20 : 16} />
        <Text style={textStyle}>Expired</Text>
      </View>
    );
  }

  const formatTime = (time: number) => time.toString().padStart(2, '0');

  return (
    <View style={containerStyle}>
      <Clock 
        color={isUrgent ? '#F59E0B' : '#6B7280'} 
        size={size === 'small' ? 14 : size === 'large' ? 20 : 16} 
      />
      <Text style={textStyle}>
        {timeLeft.hours > 0 && `${formatTime(timeLeft.hours)}:`}
        {formatTime(timeLeft.minutes)}:{formatTime(timeLeft.seconds)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  small: {
    gap: 4,
  },
  medium: {
    gap: 6,
  },
  large: {
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  urgent: {
    backgroundColor: '#FEF3C7',
  },
  expired: {
    backgroundColor: '#FEE2E2',
  },
  text: {
    fontWeight: '600',
    color: '#6B7280',
  },
  smallText: {
    fontSize: 12,
  },
  mediumText: {
    fontSize: 14,
  },
  largeText: {
    fontSize: 16,
  },
  urgentText: {
    color: '#F59E0B',
  },
  expiredText: {
    color: '#EF4444',
  },
});