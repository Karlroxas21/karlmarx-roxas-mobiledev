// src/app/index.tsx — temporary smoke test (replaced in Phase 2)
import { SafeAreaView, ScrollView, Text, View } from 'react-native';

function maskValue(value: string | undefined, isSensitive: boolean): string {
  if (!value || value.startsWith('your_')) return 'NOT SET';
  if (!isSensitive) return value;
  if (value.length <= 4) return '••••';
  return '••••••' + value.slice(-4);
}

export default function SmokeTestScreen() {
  let appKitStatus: { ok: boolean; message: string } = {
    ok: true,
    message: 'OK',
  };

  try {
    // Side-effect import triggers polyfills + createAppKit
    // ENV import inside try/catch so missing vars show on screen, not crash
    require('@/src/lib/appkit');
  } catch (e) {
    appKitStatus = {
      ok: false,
      message: e instanceof Error ? e.message : String(e),
    };
  }

  const reownId = process.env.EXPO_PUBLIC_REOWN_PROJECT_ID;
  const etherscanKey = process.env.EXPO_PUBLIC_ETHERSCAN_API_KEY;
  const rpcUrl = process.env.EXPO_PUBLIC_INFURA_RPC_URL;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1 px-8 py-6">
        <Text className="text-xl font-semibold text-gray-900 mb-6">
          Smoke Test
        </Text>

        {/* AppKit Section */}
        <Text className="text-xs text-gray-500 mb-2 uppercase tracking-wide">
          AppKit
        </Text>
        <View className="bg-gray-100 p-4 rounded-lg mb-6">
          <View className="flex-row justify-between items-center py-2">
            <Text className="text-sm text-gray-900">Status</Text>
            <Text
              className={
                appKitStatus.ok
                  ? 'text-sm text-green-600'
                  : 'text-sm text-red-600'
              }
            >
              {appKitStatus.ok ? 'OK' : `Error: ${appKitStatus.message}`}
            </Text>
          </View>
        </View>

        {/* Environment Variables Section */}
        <Text className="text-xs text-gray-500 mb-2 uppercase tracking-wide">
          Environment Variables
        </Text>
        <View className="bg-gray-100 p-4 rounded-lg">
          {/* Reown Project ID */}
          <View className="flex-row justify-between items-center py-2 border-b border-gray-200">
            <Text className="text-sm text-gray-900">
              EXPO_PUBLIC_REOWN_PROJECT_ID
            </Text>
            <Text
              className={
                reownId && !reownId.startsWith('your_')
                  ? 'text-sm font-mono text-gray-400'
                  : 'text-sm text-red-600'
              }
            >
              {maskValue(reownId, true)}
            </Text>
          </View>

          {/* Etherscan API Key */}
          <View className="flex-row justify-between items-center py-2 border-b border-gray-200">
            <Text className="text-sm text-gray-900">
              EXPO_PUBLIC_ETHERSCAN_API_KEY
            </Text>
            <Text
              className={
                etherscanKey && !etherscanKey.startsWith('your_')
                  ? 'text-sm font-mono text-gray-400'
                  : 'text-sm text-red-600'
              }
            >
              {maskValue(etherscanKey, true)}
            </Text>
          </View>

          {/* Infura RPC URL */}
          <View className="flex-row justify-between items-center py-2">
            <Text className="text-sm text-gray-900">
              EXPO_PUBLIC_INFURA_RPC_URL
            </Text>
            <Text
              className={
                rpcUrl &&
                !rpcUrl.startsWith('https://mainnet.infura.io/v3/your_')
                  ? 'text-sm font-mono text-gray-400'
                  : 'text-sm text-red-600'
              }
            >
              {maskValue(rpcUrl, false)}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
