import { Text } from 'react-native';

type BalanceDisplayProps = {
  balance: string | null;
};

export function BalanceDisplay({ balance }: BalanceDisplayProps) {
  if (balance) {
    return (
      <Text className="text-3xl font-semibold text-gray-900 text-center">
        {balance} ETH
      </Text>
    );
  }

  return null;
}
