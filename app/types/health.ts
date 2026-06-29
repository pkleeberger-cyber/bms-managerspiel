export type ApplicationStatus = "healthy" | "unhealthy";
export type MongoDbStatus = "connected" | "disconnected";

export type HealthResponse = {
  application: {
    status: ApplicationStatus;
    version: string;
  };
  mongodb: {
    status: MongoDbStatus;
    databaseName: string;
  };
  timestamp: string;
};
