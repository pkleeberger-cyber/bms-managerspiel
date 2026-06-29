import type { Role } from "@/models/role";

export type User = {
  id: string;
  email: string;
  // Authentication will verify a securely generated password hash stored here.
  passwordHash: string;
  role: Role;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
