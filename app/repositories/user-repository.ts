import { ObjectId, type Collection } from "mongodb";

import type { Role } from "@/models/role";
import type { User } from "@/models/user";
import { getDatabase } from "@/services/mongodb";

type UserDocument = Omit<User, "id">;

export type CreateUserInput = {
  email: string;
  passwordHash: string;
  role: Role;
  isActive: boolean;
  lastLoginAt?: Date | null;
};

export type UpdateUserInput = Partial<
  Pick<User, "email" | "passwordHash" | "role" | "isActive" | "lastLoginAt">
>;

function toUser(id: ObjectId, document: UserDocument): User {
  return {
    id: id.toHexString(),
    ...document,
  };
}

export class UserRepository {
  private async getCollection(): Promise<Collection<UserDocument>> {
    const database = await getDatabase();

    return database.collection<UserDocument>("users");
  }

  async findById(id: string): Promise<User | null> {
    if (!ObjectId.isValid(id)) {
      return null;
    }

    const collection = await this.getCollection();
    const document = await collection.findOne({ _id: new ObjectId(id) });

    return document ? toUser(document._id, document) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const collection = await this.getCollection();
    const document = await collection.findOne({ email });

    return document ? toUser(document._id, document) : null;
  }

  async create(input: CreateUserInput): Promise<User> {
    const collection = await this.getCollection();
    const timestamp = new Date();
    const document: UserDocument = {
      ...input,
      lastLoginAt: input.lastLoginAt ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const result = await collection.insertOne(document);

    return toUser(result.insertedId, document);
  }

  async update(
    id: string,
    input: UpdateUserInput,
  ): Promise<User | null> {
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

    return document ? toUser(document._id, document) : null;
  }
}
