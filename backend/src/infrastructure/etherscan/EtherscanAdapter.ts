import axios from 'axios';
import { IEthereumProvider } from '../../component/ethereum/interfaces';
import { EtherscanApiError } from '../../component/ethereum/errors';

interface EtherscanEnvelope<T> {
    status: string;
    message: string;
    result: T;
}

interface GasOracleResult {
    LastBlock: string;
    SafeGasPrice: string;
    ProposeGasPrice: string;
    FastGasPrice: string;
    suggestBaseFee: string;
    gasUsedRatio: string;
}

interface JsonRpcResult {
    jsonrpc: string;
    id: number;
    result: string;
}

export class EtherscanAdapter implements IEthereumProvider {
    constructor(
        private readonly baseUrl: string,
        private readonly apiKey: string,
    ) {}

    async getGasPrice(): Promise<string> {
        const response = await axios.get<EtherscanEnvelope<GasOracleResult>>(
            this.baseUrl,
            {
                params: {
                    module: 'gastracker',
                    action: 'gasoracle',
                    chainid: 1,
                    apikey: this.apiKey,
                },
            },
        );
        const data = response.data;
        if (data.status !== '1') {
            throw new EtherscanApiError(
                `Etherscan gasoracle error: ${data.message}`,
            );
        }
        const gweiFloat = parseFloat(data.result.ProposeGasPrice);
        return BigInt(Math.floor(gweiFloat * 1e9)).toString();
    }

    async getBlockNumber(): Promise<string> {
        const response = await axios.get<JsonRpcResult>(this.baseUrl, {
            params: {
                module: 'proxy',
                action: 'eth_blockNumber',
                chainid: 1,
                apikey: this.apiKey,
            },
        });
        const hex = response.data.result;
        if (!hex || !hex.startsWith('0x')) {
            throw new EtherscanApiError(
                'Etherscan blockNumber: unexpected response',
            );
        }
        return parseInt(hex, 16).toString();
    }

    async getBalance(address: string): Promise<string> {
        const response = await axios.get<EtherscanEnvelope<string>>(
            this.baseUrl,
            {
                params: {
                    module: 'account',
                    action: 'balance',
                    address,
                    tag: 'latest',
                    chainid: 1,
                    apikey: this.apiKey,
                },
            },
        );
        const data = response.data;
        if (data.status !== '1') {
            throw new EtherscanApiError(
                `Etherscan balance error: ${data.message}`,
            );
        }
        return data.result;
    }
}
