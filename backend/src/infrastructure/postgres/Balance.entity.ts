import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    Index,
} from 'typeorm';

@Entity('balance_history')
export class Balance {
    @PrimaryGeneratedColumn()
    id!: number;

    @Index()
    @Column({ type: 'varchar' })
    address!: string;

    @Column({ type: 'varchar' })
    balanceWei!: string;

    @CreateDateColumn()
    fetchedAt!: Date;
}
