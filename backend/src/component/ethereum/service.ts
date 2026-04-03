import { isAddress, getAddress } from 'ethers';
import {
    IEthereumProvider,
    ICacheStore,
    IBalanceRepository,
    IEthereumService,
} from './interfaces';
import { EthereumDataDto } from './response-models';
import { EtherscanApiError, ValidationError } from './errors';
import { CACHE_TTL_SECONDS, cacheKey } from './constants';
import { logger } from '../../config';

export class EthereumService implements IEthereumService {
    constructor(
        private readonly provider: IEthereumProvider,
        private readonly cache: ICacheStore,
        private readonly repository: IBalanceRepository,
    ) {}

    async getEthereumData(rawAddress: string): Promise<EthereumDataDto> {
        // CORE-05: validate first, before any port calls
        if (!isAddress(rawAddress)) {
            throw new ValidationError('Invalid Ethereum address');
        }
        // CORE-06: normalize to EIP-55 checksum
        const address = getAddress(rawAddress);

        // Check cache for gas + block simultaneously
        const [cachedGas, cachedBlock] = await Promise.all([
            this.cache.get(cacheKey('GAS_PRICE')),
            this.cache.get(cacheKey('BLOCK_NUMBER')),
        ]);

        let gasPriceWei: string;
        let blockNumber: string;

        if (cachedGas && cachedBlock) {
            // Cache hit: use cached values, skip provider calls
            gasPriceWei = cachedGas;
            blockNumber = cachedBlock;
        } else {
            // ETH-01: cache miss — sequential fetch (free-tier rate limit)
            try {
                gasPriceWei = await this.provider.getGasPrice();
                blockNumber = await this.provider.getBlockNumber();
            } catch (err) {
                throw new EtherscanApiError((err as Error).message);
            }

            // Fire-and-forget cache writes
            void this.cache.set(
                cacheKey('GAS_PRICE'),
                gasPriceWei,
                CACHE_TTL_SECONDS,
            );
            void this.cache.set(
                cacheKey('BLOCK_NUMBER'),
                blockNumber,
                CACHE_TTL_SECONDS,
            );
        }

        // Balance is always fetched live (per locked decision)
        const balanceWei = await this.provider
            .getBalance(address)
            .catch((err: Error) => {
                throw new EtherscanApiError(err.message);
            });

        // DB-01/02: fire-and-forget insert — failure never propagates
        void this.repository
            .save({
                address,
                balanceWei,
                fetchedAt: new Date(),
            })
            .catch((err: Error) =>
                logger.warn('DB insert failed', { error: err.message }),
            );

        return this.buildResponse(gasPriceWei, blockNumber, balanceWei);
    }

    private buildResponse(
        gasPriceWei: string,
        blockNumber: string,
        balanceWei: string,
    ): EthereumDataDto {
        return {
            gasPrice: {
                wei: gasPriceWei,
                gwei: (BigInt(gasPriceWei) / 1_000_000_000n).toString(),
            },
            blockNumber,
            balance: {
                wei: balanceWei,
                eth: this.weiToEth(balanceWei),
            },
            timestamp: new Date().toISOString(),
        };
    }

    private weiToEth(weiStr: string): string {
        const ETHER = 1_000_000_000_000_000_000n;
        const wei = BigInt(weiStr);
        const whole = wei / ETHER;
        const remainder = wei % ETHER;
        if (remainder === 0n) {
            return whole.toString();
        }
        const fracStr = remainder
            .toString()
            .padStart(18, '0')
            .replace(/0+$/, '');
        return `${whole}.${fracStr}`;
    }
}
