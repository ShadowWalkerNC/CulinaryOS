import { View, Text, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../lib/store';

export default function InventoryScreen() {
  const { inventory, loading, loadData } = useAppStore();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
      <View style={{ padding: 16, flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ color: '#ffffff', fontSize: 22, fontWeight: '800' }}>Pantry & Inventory</Text>
          <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '700' }}>
            {inventory.filter((i) => i.is_low_stock).length} Low Par
          </Text>
        </View>

        <FlatList
          data={inventory}
          keyExtractor={(item) => item.id}
          refreshing={loading}
          onRefresh={loadData}
          renderItem={({ item }) => (
            <View
              style={{
                backgroundColor: '#141416',
                borderRadius: 14,
                padding: 16,
                marginBottom: 10,
                borderWidth: 1,
                borderColor: item.is_low_stock ? '#ef444440' : '#222222',
                borderLeftWidth: 4,
                borderLeftColor: item.is_low_stock ? '#ef4444' : '#22c55e',
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '700' }}>{item.name}</Text>
                  <Text style={{ color: '#777777', fontSize: 12, marginTop: 4 }}>
                    Unit Cost: ${(item.cost_cents / 100).toFixed(2)} / {item.unit}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '800' }}>
                    {item.quantity} <Text style={{ fontSize: 12, color: '#888888' }}>{item.unit}</Text>
                  </Text>
                  <Text style={{ color: item.is_low_stock ? '#ef4444' : '#666666', fontSize: 11, fontWeight: '600', marginTop: 2 }}>
                    Par: {item.par_level} {item.is_low_stock ? '• LOW STOCK' : ''}
                  </Text>
                </View>
              </View>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}
