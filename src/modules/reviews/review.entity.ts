import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity({ name: "reviews" })
export class Review {
  @PrimaryGeneratedColumn("increment")
  id!: number;

  @Column()
  businessId!: number;

  /** Google's own review id. Unique so a re-sync updates instead of duplicating. */
  @Column({ type: "varchar", nullable: true, unique: true })
  googleReviewId!: string | null;

  /**
   * Full Business Profile resource name -
   * "accounts/{a}/locations/{l}/reviews/{r}". Needed to PUT a reply back.
   */
  @Column({ type: "varchar", nullable: true })
  googleReviewName!: string | null;

  /** "google" for anything synced from Google, "manual" for in-app rows. */
  @Column({ type: "varchar", default: "manual" })
  platform!: string;

  @Column({ type: "varchar", nullable: true })
  authorName!: string | null;

  @Column({ type: "varchar", nullable: true })
  authorPhotoUrl!: string | null;

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

  /** False when a reply is saved locally but Google rejected the write. */
  @Column({ type: "boolean", default: false })
  replySyncedToGoogle!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
