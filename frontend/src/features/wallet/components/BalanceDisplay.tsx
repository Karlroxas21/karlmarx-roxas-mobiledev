import { Text } from 'react-native';

type BalanceDisplayProps = {
  balance: string | null;
  error: string | null;
};

export function BalanceDisplay({ balance, error }: BalanceDisplayProps) {
  if (error) {
    return (
      <Text className="text-sm text-gray-500 text-center">
        Balance unavailable
      </Text>
    );
  }

  if (balance) {
    return (
      <Text className="text-3xl font-semibold text-gray-900 text-center">
        {balance} ETH
      </Text>
    );
  }

  return null;
}
