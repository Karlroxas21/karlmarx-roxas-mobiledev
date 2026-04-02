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

export type Transaction = {
  hash: string;
  from: string;
  to: string;
  value: string; // Wei string from Etherscan (e.g., "500000000000000000")
  timeStamp: number; // Unix seconds (parsed from Etherscan's string)
  isError: boolean;
};

export type TxDirection = 'incoming' | 'outgoing' | 'self';
