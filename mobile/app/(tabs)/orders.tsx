import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../lib/store';
import type { MobileOrder } from '../../lib/api';

export default function OrdersScreen() {
  const { orders, bumpOrder, loading, loadData } = useAppStore();

  const getStatusColor = (status: MobileOrder['status']) => {
    switch (status) {
      case 'fired': return '#f97316';
      case 'ready': return '#22c55e';
      case 'paid': return '#3b82f6';
      default: return '#888888';
    }
  };

  const handleNextStatus = (order: MobileOrder) => {
    if (order.status === 'fired' || order.status === 'pending') {
      bumpOrder(order.id, 'ready');
    } else if (order.status === 'ready') {
      bumpOrder(order.id, 'paid');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
      <View style={{ padding: 16, flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ color: '#ffffff', fontSize: 22, fontWeight: '800' }}>Active Orders</Text>
          <Text style={{ color: '#f97316', fontSize: 13, fontWeight: '700' }}>
            {orders.length} Tickets
          </Text>
        </View>

        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          refreshing={loading}
          onRefresh={loadData}
          ListEmptyComponent={
            <View style={{ backgroundColor: '#141416', borderRadius: 14, padding: 32, alignItems: 'center', marginTop: 20 }}>
              <Text style={{ color: '#777777', fontSize: 16, fontWeight: '600' }}>No active orders</Text>
              <Text style={{ color: '#444444', fontSize: 13, marginTop: 4 }}>New tickets will appear here live</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View
              style={{
                backgroundColor: '#141416',
                borderRadius: 14,
                padding: 16,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: '#222222',
              }}
            >
              {/* Order Card Header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '800' }}>{item.table_number}</Text>
                    <Text style={{ color: '#888888', fontSize: 13, fontWeight: '600' }}>{item.order_number}</Text>
                  </View>
                  <Text style={{ color: '#666666', fontSize: 12, marginTop: 2 }}>Server: {item.server_name}</Text>
                </View>

                <View
                  style={{
                    backgroundColor: `${getStatusColor(item.status)}20`,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 6,
                  }}
                >
                  <Text style={{ color: getStatusColor(item.status), fontSize: 12, fontWeight: '800', textTransform: 'uppercase' }}>
                    {item.status}
                  </Text>
                </View>
              </View>

              {/* Order Items */}
              <View style={{ borderTopWidth: 1, borderTopColor: '#222222', paddingTop: 10, marginBottom: 12 }}>
                {item.items.map((line) => (
                  <View key={line.id} style={{ marginBottom: 6 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: '#dddddd', fontSize: 14, fontWeight: '500' }}>
                        {line.quantity}x {line.name}
                      </Text>
                      <Text style={{ color: '#888888', fontSize: 13 }}>
                        ${((line.price_cents * line.quantity) / 100).toFixed(2)}
                      </Text>
                    </View>
                    {line.modifiers && line.modifiers.length > 0 && (
                      <Text style={{ color: '#f97316', fontSize: 12, marginTop: 1 }}>
                        • {line.modifiers.join(', ')}
                      </Text>
                    )}
                  </View>
                ))}
              </View>

              {/* Order Card Footer */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#222222', paddingTop: 10 }}>
                <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '800' }}>
                  Total: ${(item.total_cents / 100).toFixed(2)}
                </Text>

                {item.status !== 'paid' && item.status !== 'voided' && (
                  <TouchableOpacity
                    onPress={() => handleNextStatus(item)}
                    style={{
                      backgroundColor: item.status === 'ready' ? '#3b82f6' : '#22c55e',
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 8,
                      minHeight: 44, // 48px touch target
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '700' }}>
                      {item.status === 'ready' ? 'Close & Pay →' : 'Mark Ready ✔'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}
