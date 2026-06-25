import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DashboardScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={{ color: '#ffffff', fontSize: 24, fontWeight: '700', marginBottom: 4 }}>CulinaryOS</Text>
        <Text style={{ color: '#888888', fontSize: 14, marginBottom: 24 }}>Restaurant Operations Dashboard</Text>

        {/* Stat Cards */}
        {[
          { label: 'Open Orders', value: '—', accent: '#f97316' },
          { label: 'Low Stock Items', value: '—', accent: '#ef4444' },
          { label: "Today's Revenue", value: '—', accent: '#22c55e' },
          { label: 'Active Tables', value: '—', accent: '#3b82f6' },
        ].map((card) => (
          <View
            key={card.label}
            style={{ backgroundColor: '#111111', borderRadius: 12, padding: 16, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: card.accent }}
          >
            <Text style={{ color: '#888888', fontSize: 12, marginBottom: 4 }}>{card.label}</Text>
            <Text style={{ color: '#ffffff', fontSize: 28, fontWeight: '700' }}>{card.value}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
