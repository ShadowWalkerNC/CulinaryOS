import { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../lib/store';

export default function DashboardScreen() {
  const { user, orders, inventory, loading, loadData, login } = useAppStore();

  useEffect(() => {
    loadData();
  }, []);

  const openOrdersCount = orders.filter((o) => o.status !== 'paid' && o.status !== 'voided').length;
  const lowStockCount = inventory.filter((i) => i.is_low_stock).length;
  const todayRevenueCents = orders
    .filter((o) => o.status === 'paid' || o.status === 'ready' || o.status === 'fired')
    .reduce((sum, o) => sum + o.total_cents, 0);

  const formattedRevenue = `$${(todayRevenueCents / 100).toFixed(2)}`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} tintColor="#f97316" />}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <View>
            <Text style={{ color: '#ffffff', fontSize: 22, fontWeight: '800' }}>CulinaryOS Mobile</Text>
            <Text style={{ color: '#f97316', fontSize: 13, fontWeight: '600' }}>
              {user ? `${user.name} (${user.role.toUpperCase()})` : 'Offline Mode'}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => login(user?.role === 'manager' ? '1234' : '5678')}
            style={{
              backgroundColor: '#1f1f1f',
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#333333',
            }}
          >
            <Text style={{ color: '#aaaaaa', fontSize: 12, fontWeight: '600' }}>
              Switch to {user?.role === 'manager' ? 'Server' : 'Manager'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Operational Stat Cards */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: '#888888', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', marginBottom: 10, letterSpacing: 1 }}>
            Live Shift Telemetry
          </Text>

          {[
            { label: 'Active Kitchen Tickets', value: `${openOrdersCount} Orders`, accent: '#f97316', desc: 'Dining room & bar flow' },
            { label: "Today's Net Sales", value: formattedRevenue, accent: '#22c55e', desc: 'Pre-tax gross receipt balance' },
            { label: 'Low Stock Par Warnings', value: `${lowStockCount} Items`, accent: '#ef4444', desc: 'Below minimum kitchen threshold' },
            { label: 'Active Floor Tables', value: '6 Occupied', accent: '#3b82f6', desc: 'Dining room, bar & patio' },
          ].map((card) => (
            <View
              key={card.label}
              style={{
                backgroundColor: '#141416',
                borderRadius: 14,
                padding: 16,
                marginBottom: 12,
                borderLeftWidth: 4,
                borderLeftColor: card.accent,
                borderWidth: 1,
                borderColor: '#222222',
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Text style={{ color: '#888888', fontSize: 13 }}>{card.label}</Text>
                <Text style={{ color: '#ffffff', fontSize: 24, fontWeight: '800' }}>{card.value}</Text>
              </View>
              <Text style={{ color: '#555555', fontSize: 11, marginTop: 4 }}>{card.desc}</Text>
            </View>
          ))}
        </View>

        {/* Quick Operational Status */}
        <View style={{ backgroundColor: '#141416', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#222222' }}>
          <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: '700', marginBottom: 8 }}>
            Hardware & Connectivity
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ color: '#888888', fontSize: 13 }}>Thermal Printer:</Text>
            <Text style={{ color: '#22c55e', fontSize: 13, fontWeight: '600' }}>Star TSP143IV (Online)</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ color: '#888888', fontSize: 13 }}>Payment Gateway:</Text>
            <Text style={{ color: '#22c55e', fontSize: 13, fontWeight: '600' }}>Stripe Connect (SAQ-A)</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: '#888888', fontSize: 13 }}>Local Event Bus:</Text>
            <Text style={{ color: '#f97316', fontSize: 13, fontWeight: '600' }}>100% Offline Ready</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
