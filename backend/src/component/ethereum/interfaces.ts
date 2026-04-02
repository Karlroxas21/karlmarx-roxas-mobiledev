export interface IEthereumProvider {
    getGasPrice(): Promise<string>;
    getBlockNumber(): Promise<string>;
    getBalance(address: string): Promise<string>;
}

export interface ICacheStore {
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ttlSeconds: number): Promise<void>;
}

export interface BalanceSaveDto {
    address: string;
    balanceWei: string;
    fetchedAt: Date;
}

export interface IBalanceRepository {
    save(data: BalanceSaveDto): Promise<void>;
}
