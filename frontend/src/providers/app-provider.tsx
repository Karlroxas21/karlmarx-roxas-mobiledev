// src/providers/app-provider.tsx
// CRITICAL: appkit import MUST be first — it runs polyfills + createAppKit at module load.
import { appKit } from '@/src/lib/appkit';
import { type ReactNode } from 'react';
import { AppKit, AppKitProvider } from '@reown/appkit-react-native';
import { useWalletSync } from '@/src/features/wallet/hooks/use-wallet-sync';

type AppProviderProps = {
  children: ReactNode;
};

function WalletSyncBridge() {
  useWalletSync();
  return null;
}

export function AppProvider({ children }: AppProviderProps) {
  return (
    <AppKitProvider instance={appKit}>
      <WalletSyncBridge />
      {children}
      <AppKit />
    </AppKitProvider>
  );
}
