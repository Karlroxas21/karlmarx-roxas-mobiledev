import { useState } from 'react';
import {
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useWalletConnection } from '../hooks/use-wallet-connection';
import { BlockieIdenticon } from './BlockieIdenticon';

export function ConnectedScreen() {
  const { address, disconnect } = useWalletConnection();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!address) return;
    await Clipboard.setStringAsync(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center px-8 gap-6">
        <View className="absolute top-4 right-4">
          <TouchableOpacity onPress={disconnect}>
            <Text className="text-red-600 text-sm">Disconnect</Text>
          </TouchableOpacity>
        </View>

        {address && (
          <BlockieIdenticon address={address as `0x${string}`} />
        )}

        <Text className="text-xs text-green-600 text-center">
          Connected to Ethereum Mainnet
        </Text>

        <View className="bg-gray-100 rounded-xl p-4 w-full flex-row items-center gap-2">
          <Text className="text-base text-gray-900 font-normal flex-1">
            {address}
          </Text>
          <TouchableOpacity
            className="h-11 w-11 items-center justify-center"
            onPress={handleCopy}
            accessibilityLabel="Copy wallet address"
          >
            <Text className="text-sm text-blue-600">
              {copied ? 'Copied!' : 'Copy'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
