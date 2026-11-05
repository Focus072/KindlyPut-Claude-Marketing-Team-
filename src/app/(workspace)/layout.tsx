import Link from "next/link";
import { requireMember } from "@/lib/auth";
import { signOut } from "./actions";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const member = await requireMember();
  return (
    <>
      <header className="topbar">
        <Link href="/" className="brand">
          Kindly Put Studio<span>Team workspace</span>
        </Link>
        <div className="spacer" />
        <span className="small">Signed in as {member.display_name}</span>
        <form action={signOut}>
          <button type="submit">Sign out</button>
        </form>
      </header>
      {children}
    </>
  );
}
