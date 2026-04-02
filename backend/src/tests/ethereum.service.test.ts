jest.mock('../config', () => ({
    logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn() },
}));

import { EthereumService } from '../component/ethereum/service';
import {
    IEthereumProvider,
    ICacheStore,
    IBalanceRepository,
} from '../component/ethereum/interfaces';
import {
    ValidationError,
    EtherscanApiError,
} from '../component/ethereum/errors';
import { CACHE_KEYS } from '../component/ethereum/constants';

const TEST_ADDRESS_LOWER = '0xd8da6bf26964af9d7eed9e03e53415d37aa96045';
const TEST_ADDRESS_CHECKSUM = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

const VALID_GAS_PRICE_WEI = '20000000000';
const VALID_BLOCK_NUMBER = '15000000';
const VALID_BALANCE_WEI = '1000000000000000000';

const mockProvider: jest.Mocked<IEthereumProvider> = {
    getGasPrice: jest.fn(),
    getBlockNumber: jest.fn(),
    getBalance: jest.fn(),
};

const mockCache: jest.Mocked<ICacheStore> = {
    get: jest.fn(),
    set: jest.fn(),
};

const mockRepository: jest.Mocked<IBalanceRepository> = {
    save: jest.fn(),
};

describe('EthereumService', () => {
    let service: EthereumService;

    beforeEach(() => {
        service = new EthereumService(mockProvider, mockCache, mockRepository);
        jest.clearAllMocks();
        mockRepository.save.mockResolvedValue(undefined);
        mockCache.set.mockResolvedValue(undefined);
    });

    it('throws ValidationError for invalid Ethereum address', async () => {
        await expect(service.getEthereumData('not-an-address')).rejects.toThrow(
            ValidationError,
        );

        const err = await service
            .getEthereumData('not-an-address')
            .catch((e: unknown) => e);
        expect((err as ValidationError).code).toBe('VALIDATION_ERROR');
        expect(mockProvider.getGasPrice).not.toHaveBeenCalled();
    });

    it('normalizes address to EIP-55 checksum format', async () => {
        mockCache.get.mockResolvedValue(null);
        mockProvider.getGasPrice.mockResolvedValue(VALID_GAS_PRICE_WEI);
        mockProvider.getBlockNumber.mockResolvedValue(VALID_BLOCK_NUMBER);
        mockProvider.getBalance.mockResolvedValue(VALID_BALANCE_WEI);

        await service.getEthereumData(TEST_ADDRESS_LOWER);

        expect(mockProvider.getBalance).toHaveBeenCalledWith(
            TEST_ADDRESS_CHECKSUM,
        );
    });

    it('returns dual-unit gas price (wei and gwei)', async () => {
        mockCache.get.mockResolvedValue(null);
        mockProvider.getGasPrice.mockResolvedValue(VALID_GAS_PRICE_WEI);
        mockProvider.getBlockNumber.mockResolvedValue(VALID_BLOCK_NUMBER);
        mockProvider.getBalance.mockResolvedValue(VALID_BALANCE_WEI);

        const result = await service.getEthereumData(TEST_ADDRESS_LOWER);

        expect(result.gasPrice.wei).toBe(VALID_GAS_PRICE_WEI);
        expect(result.gasPrice.gwei).toBe('20');
    });

    it('returns dual-unit balance (wei and eth)', async () => {
        const balanceWei = '1500000000000000000';
        mockCache.get.mockResolvedValue(null);
        mockProvider.getGasPrice.mockResolvedValue(VALID_GAS_PRICE_WEI);
        mockProvider.getBlockNumber.mockResolvedValue(VALID_BLOCK_NUMBER);
        mockProvider.getBalance.mockResolvedValue(balanceWei);

        const result = await service.getEthereumData(TEST_ADDRESS_LOWER);

        expect(result.balance.wei).toBe(balanceWei);
        expect(result.balance.eth).toBe('1.5');
    });

    it('includes ISO 8601 timestamp in response', async () => {
        mockCache.get.mockResolvedValue(null);
        mockProvider.getGasPrice.mockResolvedValue(VALID_GAS_PRICE_WEI);
        mockProvider.getBlockNumber.mockResolvedValue(VALID_BLOCK_NUMBER);
        mockProvider.getBalance.mockResolvedValue(VALID_BALANCE_WEI);

        const result = await service.getEthereumData(TEST_ADDRESS_LOWER);

        expect(result.timestamp).toMatch(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
        );
    });

    it('fetches gas, block, and balance via provider on cache miss', async () => {
        mockCache.get.mockResolvedValue(null);
        mockProvider.getGasPrice.mockResolvedValue(VALID_GAS_PRICE_WEI);
        mockProvider.getBlockNumber.mockResolvedValue(VALID_BLOCK_NUMBER);
        mockProvider.getBalance.mockResolvedValue(VALID_BALANCE_WEI);

        await service.getEthereumData(TEST_ADDRESS_LOWER);

        expect(mockProvider.getGasPrice).toHaveBeenCalledTimes(1);
        expect(mockProvider.getBlockNumber).toHaveBeenCalledTimes(1);
        expect(mockProvider.getBalance).toHaveBeenCalledTimes(1);
    });

    it('uses cached gas and block when cache hit, only fetches balance', async () => {
        mockCache.get.mockImplementation((key: string) => {
            if (key.includes('gasPrice')) {
                return Promise.resolve(VALID_GAS_PRICE_WEI);
            }
            if (key.includes('blockNumber')) {
                return Promise.resolve(VALID_BLOCK_NUMBER);
            }
            return Promise.resolve(null);
        });
        mockProvider.getBalance.mockResolvedValue(VALID_BALANCE_WEI);

        await service.getEthereumData(TEST_ADDRESS_LOWER);

        expect(mockProvider.getGasPrice).not.toHaveBeenCalled();
        expect(mockProvider.getBlockNumber).not.toHaveBeenCalled();
        expect(mockProvider.getBalance).toHaveBeenCalledTimes(1);
    });

    it('throws EtherscanApiError when provider fails', async () => {
        mockCache.get.mockResolvedValue(null);
        mockProvider.getGasPrice.mockRejectedValue(new Error('API down'));

        await expect(
            service.getEthereumData(TEST_ADDRESS_LOWER),
        ).rejects.toThrow(EtherscanApiError);

        const err = await service
            .getEthereumData(TEST_ADDRESS_LOWER)
            .catch((e: unknown) => e);
        expect((err as EtherscanApiError).code).toBe('UPSTREAM_ERROR');
    });

    it('fires and forgets DB insert without awaiting', async () => {
        mockCache.get.mockResolvedValue(null);
        mockProvider.getGasPrice.mockResolvedValue(VALID_GAS_PRICE_WEI);
        mockProvider.getBlockNumber.mockResolvedValue(VALID_BLOCK_NUMBER);
        mockProvider.getBalance.mockResolvedValue(VALID_BALANCE_WEI);
        mockRepository.save.mockRejectedValue(new Error('DB down'));

        const result = await service.getEthereumData(TEST_ADDRESS_LOWER);

        expect(result.gasPrice.wei).toBe(VALID_GAS_PRICE_WEI);
        expect(result.balance.wei).toBe(VALID_BALANCE_WEI);
    });

    it('writes gas and block to cache after cache miss', async () => {
        mockCache.get.mockResolvedValue(null);
        mockProvider.getGasPrice.mockResolvedValue(VALID_GAS_PRICE_WEI);
        mockProvider.getBlockNumber.mockResolvedValue(VALID_BLOCK_NUMBER);
        mockProvider.getBalance.mockResolvedValue(VALID_BALANCE_WEI);

        await service.getEthereumData(TEST_ADDRESS_LOWER);

        expect(mockCache.set).toHaveBeenCalledWith(
            CACHE_KEYS.GAS_PRICE,
            VALID_GAS_PRICE_WEI,
            15,
        );
        expect(mockCache.set).toHaveBeenCalledWith(
            CACHE_KEYS.BLOCK_NUMBER,
            VALID_BLOCK_NUMBER,
            15,
        );
    });
});
