import winston from 'winston';

export const config = {
    hostname: process.env.HOSTNAME || '0.0.0.0',
    port: Number(process.env.PORT) || 3000,
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
