export class ValidationError extends Error {
    public readonly code = 'VALIDATION_ERROR' as const;

    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
        Object.setPrototypeOf(this, ValidationError.prototype);
    }
}

export class EtherscanApiError extends Error {
    public readonly code = 'UPSTREAM_ERROR' as const;

    constructor(message: string) {
        super(message);
        this.name = 'EtherscanApiError';
        Object.setPrototypeOf(this, EtherscanApiError.prototype);
    }
}
