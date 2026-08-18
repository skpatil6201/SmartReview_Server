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

  @Column({ type: "varchar", nullable: true })
  googlePlaceId!: string | null;

  @Column({ type: "int", nullable: true })
  subscriptionId!: number | null;

  @Column({ type: "varchar", nullable: true })
  otp!: string | null;

  @Column({ type: "timestamptz", nullable: true })
  otpExpires!: Date | null;

  @Column({ type: "boolean", default: false })
  otpVerified!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ default: false })
  isAdmin!: boolean;

  

  @UpdateDateColumn()
  updatedAt!: Date;
}
