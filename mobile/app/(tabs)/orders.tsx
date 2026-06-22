import { View, Text, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function OrdersScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
      <View style={{ padding: 16 }}>
        <Text style={{ color: '#ffffff', fontSize: 20, fontWeight: '700', marginBottom: 16 }}>Open Orders</Text>
        <View style={{ backgroundColor: '#111111', borderRadius: 12, padding: 32, alignItems: 'center' }}>
          <Text style={{ color: '#444444', fontSize: 14 }}>No open orders</Text>
          <Text style={{ color: '#333333', fontSize: 12, marginTop: 4 }}>Connect to your CulinaryOS backend to see live orders</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
