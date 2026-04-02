jest.mock('../config', () => ({
    logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn() },
}));

jest.mock('axios');

import { EtherscanAdapter } from '../infrastructure/etherscan/EtherscanAdapter';
import { EtherscanApiError } from '../component/ethereum/errors';
import axios from 'axios';

const mockedAxios = axios as jest.Mocked<typeof axios>;

const API_KEY = 'test-api-key';
const BASE_URL = 'https://api.etherscan.io/api';

let adapter: EtherscanAdapter;

beforeEach(() => {
    adapter = new EtherscanAdapter(BASE_URL, API_KEY);
    jest.clearAllMocks();
});

describe('EtherscanAdapter', () => {
    describe('getGasPrice()', () => {
        it('returns Wei string from Etherscan gasoracle ProposeGasPrice', async () => {
            mockedAxios.get.mockResolvedValueOnce({
                data: {
                    status: '1',
                    message: 'OK',
                    result: { ProposeGasPrice: '0.496840168' },
                },
            });

            const result = await adapter.getGasPrice();

            expect(result).toBe('496840168');
            expect(mockedAxios.get).toHaveBeenCalledWith(BASE_URL, {
                params: expect.objectContaining({
                    module: 'gastracker',
                    action: 'gasoracle',
                    apikey: API_KEY,
                }),
            });
        });

        it('converts integer Gwei string to Wei correctly', async () => {
            mockedAxios.get.mockResolvedValueOnce({
                data: {
                    status: '1',
                    message: 'OK',
                    result: { ProposeGasPrice: '20' },
                },
            });

            const result = await adapter.getGasPrice();

            expect(result).toBe('20000000000');
        });

        it('throws EtherscanApiError when gasoracle status is not 1', async () => {
            mockedAxios.get.mockResolvedValueOnce({
                data: {
                    status: '0',
                    message: 'NOTOK',
                    result: '',
                },
            });

            await expect(adapter.getGasPrice()).rejects.toThrow(
                EtherscanApiError,
            );

            mockedAxios.get.mockResolvedValueOnce({
                data: {
                    status: '0',
                    message: 'NOTOK',
                    result: '',
                },
            });

            const err = await adapter.getGasPrice().catch((e: unknown) => e);
            expect((err as EtherscanApiError).code).toBe('UPSTREAM_ERROR');
        });
    });

    describe('getBlockNumber()', () => {
        it('returns decimal string from hex block number', async () => {
            mockedAxios.get.mockResolvedValueOnce({
                data: {
                    jsonrpc: '2.0',
                    id: 1,
                    result: '0x1661760',
                },
            });

            const result = await adapter.getBlockNumber();

            expect(result).toBe('23468896');
            expect(mockedAxios.get).toHaveBeenCalledWith(BASE_URL, {
                params: expect.objectContaining({
                    module: 'proxy',
                    action: 'eth_blockNumber',
                    apikey: API_KEY,
                }),
            });
        });

        it('throws EtherscanApiError when result is not a hex string', async () => {
            mockedAxios.get.mockResolvedValueOnce({
                data: {
                    jsonrpc: '2.0',
                    id: 1,
                    result: null,
                },
            });

            await expect(adapter.getBlockNumber()).rejects.toThrow(
                EtherscanApiError,
            );
        });
    });

    describe('getBalance(address)', () => {
        it('returns Wei balance string from Etherscan account balance', async () => {
            mockedAxios.get.mockResolvedValueOnce({
                data: {
                    status: '1',
                    message: 'OK',
                    result: '172774397764084972158218',
                },
            });

            const result = await adapter.getBalance('0xTestAddr');

            expect(result).toBe('172774397764084972158218');
            expect(mockedAxios.get).toHaveBeenCalledWith(BASE_URL, {
                params: expect.objectContaining({
                    module: 'account',
                    action: 'balance',
                    address: '0xTestAddr',
                    tag: 'latest',
                    apikey: API_KEY,
                }),
            });
        });

        it('throws EtherscanApiError when balance status is not 1', async () => {
            mockedAxios.get.mockResolvedValueOnce({
                data: {
                    status: '0',
                    message: 'Error! Invalid address format',
                    result: '',
                },
            });

            await expect(adapter.getBalance('0xTestAddr')).rejects.toThrow(
                EtherscanApiError,
            );
        });
    });
});
