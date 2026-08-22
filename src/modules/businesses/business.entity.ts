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

  @Column({ type: "varchar", nullable: true })
  passwordHash!: string | null;

  @Column({ type: "varchar", nullable: true })
  passwordSalt!: string | null;

  @Column()
  address!: string;

  @Column()
  industryType!: string;

  @Column({ type: "varchar", unique: true, nullable: true })
  businessNumber!: string | null;

  /** Public Places API id - still used for the signup listing check. */
  @Column({ type: "varchar", nullable: true })
  googlePlaceId!: string | null;

  // ── Google account identity (Sign-In with Google) ───────────────────────
  /** Google's stable subject id for the signed-in person. */
  @Column({ type: "varchar", unique: true, nullable: true })
  googleUserId!: string | null;

  @Column({ type: "varchar", nullable: true })
  googleEmail!: string | null;

  @Column({ type: "varchar", nullable: true })
  googleDisplayName!: string | null;

  @Column({ type: "varchar", nullable: true })
  googlePhotoUrl!: string | null;

  // ── Google Business Profile connection (OAuth, business.manage) ─────────
  /**
   * not_started -> pending (consent opened) -> connected | failed.
   * "needs_location" means we hold tokens but no location has been chosen yet.
   */
  @Column({ type: "varchar", default: "not_started" })
  googleConnectionStatus!:
    | "not_started"
    | "pending"
    | "needs_location"
    | "connected"
    | "failed"
    | "rejected";

  @Column({ type: "text", nullable: true })
  googleAccessToken!: string | null;

  /** Google only returns this on the first consent, so never overwrite it with null. */
  @Column({ type: "text", nullable: true })
  googleRefreshToken!: string | null;

  @Column({ type: "timestamptz", nullable: true })
  googleTokenExpiresAt!: Date | null;

  @Column({ type: "varchar", nullable: true })
  googleScope!: string | null;

  /** Resource name of the chosen GBP account, e.g. "accounts/1234567890". */
  @Column({ type: "varchar", nullable: true })
  googleAccountName!: string | null;

  /** Resource name of the chosen location, e.g. "locations/987654321". */
  @Column({ type: "varchar", nullable: true })
  googleLocationName!: string | null;

  @Column({ type: "varchar", nullable: true })
  googleLocationTitle!: string | null;

  @Column({ type: "timestamptz", nullable: true })
  googleConnectedAt!: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  googleReviewsSyncedAt!: Date | null;

  @Column({ type: "varchar", nullable: true })
  googleConnectionError!: string | null;

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
