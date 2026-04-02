import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { bloSvg } from 'blo';

type BlockieIdenticonProps = {
  address: `0x${string}`;
  size?: number;
};

export function BlockieIdenticon({
  address,
  size = 48,
}: BlockieIdenticonProps) {
  const svg = bloSvg(address);
  return (
    <View className="rounded-full overflow-hidden">
      <SvgXml xml={svg} width={size} height={size} />
    </View>
  );
}
