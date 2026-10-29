import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../lib/store';

/**
 * ADR-0011: Unified Mobile Barcode / SKU Scan & Par Stock Receiver
 * Consolidates pantry receiving, invoice line lookup, and 48px ergonomic stock adjustments.
 */
export default function ScanScreen() {
  const { inventory, adjustInventoryStock } = useAppStore();
  const [query, setQuery] = useState<string>('');
  const [lastScannedBanner, setLastScannedBanner] = useState<string | null>(null);

  const matchedItems = inventory.filter((item) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      (item.sku && item.sku.toLowerCase().includes(q)) ||
      (item.supplier && item.supplier.toLowerCase().includes(q))
    );
  });

  const handleQuickAdjust = (itemId: string, itemName: string, delta: number) => {
    adjustInventoryStock(itemId, delta);
    const sign = delta > 0 ? `+${delta}` : `${delta}`;
    setLastScannedBanner(`Synced ${itemName} (${sign}) to Pantry Bus`);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
      <View style={{ padding: 16, flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <View>
            <Text style={{ color: '#ffffff', fontSize: 22, fontWeight: '800' }}>Scan & Receive</Text>
            <Text style={{ color: '#888888', fontSize: 12, marginTop: 2 }}>
              ADR-0011 Barcode / SKU Lookup & Par Adjustment
            </Text>
          </View>
          <View
            style={{
              backgroundColor: '#f9731620',
              borderColor: '#f97316',
              borderWidth: 1,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: '#f97316', fontSize: 11, fontWeight: '800' }}>SCAN READY</Text>
          </View>
        </View>

        {/* Barcode / SKU Search Input */}
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Scan barcode or type SKU / Ingredient (e.g. SKU-11204)..."
          placeholderTextColor="#666666"
          style={{
            backgroundColor: '#141416',
            color: '#ffffff',
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 14,
            borderWidth: 1,
            borderColor: '#2a2a2e',
            marginBottom: 12,
          }}
        />

        {lastScannedBanner && (
          <View
            style={{
              backgroundColor: '#22c55e20',
              borderColor: '#22c55e',
              borderWidth: 1,
              borderRadius: 10,
              padding: 10,
              marginBottom: 12,
            }}
          >
            <Text style={{ color: '#22c55e', fontSize: 12, fontWeight: '700' }}>✔ {lastScannedBanner}</Text>
          </View>
        )}

        <FlatList
          data={matchedItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View
              style={{
                backgroundColor: '#141416',
                borderRadius: 14,
                padding: 16,
                marginBottom: 10,
                borderWidth: 1,
                borderColor: item.is_low_stock ? '#ef444450' : '#222222',
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={{ color: '#f97316', fontSize: 11, fontWeight: '800' }}>
                    {item.sku || 'SKU-STD'} • {item.supplier || 'Dennis Food Service'}
                  </Text>
                  <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '700', marginTop: 2 }}>{item.name}</Text>
                  <Text style={{ color: item.is_low_stock ? '#ef4444' : '#888888', fontSize: 12, marginTop: 4 }}>
                    On Hand: {item.quantity} {item.unit} (Par: {item.par_level})
                  </Text>
                </View>

                {/* 48x48px Physical Touch Steppers (Rule 13) */}
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <TouchableOpacity
                    onPress={() => handleQuickAdjust(item.id, item.name, -1)}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 10,
                      backgroundColor: '#ef444420',
                      borderWidth: 1,
                      borderColor: '#ef4444',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: '#ef4444', fontSize: 18, fontWeight: '800' }}>-1</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleQuickAdjust(item.id, item.name, 1)}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 10,
                      backgroundColor: '#22c55e20',
                      borderWidth: 1,
                      borderColor: '#22c55e',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: '#22c55e', fontSize: 18, fontWeight: '800' }}>+1</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleQuickAdjust(item.id, item.name, 5)}
                    style={{
                      minWidth: 54,
                      height: 48,
                      paddingHorizontal: 10,
                      borderRadius: 10,
                      backgroundColor: '#3b82f620',
                      borderWidth: 1,
                      borderColor: '#3b82f6',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: '#3b82f6', fontSize: 14, fontWeight: '800' }}>+Case</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}
