import { View } from 'react-native';

export function TransactionSkeleton() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <View key={i} className="px-4 py-2 gap-2">
          <View className="w-40 h-4 rounded bg-gray-200 animate-pulse" />
          <View className="w-32 h-4 rounded bg-gray-200 animate-pulse" />
        </View>
      ))}
    </>
  );
}
