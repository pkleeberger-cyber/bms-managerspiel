Sprint 1 – Infrastructure

Context

You are working on the project BMS Managerspiel.

This is a private football manager web application built with:

* Next.js (App Router)
* TypeScript
* Tailwind CSS
* MongoDB Atlas

Follow the existing project structure.

Do not invent business rules.

If information is missing, leave a TODO.

⸻

Goal

Build the technical foundation only.

Do NOT implement authentication, users, managers or football logic.

⸻

Tasks

1. Create a reusable MongoDB connection service.
2. Read the connection string from .env.local.
3. Ensure only one MongoDB client instance exists.
4. Create /api/health.
5. /api/health must return:

* application status
* MongoDB connection status
* database name
* server timestamp

6. Create folders if missing:

* lib
* services
* models
* types

7. Add clean error handling.
8. Use TypeScript everywhere.

⸻

Do NOT

* implement login
* create users
* create managers
* create football models
* create UI pages

⸻

Definition of Done

When opening:

/api/health

the response must indicate whether the application is healthy and connected to MongoDB.