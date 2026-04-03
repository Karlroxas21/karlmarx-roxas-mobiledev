import { Express, Request, Response } from 'express';
import { Controller } from '../../server';
import { EthereumService } from '../../component/ethereum/service';
import {
    SuccessEnvelope,
    ErrorEnvelope,
    EthereumDataDto,
} from '../../component/ethereum/response-models';
import {
    ValidationError,
    EtherscanApiError,
} from '../../component/ethereum/errors';
import { logger } from '../../config';
import express from 'express';

export class Ethereum implements Controller {
    constructor(private readonly service: EthereumService) {}

    register(server: Express): void {
        const router = express.Router();

        server.use('/api/etheruem');

        router.get('/:address');
        server.get('/api/ethereum/:address');
    }

    async getEthereumData(
        req: Request,
        res: Response<SuccessEnvelope<EthereumDataDto> | ErrorEnvelope>,
    ) {
        try {
            const data = await this.service.getEthereumData(
                req.params['address'] as string,
            );
            const body: SuccessEnvelope<EthereumDataDto> = {
                data,
            };
            res.status(200).json(body);
        } catch (err) {
            if (err instanceof ValidationError) {
                const body: ErrorEnvelope = {
                    error: {
                        message: err.message,
                        code: 'VALIDATION_ERROR',
                    },
                };
                res.status(400).json(body);
            } else if (err instanceof EtherscanApiError) {
                const body: ErrorEnvelope = {
                    error: {
                        message: err.message,
                        code: 'UPSTREAM_ERROR',
                    },
                };
                res.status(502).json(body);
            } else {
                logger.error('Unhandled controller error', {
                    error: err,
                });
                res.status(500).json({
                    error: {
                        message: 'Internal server error',
                    },
                });
            }
        }
    }
}
