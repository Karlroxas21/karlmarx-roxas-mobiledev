import { Text, TouchableOpacity } from 'react-native';
import { useWalletConnection } from '../hooks/use-wallet-connection';

export function ConnectButton() {
  const { connect, status } = useWalletConnection();

  return (
    <TouchableOpacity
      className="bg-blue-600 rounded-xl h-11 w-full items-center justify-center"
      activeOpacity={0.7}
      onPress={connect}
      disabled={status === 'connecting'}
    >
      <Text className="text-base font-semibold text-white">Connect Wallet</Text>
    </TouchableOpacity>
  );
}
