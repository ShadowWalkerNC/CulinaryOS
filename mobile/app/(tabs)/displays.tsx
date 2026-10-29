import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../lib/store';
import type { MobileDisplayDevice } from '../../lib/api';

const DISPLAY_MODES: Array<{ id: MobileDisplayDevice['assignedMode']; label: string }> = [
  { id: 'kitchen', label: 'Kitchen KDS' },
  { id: 'manager', label: 'Manager Wallboard' },
  { id: 'staff', label: 'Staff Shift Board' },
  { id: 'guest', label: 'Digital Menu' },
  { id: 'pickup', label: 'Order Pickup' },
  { id: 'marketing', label: 'Promo Signage' },
];

/**
 * Mobile TV Display Pairing & Remote Control Hub
 * Pairs Walmart onn. 4K Android TV boxes using the 6-digit PIN from PairingView.tsx
 * and switches live TV modes remotely.
 */
export default function DisplaysScreen() {
  const { displays, pairDisplay, switchDisplayMode } = useAppStore();
  const [pairingCode, setPairingCode] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('Main Kitchen TV (onn. 4K)');
  const [selectedMode, setSelectedMode] = useState<MobileDisplayDevice['assignedMode']>('kitchen');
  const [selectedBrand, setSelectedBrand] = useState<'culinaryos' | 'cheezies'>('culinaryos');
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  const handlePairTv = async () => {
    if (pairingCode.replace(/\s+/g, '').length < 6) {
      setStatusBanner('Enter the 6-digit code shown on the Android TV screen.');
      return;
    }
    const paired = await pairDisplay(pairingCode, displayName, selectedMode, 'all', selectedBrand);
    setPairingCode('');
    setStatusBanner(`Paired "${paired.name}" to ${paired.assignedMode.toUpperCase()} mode!`);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={{ color: '#ffffff', fontSize: 22, fontWeight: '800' }}>Android TV & Displays</Text>
        <Text style={{ color: '#888888', fontSize: 12, marginTop: 2, marginBottom: 16 }}>
          Pair Walmart onn. 4K TVs & CleanMyTV Kiosks with 6-Digit PIN
        </Text>

        {/* Pair New Television Card */}
        <View
          style={{
            backgroundColor: '#141416',
            borderRadius: 14,
            padding: 16,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: '#f9731650',
          }}
        >
          <Text style={{ color: '#f97316', fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 10 }}>
            PAIR NEW TELEVISION
          </Text>

          <TextInput
            value={pairingCode}
            onChangeText={setPairingCode}
            placeholder="6-Digit TV Pairing Code (e.g. 726419)"
            placeholderTextColor="#666666"
            keyboardType="number-pad"
            maxLength={7}
            style={{
              backgroundColor: '#0a0a0c',
              color: '#ffffff',
              borderRadius: 10,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontSize: 18,
              fontWeight: '800',
              letterSpacing: 3,
              borderWidth: 1,
              borderColor: '#2a2a2e',
              marginBottom: 10,
            }}
          />

          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="TV Name (e.g. Expo Pass KDS)"
            placeholderTextColor="#666666"
            style={{
              backgroundColor: '#0a0a0c',
              color: '#ffffff',
              borderRadius: 10,
              paddingHorizontal: 14,
              paddingVertical: 10,
              fontSize: 14,
              borderWidth: 1,
              borderColor: '#2a2a2e',
              marginBottom: 12,
            }}
          />

          {/* Brand Toggle */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            {(['culinaryos', 'cheezies'] as const).map((brand) => (
              <TouchableOpacity
                key={brand}
                onPress={() => setSelectedBrand(brand)}
                style={{
                  flex: 1,
                  minHeight: 48,
                  borderRadius: 10,
                  backgroundColor: selectedBrand === brand ? '#f97316' : '#1f1f24',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '800' }}>
                  {brand === 'culinaryos' ? 'CulinaryOS Core' : 'Cheezies Truck'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Mode Chips */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {DISPLAY_MODES.map((m) => (
              <TouchableOpacity
                key={m.id}
                onPress={() => setSelectedMode(m.id)}
                style={{
                  paddingHorizontal: 12,
                  minHeight: 44,
                  borderRadius: 8,
                  backgroundColor: selectedMode === m.id ? '#f9731625' : '#1c1c20',
                  borderWidth: 1,
                  borderColor: selectedMode === m.id ? '#f97316' : '#2a2a2e',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    color: selectedMode === m.id ? '#f97316' : '#aaaaaa',
                    fontSize: 12,
                    fontWeight: '700',
                  }}
                >
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            onPress={handlePairTv}
            style={{
              backgroundColor: '#f97316',
              minHeight: 50,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: '800' }}>Pair Android TV Display</Text>
          </TouchableOpacity>

          {statusBanner && (
            <Text style={{ color: '#22c55e', fontSize: 12, fontWeight: '700', marginTop: 10 }}>
              {statusBanner}
            </Text>
          )}
        </View>

        {/* Active Paired TVs */}
        <Text style={{ color: '#888888', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 10 }}>
          Active Paired Televisions ({displays.length})
        </Text>

        {displays.map((tv) => (
          <View
            key={tv.id}
            style={{
              backgroundColor: '#141416',
              borderRadius: 14,
              padding: 16,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: '#222222',
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <View>
                <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '800' }}>{tv.name}</Text>
                <Text style={{ color: '#888888', fontSize: 12 }}>
                  Mode: {tv.assignedMode.toUpperCase()} ({tv.assignedView}) • v{tv.appVersion}
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: tv.online ? '#22c55e20' : '#ef444420',
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 6,
                }}
              >
                <Text style={{ color: tv.online ? '#22c55e' : '#ef4444', fontSize: 11, fontWeight: '800' }}>
                  {tv.online ? 'ONLINE' : 'OFFLINE'}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {DISPLAY_MODES.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => switchDisplayMode(tv.id, m.id, 'all')}
                  style={{
                    paddingHorizontal: 10,
                    minHeight: 40,
                    borderRadius: 8,
                    backgroundColor: tv.assignedMode === m.id ? '#3b82f6' : '#1f1f24',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '700' }}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
