jest.mock('../config', () => ({
    logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn() },
}));

import { TypeOrmBalanceRepository } from '../infrastructure/postgres/TypeOrmBalanceRepository';

const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
};

let repo: TypeOrmBalanceRepository;

beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    repo = new TypeOrmBalanceRepository(mockRepository as any);
    jest.clearAllMocks();
});

describe('TypeOrmBalanceRepository', () => {
    it('save() creates entity and calls repository.save (DB-01)', async () => {
        const fakeEntity = {
            address: '0xABC',
            balanceWei: '1000',
            fetchedAt: new Date('2026-01-01'),
        };
        mockRepository.create.mockReturnValueOnce(fakeEntity);
        mockRepository.save.mockResolvedValueOnce(fakeEntity);

        await repo.save({
            address: '0xABC',
            balanceWei: '1000',
            fetchedAt: new Date('2026-01-01'),
        });

        expect(mockRepository.create).toHaveBeenCalledWith({
            address: '0xABC',
            balanceWei: '1000',
            fetchedAt: expect.any(Date),
        });
        expect(mockRepository.save).toHaveBeenCalledWith(fakeEntity);
    });

    it('save() throws on database error without swallowing (DB-03)', async () => {
        const fakeEntity = {
            address: '0xABC',
            balanceWei: '1000',
            fetchedAt: new Date('2026-01-01'),
        };
        mockRepository.create.mockReturnValueOnce(fakeEntity);
        mockRepository.save.mockRejectedValueOnce(
            new Error('Connection refused'),
        );

        await expect(
            repo.save({
                address: '0xABC',
                balanceWei: '1000',
                fetchedAt: new Date('2026-01-01'),
            }),
        ).rejects.toThrow('Connection refused');
    });
});
