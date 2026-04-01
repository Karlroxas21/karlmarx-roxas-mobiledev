import {
  ActivityIndicator,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type LoadingOverlayProps = {
  visible: boolean;
  onCancel: () => void;
};

export function LoadingOverlay({ visible, onCancel }: LoadingOverlayProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/50 items-center justify-center px-8">
        <View className="bg-white rounded-2xl p-8 items-center gap-6 w-full">
          <ActivityIndicator size="large" color="#2563EB" />
          <Text
            className="text-base text-gray-900 text-center"
            accessibilityLiveRegion="polite"
          >
            Waiting for approval in MetaMask...
          </Text>
          <TouchableOpacity
            className="h-11 items-center justify-center"
            onPress={onCancel}
          >
            <Text className="text-sm text-gray-500">Cancel Connection</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
