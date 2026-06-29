import type { Manager } from "@/models/manager";
import { ManagerRepository } from "@/repositories/manager-repository";

export class ManagerService {
  constructor(private readonly managerRepository = new ManagerRepository()) {}

  async getManagerByUserId(userId: string): Promise<Manager | null> {
    return this.managerRepository.findByUserId(userId);
  }
}
