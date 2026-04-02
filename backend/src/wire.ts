import express from 'express';
import { DataSource } from 'typeorm';
import { Redis } from 'ioredis';
import { Server, Controller } from './server';
import { config, logger } from './config';
import { Balance } from './infrastructure/postgres/Balance.entity';

export const createServer = async (): Promise<Server> => {
    const app = express();

    // Infra
    const dataSource = new DataSource({
        type: 'postgres',
        url: config.databaseUrl,
        synchronize: process.env.NODE_ENV !== 'production',
        logging: process.env.NODE_ENV === 'development',
        entities: [Balance],
    });
    await dataSource.initialize();
    logger.info('PostgreSQL DataSource initialized');

    const redis = new Redis(config.redisUrl);
    redis.on('error', (err: Error) => {
        logger.error('Redis client error', { error: err.message });
    });
    logger.info('ioredis client created');

    // Services

    // Controllers
    const controllers: Controller[] = [];

    const server = new Server(app, controllers, config.hostname, config.port);

    logger.info(`server wired on ${config.hostname}:${config.port}`);

    return server;
};
