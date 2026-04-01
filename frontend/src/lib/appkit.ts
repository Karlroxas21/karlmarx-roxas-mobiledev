// src/lib/appkit.ts
// CRITICAL: Import order is load-bearing. Do NOT reorder.
// @walletconnect/react-native-compat MUST be first — it patches
// TextEncoder, URL, Buffer, EventEmitter globals that Hermes lacks.

// 1. WalletConnect compat — MUST be the absolute first import.
import '@walletconnect/react-native-compat';

// 2. Secure randomness — before any crypto or ethers imports.
import 'react-native-get-random-values';

// 3. AppKit + ethers adapter
import { createAppKit } from '@reown/appkit-react-native';
import { EthersAdapter } from '@reown/appkit-ethers-react-native';
import { type AppKitNetwork } from '@reown/appkit-common-react-native';

// 4. Env config (imported AFTER polyfills)
import { ENV } from '@/src/config/env';

// 5. Native crypto registration for ethers v6
import { ethers } from 'ethers';
import crypto from 'react-native-quick-crypto';

// Register native crypto primitives with ethers v6 plugin API
// Source: https://docs.ethers.org/v6/cookbook/react-native/
ethers.randomBytes.register((length) => {
  return new Uint8Array(crypto.randomBytes(length));
});
ethers.computeHmac.register((algo, key, data) => {
  return crypto.createHmac(algo.toLowerCase(), key).update(data).digest();
});
ethers.pbkdf2.register((passwd, salt, iter, keylen, algo) => {
  return crypto.pbkdf2Sync(passwd, salt, iter, keylen, algo.toLowerCase());
});
ethers.sha256.register((data) => {
  return crypto.createHash('sha256').update(data).digest();
});
ethers.sha512.register((data) => {
  return crypto.createHash('sha512').update(data).digest();
});

// Ethereum mainnet network definition
// @reown/appkit/networks (web package) is not installed; define inline per AppKitNetwork type
const mainnet: AppKitNetwork = {
  id: 1,
  name: 'Ethereum',
  chainNamespace: 'eip155',
  caipNetworkId: 'eip155:1',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://cloudflare-eth.com'] },
  },
  blockExplorers: {
    default: { name: 'Etherscan', url: 'https://etherscan.io' },
  },
};

// 6. AppKit singleton — called ONCE at module scope, never inside a component
export const appKit = createAppKit({
  projectId: ENV.REOWN_PROJECT_ID,
  networks: [mainnet],
  adapters: [new EthersAdapter()],
  metadata: {
    name: 'Ethereum Wallet Viewer',
    description: 'View your ETH balance and transactions',
    url: 'https://ethereum-wallet-viewer.app',
    icons: [],
  },
});
