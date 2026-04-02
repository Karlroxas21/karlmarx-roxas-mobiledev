import { Text, View } from 'react-native';
import type { Transaction } from '../types';
import {
  formatTxValue,
  getTxDirection,
  truncateAddress,
  formatRelativeTime,
} from '../hooks/use-transactions';

type TransactionRowProps = {
  tx: Transaction;
  userAddress: string;
};

export function TransactionRow({ tx, userAddress }: TransactionRowProps) {
  const direction = getTxDirection(tx.from, tx.to, userAddress);
  const counterparty = direction === 'incoming' ? tx.from : tx.to;
  const ethValue = formatTxValue(tx.value);
  const isZero = tx.value === '0';

  const amountColor = isZero
    ? 'text-gray-400'
    : direction === 'incoming'
      ? 'text-green-600'
      : direction === 'outgoing'
        ? 'text-red-600'
        : 'text-gray-400';

  const amountPrefix =
    isZero || direction === 'self'
      ? ''
      : direction === 'incoming'
        ? '+'
        : '-';

  return (
    <View className="px-4 py-2">
      <Text className="text-sm text-gray-900 font-mono">
        {truncateAddress(counterparty)}
      </Text>
      <View className="flex-row justify-between mt-1">
        <Text className={`text-sm font-semibold ${amountColor}`}>
          {amountPrefix}{ethValue} ETH
        </Text>
        <Text className="text-xs text-gray-400">
          {formatRelativeTime(tx.timeStamp)}
        </Text>
      </View>
    </View>
  );
}
