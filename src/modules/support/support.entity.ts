import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity({ name: "support_forms" })
export class SupportForm {
  @PrimaryGeneratedColumn("increment")
  id!: number;

  @Column({ type: "int", nullable: true })
  businessId!: number | null;

  @Column()
  name!: string;

  @Column()
  email!: string;

  @Column({ type: "varchar", nullable: true })
  subject!: string | null;

  @Column("text")
  message!: string;

  @Column({ type: "varchar", default: "open" })
  status!: string;

  @Column({ type: "text", nullable: true })
  adminReply!: string | null;

  @Column({ type: "timestamptz", nullable: true })
  adminReplyDate!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
