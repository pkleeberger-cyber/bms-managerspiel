import { PrismaUserRepository } from "@/infrastructure";
import type {
  CreateInvitedUserInput,
  LinkedManagerRecord,
  LinkUserToManagerInput,
  UserRecord,
  UserRepository,
} from "@/infrastructure";

export type UserAdministrationSnapshot = {
  databaseStatus: "CONNECTED" | "UNAVAILABLE";
  users: readonly UserRecord[];
  unlinkedManagers: readonly LinkedManagerRecord[];
  userCount: number;
  linkedManagerCount: number;
  unlinkedManagerCount: number;
};

export class UserService {
  constructor(
    private readonly userRepository: UserRepository = new PrismaUserRepository(),
  ) {}

  async loadUserAdministration(): Promise<UserAdministrationSnapshot> {
    const [users, unlinkedManagers] = await Promise.all([
      this.userRepository.listUsers(),
      this.userRepository.findUnlinkedManagers(),
    ]);

    if (!users || !unlinkedManagers) {
      return createUnavailableSnapshot();
    }

    return {
      databaseStatus: "CONNECTED",
      users,
      unlinkedManagers,
      userCount: users.length,
      linkedManagerCount: users.filter((user) => user.manager).length,
      unlinkedManagerCount: unlinkedManagers.length,
    };
  }

  async createInvitedUser(input: CreateInvitedUserInput): Promise<UserRecord> {
    return this.userRepository.createInvitedUser({
      email: input.email.trim().toLowerCase(),
      displayName: input.displayName.trim(),
      role: input.role,
    });
  }

  async linkUserToManager(input: LinkUserToManagerInput): Promise<UserRecord> {
    return this.userRepository.linkUserToManager(input);
  }

  async unlinkUserFromManager(userId: string): Promise<UserRecord> {
    return this.userRepository.unlinkUserFromManager(userId);
  }
}

export async function loadUserAdministration() {
  const service = new UserService();

  return service.loadUserAdministration();
}

export async function createInvitedUser(input: CreateInvitedUserInput) {
  const service = new UserService();

  return service.createInvitedUser(input);
}

export async function linkUserToManager(input: LinkUserToManagerInput) {
  const service = new UserService();

  return service.linkUserToManager(input);
}

export async function unlinkUserFromManager(userId: string) {
  const service = new UserService();

  return service.unlinkUserFromManager(userId);
}

function createUnavailableSnapshot(): UserAdministrationSnapshot {
  return {
    databaseStatus: "UNAVAILABLE",
    users: [],
    unlinkedManagers: [],
    userCount: 0,
    linkedManagerCount: 0,
    unlinkedManagerCount: 0,
  };
}
