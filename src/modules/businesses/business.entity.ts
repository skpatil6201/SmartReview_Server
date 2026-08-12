import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity({ name: "businesses" })
export class Business {
  @PrimaryGeneratedColumn("increment")
  id!: number;

  @Column({ unique: true })
  businessName!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  phoneNumber!: string;

  @Column()
  passwordHash!: string;

  @Column()
  passwordSalt!: string;

  @Column()
  address!: string;

  @Column()
  industryType!: string;

  @Column({ unique: true })
  businessNumber!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ default: false })
  isAdmin!: boolean;

  

  @UpdateDateColumn()
  updatedAt!: Date;
}
