import winston from 'winston';

const REQUIRED_ENV_VARS = [
    'DATABASE_URL',
    'REDIS_URL',
    'ETHERSCAN_API_KEY',
    'ETHERSCAN_BASE_URL',
] as const;

const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
if (missing.length > 0) {
    throw new Error(
        `Missing required environment variables: ${missing.join(', ')}`,
    );
}

export const config = {
    hostname: process.env.HOSTNAME || '0.0.0.0',
    port: Number(process.env.PORT) || 3000,
    databaseUrl: process.env.DATABASE_URL as string,
    redisUrl: process.env.REDIS_URL as string,
    etherscanApiKey: process.env.ETHERSCAN_API_KEY as string,
    etherscanBaseUrl: process.env.ETHERSCAN_BASE_URL as string,
} as const;

const logFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
);

export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(
                    ({ timestamp, level, message, stack, ...meta }) => {
                        const metaStr = Object.keys(meta).length
                            ? ` ${JSON.stringify(meta)}`
                            : '';
                        return `${timestamp} [${level}]: ${message}${stack ? `\n${stack}` : ''}${metaStr}`;
                    },
                ),
            ),
        }),
    ],
});
