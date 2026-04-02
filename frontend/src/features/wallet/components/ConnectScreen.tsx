import { SafeAreaView, ScrollView, Text, View } from 'react-native';
import { useWalletConnection } from '../hooks/use-wallet-connection';
import { ConnectButton } from './ConnectButton';
import { ConnectionError } from './ConnectionError';
import { LoadingOverlay } from './LoadingOverlay';

export function ConnectScreen() {
  const { status, error, cancelConnection } = useWalletConnection();

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-1 items-center justify-center px-8 py-12"
      >
        <View className="w-16 h-16 rounded-2xl bg-gray-100 items-center justify-center">
          <Text className="text-2xl">ETH</Text>
        </View>

        <Text className="text-xl font-semibold text-gray-900 text-center mt-12">
          Ethereum Wallet Viewer
        </Text>

        <View className="gap-3 mt-6">
          <Text className="text-sm text-gray-500">
            {'\u2022'} View ETH balance
          </Text>
          <Text className="text-sm text-gray-500">
            {'\u2022'} See transactions
          </Text>
          <Text className="text-sm text-gray-500">
            {'\u2022'} Read-only & safe
          </Text>
        </View>

        <View className="w-full mt-16">
          <ConnectButton />
          <ConnectionError hasError={!!error} />
        </View>

        <LoadingOverlay
          visible={status === 'connecting'}
          onCancel={cancelConnection}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
