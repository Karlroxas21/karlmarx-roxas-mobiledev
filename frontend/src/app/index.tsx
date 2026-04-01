import { useWalletStore } from '@/src/features/wallet/stores/wallet-store';
import { ConnectScreen } from '@/src/features/wallet/components/ConnectScreen';
import { ConnectedScreen } from '@/src/features/wallet/components/ConnectedScreen';

export default function WalletScreen() {
  const { isConnected } = useWalletStore();

  return isConnected ? <ConnectedScreen /> : <ConnectScreen />;
}
