# Public administration

The site owner explicitly chose public admin access. `ADMIN_ACCESS` defaults to `public`: `/admin`, chat history, and admin APIs are accessible without signing in. Saved visitor transcripts and settings are public in this mode. Existing login URLs redirect to the requested admin page.

Set `ADMIN_ACCESS=private` in the deployment environment and redeploy to restore the existing email/password login. The existing admin email, password, and session secret remain configured so private mode can be restored without a code change. Changing this access mode does not delete or migrate saved chats.

Write endpoints retain their existing same-origin checks. Public mode does not make server environment credentials readable.
