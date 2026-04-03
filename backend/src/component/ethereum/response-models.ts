export interface GasPriceDto {
    wei: string;
    gwei: string;
}

export interface BalanceDto {
    wei: string;
    eth: string;
}

export interface EthereumDataDto {
    gasPrice: GasPriceDto;
    blockNumber: string;
    balance: BalanceDto;
    timestamp: string; // ISO 8601
}

export interface SuccessEnvelope<T> {
    data: T;
}

export interface ErrorBody {
    message: string;
    code?: 'VALIDATION_ERROR' | 'UPSTREAM_ERROR';
}

export interface ErrorEnvelope {
    error: ErrorBody;
}
