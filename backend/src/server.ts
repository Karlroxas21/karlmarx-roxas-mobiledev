import * as http from 'http';
import express, { Express, Request, Response, NextFunction } from 'express';
import { RequestHandler } from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { logger } from './config';

export interface Controller {
    register(
        server: Express,
        middlewares?: Record<string, RequestHandler>,
    ): void;
}

function requestContext(): RequestHandler {
    return (req: Request, _res: Response, next: NextFunction) => {
        req.headers['x-request-id'] =
            (req.headers['x-request-id'] as string) || randomUUID();
        next();
    };
}

function requestLogger(): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
        const start = Date.now();
        res.on('finish', () => {
            logger.info({
                message: `${req.method} ${req.originalUrl}`,
                status: res.statusCode,
                duration: `${Date.now() - start}ms`,
                requestId: req.headers['x-request-id'],
            });
        });
        next();
    };
}

export class Server {
    private static readonly DEFAULT_HOSTNAME = '0.0.0.0';
    private static readonly DEFAULT_PORT = 3000;

    public httpServer!: http.Server;

    constructor(
        private instance: Express,
        private controllers: Controller[],
        private hostname: string = Server.DEFAULT_HOSTNAME,
        private port: number = Server.DEFAULT_PORT,
        private middlewares?: Record<string, RequestHandler>,
    ) {
        try {
            instance.use(cors());
            instance.use(express.json({ type: 'application/*' }));
            instance.use(requestContext());
            instance.use(requestLogger());

            // Swagger UI (auto-generated from sibling .yaml files)
            const swaggerSpec = swaggerJsdoc({
                definition: {
                    openapi: '3.0.3',
                    info: {
                        title: 'Ethereum Address API',
                        description:
                            'REST API that returns gas price, current block number, and account balance for a given Ethereum address.',
                        version: '1.0.0',
                    },
                    servers: [
                        {
                            url: `http://localhost:${this.port}`,
                            description: 'Local development',
                        },
                    ],
                },
                apis: ['./src/entrypoint/controller/*.yaml'],
            });
            instance.use(
                '/api-docs',
                swaggerUi.serve,
                swaggerUi.setup(swaggerSpec),
            );

            // Health endpoint — registered before controllers
            instance.get('/v1/api/health', (_req: Request, res: Response) => {
                res.status(200).json({ status: 'ok' });
            });

            if (this.controllers?.length > 0) {
                this.controllers.forEach((c) => {
                    c.register(this.instance, this.middlewares);
                    logger.info(`controller registered: ${c.constructor.name}`);
                });
            }
        } catch (error) {
            logger.error('server error: could not start the server', {
                error,
            });
            process.exit(1);
        }
    }

    start() {
        this.httpServer = this.instance.listen(this.port, this.hostname);
    }

    stop() {
        this.httpServer?.close();
    }
}
