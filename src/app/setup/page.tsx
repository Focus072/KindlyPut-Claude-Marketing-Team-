import Link from "next/link";
import { redirect } from "next/navigation";
import { allowedEmails, hashPassword, setupCodeMatches } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const MAX_MEMBERS = 10;

async function createAccount(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const code = String(formData.get("code") ?? "");

  if (!setupCodeMatches(code)) redirect("/setup?error=code");
  if (!allowedEmails().includes(email)) redirect("/setup?error=email");
  if (!name) redirect("/setup?error=name");
  if (password.length < 10) redirect("/setup?error=password");

  const [{ n }] = await db()<{ n: number }[]>`select count(*)::int as n from team.members`;
  if (n >= MAX_MEMBERS) redirect("/setup?error=full");
  const existing = await db()`select 1 from team.members where email = ${email}`;
  if (existing.length) redirect("/setup?error=exists");

  await db()`insert into team.members (email, display_name, password_hash) values (${email}, ${name}, ${await hashPassword(password)})`;
  redirect("/login?created=1");
}

const ERRORS: Record<string, string> = {
  code: "That setup code isn't right, or no setup code has been configured on the server.",
  email: "That email isn't on the team list. Ask the workspace owner to add it to TEAM_ALLOWED_EMAILS.",
  name: "Please add your name.",
  password: "Use a password of at least 10 characters.",
  exists: "An account with that email already exists. Sign in instead.",
  full: "This workspace already has the maximum number of accounts.",
};

export default async function SetupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  return (
    <main className="auth">
      <h1>Create your account</h1>
      <p className="muted">
        Each team member gets their own sign-in. You&apos;ll need the setup code saved in the workspace&apos;s server settings,
        and your email must be on the team list.
      </p>
      {sp.error && <p className="error">{ERRORS[sp.error] ?? "Something went wrong."}</p>}
      <form action={createAccount} className="card">
        <div className="field">
          <label htmlFor="name">Your name</label>
          <input id="name" name="name" autoComplete="name" required />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="field">
          <label htmlFor="password">Password (10+ characters)</label>
          <input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required />
        </div>
        <div className="field">
          <label htmlFor="code">Setup code</label>
          <input id="code" name="code" type="password" autoComplete="off" required />
        </div>
        <button type="submit">Create account</button>
      </form>
      <p className="small muted" style={{ marginTop: "1rem" }}>
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    </main>
  );
}
