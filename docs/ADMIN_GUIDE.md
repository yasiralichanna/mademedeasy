# Administrator guide

Log in to open Admin dashboard. Overview shows student counts, pending payments, active subscriptions and published questions. Management tabs provide:

- Payments: preview private receipts, approve or reject with a reason. Approval activates package access atomically.
- Access: adjust start/expiry, suspend and reactivate.
- Students: inspect enrollment and issue a private, expiring password-reset link. Viewing full CNIC is audited.
- Questions: create/edit BCQs, preview CSV/JSON imports and import as drafts. Review before publishing. Archive retired content.
- Categories: configure MBBS year, subject, module and topic paths.
- Packages: set price, duration and academic scope. Payment submissions preserve their original package terms.
- Payment accounts: configure only your actual JazzCash, Easypaisa and NayaPay instructions. Unconfigured methods stay unavailable.
- Branding and Audit history: update application labels/support link and review administrative decisions.

Administrators do not complete student enrollment or submit their own payment. Use a separate student account for student testing. Log out is visible in the header.

Use **Remove student** in the student table or details dialog. Confirm the selected name/email. Removal permanently deletes the student account, enrollment, payments/receipts, access, bookmarks, notifications and study history, and invalidates all sessions and reset links. Administrator accounts cannot be removed through this control. An audit event retains the student name/account ID, actor name/role, action and timestamp, including after the account is removed. If private storage is unavailable, cleanup jobs are saved durably and the **Retry receipt cleanup** button retries them.
