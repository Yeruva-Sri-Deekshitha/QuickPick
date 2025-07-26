import { Tabs } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ShoppingBag, Store, User } from 'lucide-react-native';

export default function TabLayout() {
  const { user } = useAuth();
  
  if (!user) return null;

  const isVendor = user.profile.role === 'vendor';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e5e5e5',
          paddingBottom: 8,
          paddingTop: 8,
          height: 70,
        },
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#6B7280',
      }}>
      {isVendor ? (
        <>
          <Tabs.Screen
            name="vendor"
            options={{
              title: 'Dashboard',
              tabBarIcon: ({ size, color }) => (
                <Store color={color} size={size} />
              ),
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: 'Profile',
              tabBarIcon: ({ size, color }) => (
                <User color={color} size={size} />
              ),
            }}
          />
        </>
      ) : (
        <>
          <Tabs.Screen
            name="buyer"
            options={{
              title: 'Discover',
              tabBarIcon: ({ size, color }) => (
                <ShoppingBag color={color} size={size} />
              ),
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: 'Profile',
              tabBarIcon: ({ size, color }) => (
                <User color={color} size={size} />
              ),
            }}
          />
        </>
      )}
      
      {/* Hide unused screens */}
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}