import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useWalletConnection } from '../hooks/use-wallet-connection';
import { useBalance } from '../hooks/use-balance';
import { useTransactions } from '../hooks/use-transactions';
import { BalanceDisplay } from './BalanceDisplay';
import { BalanceSkeleton } from './BalanceSkeleton';
import { BlockieIdenticon } from './BlockieIdenticon';
import { ErrorState } from './ErrorState';
import { TransactionRow } from './TransactionRow';
import { TransactionSkeleton } from './TransactionSkeleton';
import type { Transaction } from '../types';

export function ConnectedScreen() {
  const { address, disconnect } = useWalletConnection();
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const {
    balance,
    isLoading: balanceLoading,
    error: balanceError,
  } = useBalance(refreshTrigger);
  const {
    transactions,
    isLoading: txLoading,
    error: txError,
  } = useTransactions(refreshTrigger);

  const handleCopy = async () => {
    if (!address) return;
    await Clipboard.setStringAsync(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshTrigger((n) => n + 1);
  }, []);

  const handleRetry = useCallback(() => {
    setRefreshTrigger((n) => n + 1);
  }, []);

  // Clear refreshing when both hooks finish loading
  useEffect(() => {
    if (!balanceLoading && !txLoading && refreshing) {
      setRefreshing(false);
    }
  }, [balanceLoading, txLoading, refreshing]);

  const renderHeader = () => (
    <View className="items-center px-8 gap-6 pt-6">
      <View className="absolute top-4 right-4">
        <TouchableOpacity onPress={disconnect}>
          <Text className="text-red-600 text-sm">Disconnect</Text>
        </TouchableOpacity>
      </View>

      {address && <BlockieIdenticon address={address as `0x${string}`} />}

      <Text className="text-xs text-green-600 text-center">
        Connected to Ethereum Mainnet
      </Text>

      {balanceLoading ? (
        <BalanceSkeleton />
      ) : balanceError ? (
        <ErrorState message="Couldn't load balance" onRetry={handleRetry} />
      ) : (
        <BalanceDisplay balance={balance} />
      )}

      <View className="bg-gray-100 rounded-xl p-4 w-full flex-row items-center gap-2">
        <Text className="text-base text-gray-900 font-normal flex-1">
          {address}
        </Text>
        <TouchableOpacity
          className="h-11 w-11 items-center justify-center"
          onPress={handleCopy}
          accessibilityLabel="Copy wallet address"
        >
          <Text className="text-sm text-blue-600">
            {copied ? 'Copied!' : 'Copy'}
          </Text>
        </TouchableOpacity>
      </View>

      <Text className="text-sm font-semibold text-gray-500 self-start px-4 pt-4 pb-2">
        Transactions ({txLoading ? '...' : transactions.length})
      </Text>
    </View>
  );

  const renderEmpty = () => {
    if (txLoading) {
      return <TransactionSkeleton />;
    }
    if (txError) {
      return (
        <ErrorState
          message="Couldn't load transactions"
          onRetry={handleRetry}
        />
      );
    }
    return (
      <View className="items-center justify-center py-8">
        <Text className="text-sm text-gray-400 text-center">
          No transactions yet
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <FlatList<Transaction>
        data={txLoading || txError ? [] : transactions}
        keyExtractor={(item) => item.hash}
        renderItem={({ item }) => (
          <TransactionRow tx={item} userAddress={address ?? ''} />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ flexGrow: 1 }}
      />
    </SafeAreaView>
  );
}
