export function SetupScreen() {
  return (
    <main className="shell">
      <p className="brand">
        <strong>LendLoop</strong>
        <span>Borrow what you need. Lend what you don’t.</span>
      </p>
      <h1>Connect Clerk and Convex to open the board.</h1>
      <p className="lede">
        The app stays on this setup screen until the publishable Clerk key, the Clerk secret, and the Convex URL are all present. Nothing here is a real credential.
      </p>
      <section className="setup">
        <h2>Local setup</h2>
        <ol>
          <li>
            Copy <code>.env.example</code> to <code>.env.local</code> and fill in keys from your own Clerk and Convex projects.
          </li>
          <li>
            In Clerk, create a JWT template named <code>convex</code> with audience <code>convex</code>, plus <code>email</code> and <code>name</code> claims.
          </li>
          <li>
            Run <code>npx convex dev</code>. Then set <code>CLERK_JWT_ISSUER_DOMAIN</code>, <code>LENDLOOP_WEBHOOK_SECRET</code>, <code>N8N_REQUEST_WEBHOOK_URL</code>, and <code>ADMIN_EMAILS</code> in the Convex dashboard.
          </li>
          <li>
            Start n8n with <code>docker compose up</code> and import the workflows in <code>n8n/workflows</code>.
          </li>
          <li>
            Restart <code>npm run dev</code> after the env file changes.
          </li>
        </ol>
      </section>
    </main>
  );
}
