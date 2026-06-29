Sprint 2.2 – Identity Models

Context

Project: BMS Managerspiel

The app is a private Bundesliga manager game.

Existing stack:

* Next.js App Router
* TypeScript
* MongoDB Atlas
* MongoDB service already exists
* .env.local already contains MONGODB_URI and MONGODB_DATABASE

Do not implement login yet.

⸻

Goal

Create the domain foundation for users and managers.

A user is used for authentication and authorization.
A manager represents the person inside the game.

Relationship:

* One User has exactly one Manager.
* One Manager belongs to exactly one User.

⸻

Roles

Create a role enum:

* MANAGER
* DATA_MANAGER
* ADMIN

Permissions are hierarchical:

* MANAGER: can manage own team
* DATA_MANAGER: MANAGER rights + can enter matchday data
* ADMIN: DATA_MANAGER rights + can manage the system

⸻

Tasks

1. Create TypeScript types for:
    * User
    * Manager
    * Role
2. Create MongoDB repository files:
    * UserRepository
    * ManagerRepository
3. Create service files:
    * UserService
    * ManagerService
4. User fields:
    * id
    * email
    * passwordHash
    * role
    * isActive
    * lastLoginAt
    * createdAt
    * updatedAt
5. Manager fields:
    * id
    * userId
    * displayName
    * firstName
    * lastName
    * leagueLevel
    * currentBudgetCents
    * startingBudgetCents
    * isActive
    * createdAt
    * updatedAt
6. New manager default:
    * startingBudgetCents = 4000000000
    * This represents 40,000,000.00
7. Add basic repository methods:
    * findById
    * findByEmail for users
    * create
    * update
8. Add basic service methods:
    * createUserWithManager
    * getUserByEmail
    * getManagerByUserId
9. Do not automatically seed real data.
10. Add clear comments where future auth or password hashing will be added.

⸻

Do NOT

* implement login
* implement sessions
* implement UI
* create football players
* create teams
* create transfers
* create budgets beyond the manager fields
* invent business rules

⸻

Validation

Run:

* lint
* TypeScript check if available
* production build

Definition of Done

The project builds successfully and contains clean User and Manager domain foundations without any login implementation.