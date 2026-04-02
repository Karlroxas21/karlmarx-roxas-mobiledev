import { Text, TouchableOpacity, View } from 'react-native';

type ErrorStateProps = {
  message: string;
  onRetry: () => void;
};

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <View className="items-center gap-2 py-4">
      <Text className="text-sm text-gray-500 text-center">{message}</Text>
      <TouchableOpacity onPress={onRetry}>
        <Text className="text-sm text-blue-600">Retry</Text>
      </TouchableOpacity>
    </View>
  );
}
