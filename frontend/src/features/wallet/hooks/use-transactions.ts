import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { ENV } from '@/src/config/env';
import { useWalletStore } from '../stores/wallet-store';
import type { Transaction, TxDirection } from '../types';

type EtherscanTx = {
  hash: string;
  from: string;
  to: string;
  value: string;
  timeStamp: string;
  isError: string;
};

function mapEtherscanTx(raw: EtherscanTx): Transaction {
  return {
    hash: raw.hash,
    from: raw.from.toLowerCase(),
    to: raw.to.toLowerCase(),
    value: raw.value,
    timeStamp: parseInt(raw.timeStamp, 10),
    isError: raw.isError === '1',
  };
}

export function formatTxValue(weiString: string): string {
  if (weiString === '0') return '0';
  const eth = parseFloat(ethers.formatEther(BigInt(weiString)));
  if (eth > 0 && eth < 0.0001) return '< 0.0001';
  return eth.toFixed(4);
}

export function getTxDirection(
  from: string,
  to: string,
  userAddress: string,
): TxDirection {
  const addr = userAddress.toLowerCase();
  const f = from.toLowerCase();
  const t = to.toLowerCase();
  if (f === addr && t === addr) return 'self';
  if (t === addr) return 'incoming';
  return 'outgoing';
}

export function truncateAddress(address: string): string {
  if (address.length < 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatRelativeTime(unixSeconds: number): string {
  const diffSeconds = Math.floor(Date.now() / 1000) - unixSeconds;
  if (diffSeconds < 60) return 'just now';
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  if (diffSeconds < 2592000) return `${Math.floor(diffSeconds / 86400)}d ago`;
  return `${Math.floor(diffSeconds / 2592000)}mo ago`;
}

type TransactionState = {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
};

export function useTransactions(refreshTrigger?: number): TransactionState {
  const address = useWalletStore((s) => s.address);
  const [state, setState] = useState<TransactionState>({
    transactions: [],
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    if (!address) return;

    let cancelled = false;
    setState({ transactions: [], isLoading: true, error: null });

    // Test address: 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
    const url =
      `https://api.etherscan.io/v2/api` +
      `?chainid=1&module=account&action=txlist` +
      `&address=${address}&startblock=0&endblock=latest` +
      `&page=1&offset=10&sort=desc&apikey=${ENV.ETHERSCAN_API_KEY}`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          if (data.status === '1') {
            setState({
              transactions: data.result.map(mapEtherscanTx),
              isLoading: false,
              error: null,
            });
          } else {
            // status "0" with empty result is the no-transactions case, not an error
            setState({ transactions: [], isLoading: false, error: null });
          }
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setState({
            transactions: [],
            isLoading: false,
            error: e instanceof Error ? e.message : 'Transactions fetch failed',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [address, refreshTrigger]);

  return state;
}
