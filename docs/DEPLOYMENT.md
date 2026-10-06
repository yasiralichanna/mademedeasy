# Deployment

Run the application on a Node.js server/container (for example a Render web service or a VPS). Build command: `npm ci && npm run build`. Start command: `npm start`. The application listens on the hosting platform's PORT. Use HTTPS.

Set MONGODB_URI, MONGODB_DB, CNIC_KEY and PROOF_STORAGE_DIR as server environment variables. Use MongoDB Atlas or an authenticated replica set. Execute `npm run db:init` from a trusted environment connected to that same database before starting the application. The db:init command reads `.env`; for a deployment shell without that file use `node scripts/init-db.mjs` with the platform environment already set.

Mount a private persistent disk, for example `/var/data/medprep`, and set `PROOF_STORAGE_DIR=/var/data/medprep`. Never serve that directory statically. Proof previews use authenticated ownership-checked API routes. The included filesystem proof store assumes one application instance. For multiple instances use shared private storage or replace the bucket adapter with an authenticated object store. An ephemeral server filesystem will lose receipts on redeployment, so it is unsuitable for this adapter.

Keep CNIC_KEY stable: changing it makes existing encrypted CNIC values unreadable. Back up the MongoDB database, proof volume and encryption key. Never include `.env` in a source repository or archive. Restrict Atlas network access to your server and use a dedicated database user.

Set a fresh ADMIN_SETUP_TOKEN temporarily to create the first admin through Administrator setup, then clear it and restart. The unique partial admin index blocks concurrent first-admin creation. This version supports one administrator account.

TRUST_PROXY=1 is appropriate only when the hosting proxy overwrites X-Forwarded-For and clients cannot bypass it. Otherwise leave it 0; the application then uses a shared conservative authentication limit. Local cookies use HttpOnly/SameSite=Lax. HTTPS cookies use HttpOnly/Secure/SameSite=None/Partitioned to support the embedded review view.

Password reset email requires your own HTTPS delivery service and RESET_DELIVERY_URL/RESET_DELIVERY_TOKEN. The service receives JSON `{email, resetUrl}` with a Bearer token. Until configured, the administrator can issue a single-use reset link after verifying the student privately.

## Existing hosted review version

The existing chatgpt.site review app has the corrected admin workspace but still uses its original SQL database. This ZIP runs native MongoDB on Node.js. It is not a Workers deployment archive and does not migrate live data or replace that site's database automatically. Moving live use to this MongoDB application requires a MongoDB deployment, Node hosting and a deliberate transfer of existing accounts/records/receipts. No live records were deleted or copied into the ZIP.
