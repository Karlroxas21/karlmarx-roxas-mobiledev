import { useAppKit } from '@reown/appkit-react-native';
import { useWalletStore } from '../stores/wallet-store';

export function useWalletConnection() {
  const { open, disconnect } = useAppKit();
  const { address, isConnected, status, error, setStatus, setError } =
    useWalletStore();

  const connect = async () => {
    try {
      setStatus('connecting');
      setError(null);
      await open();
      // Status transitions to 'connected' via useWalletSync when address arrives
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : 'Connection failed');
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      // useWalletSync handles clearing the store
    } catch {
      // Swallow disconnect errors (known issue #13 in some versions)
      // useWalletSync will still clear the store if session ends
    }
  };

  const cancelConnection = () => {
    setStatus('idle');
    setError(null);
  };

  return {
    address,
    isConnected,
    status,
    error,
    connect,
    disconnect: handleDisconnect,
    cancelConnection,
  };
}
