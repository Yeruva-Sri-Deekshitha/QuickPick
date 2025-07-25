import { Tabs } from 'expo-router';
import { ShoppingBag, Package, User } from 'lucide-react-native';

export default function BuyerLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { height: 70, paddingBottom: 8, paddingTop: 8 },
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#6B7280',
      }}>
      <Tabs.Screen
        name="buyer"
        options={{ title: 'Discover', tabBarIcon: ({ color, size }) => <ShoppingBag color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="buyer-orders"
        options={{ title: 'My Orders', tabBarIcon: ({ color, size }) => <Package color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }}
      />
    </Tabs>
  );
}
