import { Text, View } from 'react-native';

type ConnectionErrorProps = {
  message: string | null;
};

export function ConnectionError({ message }: ConnectionErrorProps) {
  if (!message) return null;

  return (
    <View className="mt-2">
      <Text className="text-red-600 text-sm text-center">{message}</Text>
      <Text className="text-gray-500 text-sm text-center mt-1">
        Tap Connect Wallet to try again.
      </Text>
    </View>
  );
}
