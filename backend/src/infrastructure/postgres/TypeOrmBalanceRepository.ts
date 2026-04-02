import { Repository } from 'typeorm';
import {
    IBalanceRepository,
    BalanceSaveDto,
} from '../../component/ethereum/interfaces';
import { Balance } from './Balance.entity';

export class TypeOrmBalanceRepository implements IBalanceRepository {
    constructor(private readonly repository: Repository<Balance>) {}

    async save(data: BalanceSaveDto): Promise<void> {
        const entity = this.repository.create({
            address: data.address,
            balanceWei: data.balanceWei,
            fetchedAt: data.fetchedAt,
        });
        await this.repository.save(entity);
    }
}
