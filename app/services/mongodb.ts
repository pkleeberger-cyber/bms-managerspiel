import { Db, MongoClient } from "mongodb";

import { getMongoDbUri } from "@/lib/environment";

type MongoClientCache = {
  clientPromise?: Promise<MongoClient>;
};

const globalWithMongoClient = globalThis as typeof globalThis & {
  mongoClientCache?: MongoClientCache;
};

const mongoClientCache =
  globalWithMongoClient.mongoClientCache ?? (globalWithMongoClient.mongoClientCache = {});

function createMongoClient(): Promise<MongoClient> {
  const client = new MongoClient(getMongoDbUri());

  return client.connect().catch((error: unknown) => {
    mongoClientCache.clientPromise = undefined;
    throw error;
  });
}

export function getMongoClient(): Promise<MongoClient> {
  mongoClientCache.clientPromise ??= createMongoClient();

  return mongoClientCache.clientPromise;
}

export async function getDatabase(): Promise<Db> {
  const client = await getMongoClient();

  return client.db(process.env.MONGODB_DATABASE);
}
