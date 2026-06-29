export function getMongoDbUri(): string {
  const mongoDbUri = process.env.MONGODB_URI;

  if (!mongoDbUri) {
    throw new Error("MONGODB_URI is not configured");
  }

  return mongoDbUri;
}

export function getMongoDbDatabaseName(): string {
  const databaseName = process.env.MONGODB_DATABASE;

  if (!databaseName) {
    throw new Error("MONGODB_DATABASE is not configured");
  }

  return databaseName;
}
