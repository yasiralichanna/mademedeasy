# MedPrep BCQs — MongoDB setup

Complete modular Next.js application with native MongoDB persistence. Administrators open **Admin dashboard** and see platform counts, payment review, students, access, question bank, categories, packages, payment accounts, branding and audit history. Student enrollment, payment submission and preparation screens appear only in student accounts. Both roles have a visible Log out button. Student profiles include password-confirmed Delete account, and administrators can Remove student from student management.

Read [the complete setup and running guide](docs/FULL_SETUP_GUIDE.md) for Windows-friendly instructions, Atlas/Docker database setup, administrator creation, workflow checks, production commands and troubleshooting.

## Requirements

- Node.js 22.13 or later, npm, and internet access for the initial dependency installation.
- MongoDB Atlas, or MongoDB 7+ configured as a replica set. Transactions are required for payment approval, access activation and password resets. A standalone mongod is insufficient.
- Optional Docker Desktop for the included local database setup.

## Quick start (Windows, macOS or Linux)

1. Extract this folder and open a terminal inside it.
2. Run `npm ci`.
3. Run `npm run setup:env`. This creates `.env` with fresh encryption and administrator setup secrets. It preserves an existing `.env`.
4. Choose a database:
   - Local Docker: run `docker compose up -d`, then `docker compose logs mongo-init`. The `.env` default connects to this local replica set.
   - Atlas: create a database user and allow your machine's IP, then put your Atlas `mongodb+srv://...` connection string in `.env` as `MONGODB_URI`. Use a database user permitted to create collections, indexes and validators. Keep this file private.
5. Run `npm run db:init`. Wait for the collections/indexes-ready message. If the Docker replica set is still initializing, wait a few seconds and run it again.
6. Run `npm run dev`, then open http://localhost:3000.
7. On the login screen choose **Administrator setup**. Enter your account details and the `ADMIN_SETUP_TOKEN` value from your own `.env`. This creates the first admin only. After setup, clear `ADMIN_SETUP_TOKEN` and restart the app.
8. Log in as administrator. Configure packages and JazzCash, Easypaisa or NayaPay accounts. Import your reviewed questions as drafts, review them, then publish.
9. Register a separate student account to test enrollment and payment approval.

## Production build

```sh
npm run typecheck
npm run build
npm start
```

Set the same environment variables in your hosting platform. For deployment and private file storage see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Verification

`npm test` starts a temporary real MongoDB replica set and checks roles, encrypted enrollment, private proofs, rejection/resubmission, concurrent approvals, question imports, practice/exam deadlines, results, expiry/suspension and password reset token reuse. It uses a separate test database and never your configured production database. The first test run downloads a MongoDB binary; this needs internet access and a supported operating system. The build and these integration tests passed before this ZIP was produced.

See [docs/ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md), [docs/STUDENT_GUIDE.md](docs/STUDENT_GUIDE.md) and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
