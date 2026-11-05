import "server-only";
import crypto from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";

const scrypt = promisify(crypto.scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
const COOKIE = "kp_team_session";
const SESSION_DAYS = 30;

export interface Member {
  id: string;
  email: string;
  display_name: string;
}

export async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return ["scrypt", salt.toString("base64"), key.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, saltB64, keyB64] = stored.split("$");
  if (scheme !== "scrypt" || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, "base64");
  const actual = await scrypt(password, Buffer.from(saltB64, "base64"), expected.length);
  return crypto.timingSafeEqual(expected, actual);
}

const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

export async function startSession(memberId: string) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5);
  await db()`insert into team.sessions (token_hash, member_id, expires_at) values (${sha256(token)}, ${memberId}, ${expires})`;
  await db()`update team.members set last_login_at = now() where id = ${memberId}`;
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db()`delete from team.sessions where token_hash = ${sha256(token)}`;
  jar.delete(COOKIE);
}

export async function currentMember(): Promise<Member | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const rows = await db()<Member[]>`
    select m.id, m.email, m.display_name
    from team.sessions s join team.members m on m.id = s.member_id
    where s.token_hash = ${sha256(token)} and s.expires_at > now()`;
  return rows[0] ?? null;
}

export async function requireMember(): Promise<Member> {
  const m = await currentMember();
  if (!m) redirect("/login");
  return m;
}

/** Emails allowed to create an account, from TEAM_ALLOWED_EMAILS. */
export function allowedEmails(): string[] {
  return (process.env.TEAM_ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function setupCodeMatches(code: string) {
  const expected = process.env.TEAM_SETUP_CODE ?? "";
  if (expected.length < 12) return false;
  return crypto.timingSafeEqual(Buffer.from(sha256(code)), Buffer.from(sha256(expected)));
}
