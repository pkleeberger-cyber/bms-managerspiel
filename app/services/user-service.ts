import type { Manager } from "@/models/manager";
import type { Role } from "@/models/role";
import type { User } from "@/models/user";
import {
  ManagerRepository,
  type CreateManagerInput,
} from "@/repositories/manager-repository";
import {
  UserRepository,
  type CreateUserInput,
} from "@/repositories/user-repository";

export type CreateUserWithManagerInput = {
  email: string;
  // Password hashing will be added by the future authentication layer.
  passwordHash: string;
  role: Role;
  isActive: boolean;
  manager: Omit<CreateManagerInput, "userId">;
};

export type UserWithManager = {
  user: User;
  manager: Manager;
};

export class UserService {
  constructor(
    private readonly userRepository = new UserRepository(),
    private readonly managerRepository = new ManagerRepository(),
  ) {}

  async createUserWithManager(
    input: CreateUserWithManagerInput,
  ): Promise<UserWithManager> {
    const userInput: CreateUserInput = {
      email: input.email,
      passwordHash: input.passwordHash,
      role: input.role,
      isActive: input.isActive,
    };
    const user = await this.userRepository.create(userInput);
    const manager = await this.managerRepository.create({
      ...input.manager,
      userId: user.id,
    });

    return { user, manager };
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }
}
