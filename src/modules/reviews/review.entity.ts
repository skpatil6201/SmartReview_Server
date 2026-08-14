import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity({ name: "reviews" })
export class Review {
  @PrimaryGeneratedColumn("increment")
  id!: number;

  @Column()
  businessId!: number;

  @Column({ type: "varchar", nullable: true, unique: true })
  googleReviewId!: string | null;

  @Column({ type: "varchar", nullable: true })
  authorName!: string | null;

  @Column("int")
  rating!: number;

  @Column("text")
  comment!: string;

  @Column({ type: "timestamptz", nullable: true })
  reviewDate!: Date | null;

  @Column({ type: "text", nullable: true })
  reply!: string | null;

  @Column({ type: "timestamptz", nullable: true })
  replyDate!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
