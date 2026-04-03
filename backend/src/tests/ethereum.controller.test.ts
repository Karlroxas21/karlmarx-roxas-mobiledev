jest.mock('../config', () => ({
    logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn() },
}));

import { Express, Request, Response } from 'express';
import { EthereumController } from '../entrypoint/controller/ethereum';
import { EthereumService } from '../component/ethereum/service';
import {
    ValidationError,
    EtherscanApiError,
} from '../component/ethereum/errors';
import { EthereumDataDto } from '../component/ethereum/response-models';

// Manual mock for EthereumService — avoid instantiating real adapters
const mockService = {
    getEthereumData: jest.fn(),
} as unknown as EthereumService;

let controller: EthereumController;

beforeEach(() => {
    controller = new EthereumController(mockService);
    jest.clearAllMocks();
});

describe('EthereumController', () => {
    describe('register()', () => {
        it('mounts GET /v1/api/ethereum/:address', () => {
            const mockApp = { get: jest.fn() } as unknown as Express;
            controller.register(mockApp);
            expect(mockApp.get).toHaveBeenCalledWith(
                '/v1/api/ethereum/:address',
                expect.any(Function),
            );
        });
    });

    describe('GET /v1/api/ethereum/:address handler', () => {
        // Extract the handler from register() for direct testing
        let handler: (req: Request, res: Response) => Promise<void>;
        let mockRes: {
            status: jest.Mock;
            json: jest.Mock;
        };

        beforeEach(() => {
            const mockApp = { get: jest.fn() } as unknown as Express;
            controller.register(mockApp);
            handler = (mockApp.get as jest.Mock).mock.calls[0][1];
            mockRes = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn().mockReturnThis(),
            };
        });

        it('returns 200 with SuccessEnvelope on success', async () => {
            const dto: EthereumDataDto = {
                gasPrice: { wei: '496840168000000000', gwei: '496840168' },
                blockNumber: '21000000',
                balance: { wei: '1000000000000000000', eth: '1' },
                timestamp: '2026-04-02T00:00:00.000Z',
            };
            (mockService.getEthereumData as jest.Mock).mockResolvedValueOnce(
                dto,
            );

            const mockReq = {
                params: { address: '0x1234' },
            } as unknown as Request;
            await handler(mockReq, mockRes as unknown as Response);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({ data: dto });
        });

        it('returns 400 on ValidationError', async () => {
            (mockService.getEthereumData as jest.Mock).mockRejectedValueOnce(
                new ValidationError('Invalid Ethereum address'),
            );

            const mockReq = {
                params: { address: 'bad' },
            } as unknown as Request;
            await handler(mockReq, mockRes as unknown as Response);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: {
                    message: 'Invalid Ethereum address',
                    code: 'VALIDATION_ERROR',
                },
            });
        });

        it('returns 502 on EtherscanApiError', async () => {
            (mockService.getEthereumData as jest.Mock).mockRejectedValueOnce(
                new EtherscanApiError('Etherscan gasoracle error: NOTOK'),
            );

            const mockReq = {
                params: { address: '0x1234' },
            } as unknown as Request;
            await handler(mockReq, mockRes as unknown as Response);

            expect(mockRes.status).toHaveBeenCalledWith(502);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: {
                    message: 'Etherscan gasoracle error: NOTOK',
                    code: 'UPSTREAM_ERROR',
                },
            });
        });

        it('returns 500 on unknown error', async () => {
            (mockService.getEthereumData as jest.Mock).mockRejectedValueOnce(
                new Error('something broke'),
            );

            const mockReq = {
                params: { address: '0x1234' },
            } as unknown as Request;
            await handler(mockReq, mockRes as unknown as Response);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: { message: 'Internal server error' },
            });
        });
    });
});
