export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

export type WalletState = {
  address: string | null;
  isConnected: boolean;
  status: ConnectionStatus;
  error: string | null;
  setWallet: (wallet: { address: string; isConnected: boolean }) => void;
  clearWallet: () => void;
  setStatus: (status: ConnectionStatus) => void;
  setError: (error: string | null) => void;
};
