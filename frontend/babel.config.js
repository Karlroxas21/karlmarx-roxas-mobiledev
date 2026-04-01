// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          // Required: AppKit's valtio uses import.meta
          // Source: https://docs.reown.com/appkit/react-native/core/installation
          unstable_transformImportMeta: true,
          // Required: enables BigInt for ethers v6 on Hermes
          // Source: https://github.com/facebook/hermes/issues/510
          unstable_transformProfile: 'hermes-stable',
        },
      ],
    ],
  };
};
