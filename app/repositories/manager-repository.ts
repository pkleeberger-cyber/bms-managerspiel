import { ObjectId, type Collection } from "mongodb";

import {
  DEFAULT_STARTING_BUDGET_CENTS,
  type Manager,
} from "@/models/manager";
import { getDatabase } from "@/services/mongodb";

type ManagerDocument = Omit<Manager, "id" | "userId"> & {
  userId: ObjectId;
};

export type CreateManagerInput = {
  userId: string;
  displayName: string;
  firstName: string;
  lastName: string;
  leagueLevel: number;
  currentBudgetCents: number;
  startingBudgetCents?: number;
  isActive: boolean;
};

export type UpdateManagerInput = Partial<
  Pick<
    Manager,
    | "displayName"
    | "firstName"
    | "lastName"
    | "leagueLevel"
    | "currentBudgetCents"
    | "startingBudgetCents"
    | "isActive"
  >
>;

function toManager(id: ObjectId, document: ManagerDocument): Manager {
  return {
    id: id.toHexString(),
    ...document,
    userId: document.userId.toHexString(),
  };
}

export class ManagerRepository {
  private async getCollection(): Promise<Collection<ManagerDocument>> {
    const database = await getDatabase();

    return database.collection<ManagerDocument>("managers");
  }

  async findById(id: string): Promise<Manager | null> {
    if (!ObjectId.isValid(id)) {
      return null;
    }

    const collection = await this.getCollection();
    const document = await collection.findOne({ _id: new ObjectId(id) });

    return document ? toManager(document._id, document) : null;
  }

  async findByUserId(userId: string): Promise<Manager | null> {
    if (!ObjectId.isValid(userId)) {
      return null;
    }

    const collection = await this.getCollection();
    const document = await collection.findOne({ userId: new ObjectId(userId) });

    return document ? toManager(document._id, document) : null;
  }

  async create(input: CreateManagerInput): Promise<Manager> {
    const collection = await this.getCollection();
    const timestamp = new Date();
    const document: ManagerDocument = {
      ...input,
      userId: new ObjectId(input.userId),
      startingBudgetCents:
        input.startingBudgetCents ?? DEFAULT_STARTING_BUDGET_CENTS,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const result = await collection.insertOne(document);

    return toManager(result.insertedId, document);
  }

  async update(
    id: string,
    input: UpdateManagerInput,
  ): Promise<Manager | null> {
    if (!ObjectId.isValid(id)) {
      return null;
    }

    const collection = await this.getCollection();
    const objectId = new ObjectId(id);
    const document = await collection.findOneAndUpdate(
      { _id: objectId },
      {
        $set: {
          ...input,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" },
    );

    return document ? toManager(document._id, document) : null;
  }
}
