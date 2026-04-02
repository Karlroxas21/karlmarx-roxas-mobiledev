import express from 'express';
import { Server, Controller } from './server';
import { config, logger } from './config';

export const createServer = async (): Promise<Server> => {
    const app = express();

    // Infra

    // Services

    // Controllers
    const controllers: Controller[] = [];

    const server = new Server(app, controllers, config.hostname, config.port);

    logger.info(`server wired on ${config.hostname}:${config.port}`);

    return server;
};
