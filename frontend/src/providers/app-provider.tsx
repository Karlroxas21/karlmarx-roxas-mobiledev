// src/providers/app-provider.tsx
// CRITICAL: appkit import MUST be first — it runs polyfills + createAppKit at module load.
import { appKit } from '@/src/lib/appkit';
import { type ReactNode } from 'react';
import { AppKit, AppKitProvider } from '@reown/appkit-react-native';

type AppProviderProps = {
  children: ReactNode;
};

export function AppProvider({ children }: AppProviderProps) {
  return (
    <AppKitProvider instance={appKit}>
      {children}
      <AppKit />
    </AppKitProvider>
  );
}
