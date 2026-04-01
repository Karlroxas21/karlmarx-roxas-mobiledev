import { create } from 'zustand';
import type { WalletState } from '../types';

export const useWalletStore = create<WalletState>((set) => ({
  address: null,
  isConnected: false,
  status: 'idle',
  error: null,
  setWallet: ({ address, isConnected }) =>
    set({ address, isConnected, status: 'connected', error: null }),
  clearWallet: () =>
    set({ address: null, isConnected: false, status: 'idle', error: null }),
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error }),
}));
