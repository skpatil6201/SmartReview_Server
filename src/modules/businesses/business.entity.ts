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

  // Nullable: every business predating the profile form has none of these.
  @Column({ type: "varchar", nullable: true })
  ownerName!: string | null;

  @Column({ type: "varchar", nullable: true })
  location!: string | null;

  // Server-relative path to the uploaded profile photo, e.g.
  // "/uploads/avatars/12-a1b2c3.jpg". Stored relative rather than absolute so
  // the photo keeps resolving when the server's host or LAN IP changes.
  @Column({ type: "varchar", nullable: true })
  avatarUrl!: string | null;

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
