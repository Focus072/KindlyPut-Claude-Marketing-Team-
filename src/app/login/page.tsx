import Link from "next/link";
import { redirect } from "next/navigation";
import { currentMember, startSession, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

async function signIn(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const rows = await db()<{ id: string; password_hash: string }[]>`
    select id, password_hash from team.members where email = ${email}`;
  const ok = rows[0] && (await verifyPassword(password, rows[0].password_hash));
  if (!ok) redirect("/login?error=1");
  await startSession(rows[0].id);
  redirect("/");
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; created?: string }> }) {
  if (await currentMember()) redirect("/");
  const sp = await searchParams;
  return (
    <main className="auth">
      <h1>Kindly Put Studio</h1>
      <p className="muted">Private team workspace. Sign in with your own account.</p>
      {sp.error && <p className="error">That email and password don&apos;t match an account.</p>}
      {sp.created && <p className="notice">Account created. Sign in to continue.</p>}
      <form action={signIn} className="card">
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        <button type="submit">Sign in</button>
      </form>
      <p className="small muted" style={{ marginTop: "1rem" }}>
        First time here? <Link href="/setup">Create your account</Link> with the setup code from your studio settings.
      </p>
    </main>
  );
}
