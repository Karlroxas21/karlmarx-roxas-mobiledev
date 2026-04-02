import { Text, View } from 'react-native';

type ConnectionErrorProps = {
  hasError: boolean;
};

export function ConnectionError({ hasError }: ConnectionErrorProps) {
  if (!hasError) return null;

  return (
    <View className="mt-2">
      <Text className="text-red-600 text-sm text-center">
        {"Couldn't connect wallet"}
      </Text>
      <Text className="text-gray-500 text-sm text-center mt-1">
        Tap Connect Wallet to try again.
      </Text>
    </View>
  );
}
