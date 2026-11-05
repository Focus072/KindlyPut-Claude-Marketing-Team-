import Link from "next/link";
import { notFound } from "next/navigation";
import { getClientBySlug, listCampaigns, listConversations, listGuidelines, listHandoffs } from "@/lib/data";
import { ALL_SPECIALISTS } from "@/specialists";
import { Avatar, SpecialistBadge } from "@/components/Avatar";
import { newCampaign } from "../../actions";

export default async function ClientHome({ params }: { params: Promise<{ client: string }> }) {
  const { client: slug } = await params;
  const client = await getClientBySlug(slug);
  if (!client) notFound();
  const [campaigns, conversations, guidelines, handoffs] = await Promise.all([
    listCampaigns(client.id), listConversations(client.id), listGuidelines(client.id), listHandoffs(client.id),
  ]);
  const approvedGuides = guidelines.filter((g) => g.status === "approved").length;
  const pending = handoffs.filter((h) => h.status === "draft").length;

  return (
    <main className="page stack">
      <div className="crumbs"><Link href="/">Clients</Link> / {client.name}</div>
      <div className="row between">
        <div>
          <h1>{client.name}</h1>
          {client.description && <p className="muted">{client.description}</p>}
        </div>
        <div className="row">
          <Link className="button secondary" href={`/c/${client.slug}/brand`}>
            Brand guidelines ({approvedGuides} approved)
          </Link>
          <Link className="button secondary" href={`/c/${client.slug}/handoffs`}>
            Handoffs{pending ? ` (${pending} waiting)` : ""}
          </Link>
        </div>
      </div>

      <section>
        <h2>Team directory</h2>
        <div className="pipeline muted" style={{ marginBottom: ".75rem" }}>
          Workflow: {ALL_SPECIALISTS.map((s) => (
            <span key={s.id}>{s.name} <span className="arrow">→</span></span>
          ))} <span>Human review</span>
        </div>
        <div className="grid">
          {ALL_SPECIALISTS.map((s) => {
            const mine = conversations.filter((c) => c.specialist_id === s.id);
            return (
              <Link key={s.id} href={`/c/${client.slug}/team/${s.id}`} className="card link">
                <div className="person">
                  <Avatar s={s} size={44} />
                  <div>
                    <strong>{s.name}</strong> <SpecialistBadge />
                    <div className="small muted">{s.role}</div>
                  </div>
                </div>
                <p className="small" style={{ marginTop: ".6rem" }}>{s.summary}</p>
                <p className="small muted">
                  {mine.length ? `${mine.length} saved conversation${mine.length > 1 ? "s" : ""}` : "No conversations yet"}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="cols">
        <section>
          <h2>Recent conversations</h2>
          {conversations.length === 0 && <p className="muted">None yet. Open a specialist above to start one.</p>}
          <div className="stack">
            {conversations.slice(0, 8).map((c) => {
              const s = ALL_SPECIALISTS.find((x) => x.id === c.specialist_id)!;
              const camp = campaigns.find((x) => x.id === c.campaign_id);
              return (
                <Link key={c.id} href={`/c/${client.slug}/chat/${c.id}`} className="card link person">
                  <Avatar s={s} size={32} />
                  <div style={{ minWidth: 0 }}>
                    <div><strong>{c.title}</strong></div>
                    <div className="small muted">
                      {s.name} · {c.message_count} messages{camp ? ` · ${camp.name}` : ""} · {c.created_by_name ?? "unknown"} ·{" "}
                      {c.updated_at.toLocaleDateString()}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <aside className="stack">
          <section className="card">
            <h2>Campaigns</h2>
            {campaigns.length === 0 && <p className="small muted">No campaigns yet.</p>}
            <ul className="small">
              {campaigns.map((c) => (
                <li key={c.id}><strong>{c.name}</strong>{c.goal && <span className="muted"> · {c.goal}</span>}</li>
              ))}
            </ul>
            <form action={newCampaign}>
              <input type="hidden" name="client" value={client.slug} />
              <div className="field"><input name="name" placeholder="Campaign name" required /></div>
              <div className="field"><input name="goal" placeholder="Goal (optional)" /></div>
              <button type="submit" className="secondary">Add campaign</button>
            </form>
          </section>

          <section className="card small">
            <h2>Coming in later stages</h2>
            <p className="muted">Not connected yet. The specialists will tell you when a tool would help.</p>
            <ul>
              <li><span className="badge planned">Planned</span> Research and analytics data</li>
              <li><span className="badge planned">Planned</span> Image and video generation</li>
              <li><span className="badge planned">Planned</span> Reference uploads and asset library</li>
              <li><span className="badge planned">Planned</span> Editing tools</li>
              <li><span className="badge planned">Planned</span> Publishing (Buffer)</li>
            </ul>
          </section>
        </aside>
      </div>
    </main>
  );
}
