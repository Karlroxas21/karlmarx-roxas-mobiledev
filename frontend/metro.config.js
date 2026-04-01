const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Map Node.js core module names to React Native-compatible packages.
// WalletConnect internals reference these by their Node.js names.
config.resolver.extraNodeModules = {
  crypto: require.resolve('react-native-quick-crypto'),
  stream: require.resolve('stream-browserify'),
  buffer: require.resolve('@craftzdog/react-native-buffer'),
};

module.exports = withNativeWind(config, { input: './global.css' });
