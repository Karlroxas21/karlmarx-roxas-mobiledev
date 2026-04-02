describe('config', () => {
    const ORIGINAL_ENV = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...ORIGINAL_ENV };
    });

    afterAll(() => {
        process.env = ORIGINAL_ENV;
    });

    it('throws with descriptive error listing missing env vars when a required var is absent', () => {
        // Remove all required vars to ensure they are missing
        delete process.env.DATABASE_URL;
        delete process.env.REDIS_URL;
        delete process.env.ETHERSCAN_API_KEY;
        delete process.env.ETHERSCAN_BASE_URL;

        expect(() => {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            require('../../src/config');
        }).toThrow(/Missing required environment variables/);
    });

    it('exports config with expected fields when all required env vars are present', () => {
        process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
        process.env.REDIS_URL = 'redis://localhost:6379';
        process.env.ETHERSCAN_API_KEY = 'test-key';
        process.env.ETHERSCAN_BASE_URL = 'https://api.etherscan.io/api';

        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { config } = require('../../src/config');

        expect(config.databaseUrl).toBe('postgresql://localhost:5432/test');
        expect(config.redisUrl).toBe('redis://localhost:6379');
        expect(config.etherscanApiKey).toBe('test-key');
        expect(config.etherscanBaseUrl).toBe('https://api.etherscan.io/api');
    });
});
