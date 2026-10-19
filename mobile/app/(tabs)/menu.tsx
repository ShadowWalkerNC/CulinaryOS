import { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../lib/store';

export default function MenuScreen() {
  const { menu, toggleMenuAvailability, loading, loadData } = useAppStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', 'Starters', 'Mains', 'Beverages'];

  const filteredMenu =
    selectedCategory === 'All'
      ? menu
      : menu.filter((item) => item.category.toLowerCase() === selectedCategory.toLowerCase());

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
      <View style={{ padding: 16, flex: 1 }}>
        <Text style={{ color: '#ffffff', fontSize: 22, fontWeight: '800', marginBottom: 12 }}>
          Menu Catalog
        </Text>

        {/* Category Filter Chips */}
        <View style={{ marginBottom: 14 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setSelectedCategory(cat)}
                  style={{
                    backgroundColor: selectedCategory === cat ? '#f97316' : '#1a1a1c',
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: selectedCategory === cat ? '#f97316' : '#2a2a2c',
                  }}
                >
                  <Text
                    style={{
                      color: selectedCategory === cat ? '#ffffff' : '#888888',
                      fontSize: 13,
                      fontWeight: '700',
                    }}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Menu Items List */}
        <FlatList
          data={filteredMenu}
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
                borderColor: '#222222',
                opacity: item.is_available ? 1 : 0.5,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '700' }}>{item.name}</Text>
                  <Text style={{ color: '#777777', fontSize: 12, marginTop: 4 }} numberOfLines={2}>
                    {item.description}
                  </Text>
                  <Text style={{ color: '#f97316', fontSize: 15, fontWeight: '800', marginTop: 8 }}>
                    ${(item.price_cents / 100).toFixed(2)}
                  </Text>
                </View>

                {/* 86 Availability Toggle Button */}
                <TouchableOpacity
                  onPress={() => toggleMenuAvailability(item.id)}
                  style={{
                    backgroundColor: item.is_available ? '#22c55e20' : '#ef444420',
                    borderWidth: 1,
                    borderColor: item.is_available ? '#22c55e' : '#ef4444',
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 8,
                    alignItems: 'center',
                    minWidth: 72,
                    minHeight: 44, // 48px touch target
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: item.is_available ? '#22c55e' : '#ef4444',
                      fontSize: 12,
                      fontWeight: '800',
                    }}
                  >
                    {item.is_available ? 'IN STOCK' : '86\'D'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}
