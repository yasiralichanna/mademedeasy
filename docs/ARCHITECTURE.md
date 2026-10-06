# Architecture

React and Next.js App Router provide the interface and same-origin Node.js APIs. The official MongoDB driver provides native find, update, insert, aggregate, indexes and transactions; there is no SQL database or SQL query interpreter in this setup. Backend modules remain independent under modules/. Frontend features remain under features/.

Modules: authentication, profiles/enrollment, packages/payment accounts, payment submissions/review, access/subscriptions, question bank/categories/imports, attempts/practice/exams, analytics, notifications and administration/audit.

The MongoDB collections are users, sessions, resets, limits, profiles, packages, settings, payments, subscriptions, categories, questions, attempts, bookmarks, notifications and audit. scripts/schema.mjs defines their unique/compound/partial indexes and core database validators. scripts/init-db.mjs applies them idempotently; no SQL migrations are needed. IDs remain strings, money is stored in PKR paisa and timestamps are milliseconds since epoch. Structured fields retain the JSON serialization used by the existing frontend contract. MongoDB indexes enforce one pending payment per user, one subscription per payment, unique email, unique bookmark and first-admin setup exclusivity.

Payment review uses a MongoDB transaction to update the pending decision, activate access through the access service, append an audit record and send a notification. Retry callbacks read the latest decision inside the transaction, preventing duplicate activation or decision notifications. Password reset claims a single-use token and updates the password/removes sessions in one transaction. Attempt answers and finalization use conditional updates to protect deadlines, finalized attempts and concurrent changes.

Every academic route checks the shared access guard and content scope. Session tokens are hashed at rest; passwords use salted PBKDF2; CNIC uses AES-GCM with an external encryption key. Enrollment APIs mask CNIC. Administrators can reveal it through an audited endpoint. Student records and proofs enforce ownership on the server. Proofs remain in a private persistent directory and are never included in public/.

Role separation: Workspace starts administrators on Admin dashboard, loads branding without student analytics, skips profile/enrollment requests and exposes only management navigation. Students retain enrollment and preparation. A keyed workspace resets state when the logged-in account changes.

Account removal is a shared accounts service used by profile self-deletion and administrator removal. Self-deletion verifies the password; admin removal verifies the target is a student and confirms the exact email. MongoDB transactions remove dependent records, invalidate sessions and append an audit event. Private proof cleanup uses a durable settings outbox so a storage failure does not lose the retry work.
