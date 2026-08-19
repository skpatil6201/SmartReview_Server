import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity({ name: "payments" })
export class Payment {
  @PrimaryGeneratedColumn("increment")
  id!: number;

  @Column()
  businessId!: number;

  @Column({ type: "int" })
  subscriptionId!: number;

  @Column({ type: "varchar", nullable: true })
  razorpayOrderId!: string | null;

  @Column({ type: "varchar", nullable: true })
  razorpayPaymentId!: string | null;

  @Column({ type: "varchar", nullable: true })
  razorpaySignature!: string | null;

  @Column({ type: "float" })
  amount!: number;

  @Column({ type: "varchar", default: "INR" })
  currency!: string;

  @Column({ type: "varchar", default: "created" })
  status!: string;

  @Column({ type: "text", nullable: true })
  failureReason!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
