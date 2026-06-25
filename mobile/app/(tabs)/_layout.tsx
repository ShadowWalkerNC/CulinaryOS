import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { backgroundColor: '#111111', borderTopColor: '#222222' },
        tabBarActiveTintColor: '#f97316',
        tabBarInactiveTintColor: '#666666',
        headerStyle: { backgroundColor: '#0a0a0a' },
        headerTintColor: '#ffffff',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Dashboard', tabBarIcon: ({ color }) => <Ionicons name="grid-outline" size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="orders"
        options={{ title: 'Orders', tabBarIcon: ({ color }) => <Ionicons name="receipt-outline" size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="inventory"
        options={{ title: 'Inventory', tabBarIcon: ({ color }) => <Ionicons name="cube-outline" size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="menu"
        options={{ title: 'Menu', tabBarIcon: ({ color }) => <Ionicons name="restaurant-outline" size={22} color={color} /> }}
      />
    </Tabs>
  );
}
