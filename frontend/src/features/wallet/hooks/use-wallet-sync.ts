import { useEffect } from 'react';
import { useAppKitAccount, useAppKitState } from '@reown/appkit-react-native';
import { useWalletStore } from '../stores/wallet-store';

export function useWalletSync() {
  const { address, isConnected } = useAppKitAccount();
  const { isOpen } = useAppKitState();
  const { setWallet, clearWallet, status, setStatus } = useWalletStore();

  // Sync AppKit account state to Zustand
  useEffect(() => {
    if (isConnected && address) {
      setWallet({ address, isConnected: true });
    } else if (!isConnected) {
      clearWallet();
    }
  }, [address, isConnected]);

  // Detect modal dismissed without connecting (isLoading bug workaround)
  useEffect(() => {
    if (!isOpen && status === 'connecting' && !isConnected) {
      setStatus('idle');
    }
  }, [isOpen]);
}
