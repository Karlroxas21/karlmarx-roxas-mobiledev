const {
  withAndroidManifest,
  createRunOncePlugin,
} = require('expo/config-plugins');

const queries = {
  package: [
    { $: { 'android:name': 'io.metamask' } },
    { $: { 'android:name': 'com.wallet.crypto.trustapp' } },
    { $: { 'android:name': 'io.gnosis.safe' } },
    { $: { 'android:name': 'me.rainbow' } },
    { $: { 'android:name': 'org.toshi' } },
  ],
};

const withAndroidManifestService = (config) => {
  return withAndroidManifest(config, (c) => {
    c.modResults.manifest = { ...c.modResults.manifest, queries };
    return c;
  });
};

module.exports = createRunOncePlugin(
  withAndroidManifestService,
  'withAndroidManifestService',
  '1.0.0',
);
