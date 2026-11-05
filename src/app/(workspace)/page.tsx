import Link from "next/link";
import { listClients } from "@/lib/data";
import { claudeConfigured } from "@/lib/claude";
import { ALL_SPECIALISTS } from "@/specialists";
import { Avatar, SpecialistBadge } from "@/components/Avatar";
import { newClient } from "./actions";

export default async function Home() {
  const clients = await listClients();
  return (
    <main className="page stack">
      {!claudeConfigured() && (
        <p className="notice">
          Claude isn&apos;t connected yet. Add <code>ANTHROPIC_API_KEY</code> in the server settings (see SETUP.md) and the
          specialists will start replying.
        </p>
      )}

      <section>
        <h1>Client workspaces</h1>
        <p className="muted">
          Each client has its own brand guidelines, campaigns, chats, and handoffs. Nothing is shared between clients.
        </p>
        <div className="grid">
          {clients.map((c) => (
            <Link key={c.id} href={`/c/${c.slug}`} className="card link">
              <h3>{c.name}</h3>
              <p className="small muted">{c.description || "No description yet."}</p>
            </Link>
          ))}
          <form action={newClient} className="card">
            <h3>Add a client</h3>
            <div className="field">
              <label htmlFor="name">Name</label>
              <input id="name" name="name" placeholder="e.g. Kindly Put Studio (in-house)" required />
            </div>
            <div className="field">
              <label htmlFor="description">Short description</label>
              <textarea id="description" name="description" rows={2} placeholder="What they do, who they serve" />
            </div>
            <button type="submit">Create workspace</button>
          </form>
        </div>
      </section>

      <section>
        <h2>Your AI team</h2>
        <p className="muted">Open a client workspace to chat with a specialist inside that client&apos;s context.</p>
        <div className="grid">
          {ALL_SPECIALISTS.map((s) => (
            <div key={s.id} className="card">
              <div className="person">
                <Avatar s={s} />
                <div>
                  <strong>{s.name}</strong> <SpecialistBadge />
                  <div className="small muted">{s.role}</div>
                </div>
              </div>
              <p className="small" style={{ marginTop: ".6rem" }}>{s.summary}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
