import express from 'express';
import { DataSource } from 'typeorm';
import { Redis } from 'ioredis';
import { Server, Controller } from './server';
import { config, logger } from './config';
import { Balance } from './infrastructure/postgres/Balance.entity';
import { EtherscanAdapter } from './infrastructure/etherscan/EtherscanAdapter';
import { RedisAdapter } from './infrastructure/redis/RedisAdapter';
import { TypeOrmBalanceRepository } from './infrastructure/postgres/TypeOrmBalanceRepository';
import { EthereumService } from './component/ethereum/service';
import { EthereumController } from './entrypoint/controller/ethereum';

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

    // Adapters
    const etherscanAdapter = new EtherscanAdapter(
        config.etherscanBaseUrl,
        config.etherscanApiKey,
    );
    const redisAdapter = new RedisAdapter(redis);
    const balanceRepository = new TypeOrmBalanceRepository(
        dataSource.getRepository(Balance),
    );

    // Services
    const ethereumService = new EthereumService(
        etherscanAdapter,
        redisAdapter,
        balanceRepository,
    );

    // Controllers
    const ethereumController = new EthereumController(ethereumService);
    const controllers: Controller[] = [ethereumController];

    const server = new Server(app, controllers, config.hostname, config.port);

    logger.info(`server wired on ${config.hostname}:${config.port}`);

    return server;
};
