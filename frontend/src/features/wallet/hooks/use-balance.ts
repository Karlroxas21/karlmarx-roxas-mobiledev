import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { ENV } from '@/src/config/env';
import { useWalletStore } from '../stores/wallet-store';

type BalanceState = {
  balance: string | null;
  isLoading: boolean;
  error: string | null;
};

export function formatBalance(wei: bigint): string {
  const ethResult = ethers.formatEther(wei);
  const eth = parseFloat(ethResult);
  if (eth > 0 && eth < 0.0001) {
    return '< 0.0001';
  }
  return eth.toFixed(4);
}

export function useBalance(refreshTrigger?: number): BalanceState {
  const address = useWalletStore((s) => s.address);
  const [state, setState] = useState<BalanceState>({
    balance: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    if (!address) return;

    let cancelled = false;

    setState({ balance: null, isLoading: true, error: null });

    const provider = new ethers.JsonRpcProvider(ENV.INFURA_RPC_URL, undefined, {
      staticNetwork: true,
    });

    provider
      .getBalance(address)
      .then((raw) => {
        if (!cancelled) {
          setState({
            balance: formatBalance(raw),
            isLoading: false,
            error: null,
          });
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setState({
            balance: null,
            isLoading: false,
            error: e instanceof Error ? e.message : 'Balance fetch failed',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [address, refreshTrigger]);

  return state;
}
