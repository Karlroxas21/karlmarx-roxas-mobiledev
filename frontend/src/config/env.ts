function assertEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        'Copy .env.example to .env and fill in the values.',
    );
  }
  return value;
}

export const ENV = {
  API_URL: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000',
  REOWN_PROJECT_ID: assertEnv(
    'EXPO_PUBLIC_REOWN_PROJECT_ID',
    process.env.EXPO_PUBLIC_REOWN_PROJECT_ID,
  ),
  ETHERSCAN_API_KEY: assertEnv(
    'EXPO_PUBLIC_ETHERSCAN_API_KEY',
    process.env.EXPO_PUBLIC_ETHERSCAN_API_KEY,
  ),
  INFURA_RPC_URL: assertEnv(
    'EXPO_PUBLIC_INFURA_RPC_URL',
    process.env.EXPO_PUBLIC_INFURA_RPC_URL,
  ),
} as const;
