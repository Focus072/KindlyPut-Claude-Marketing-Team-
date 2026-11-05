import "server-only";
import { db } from "./db";
import type { SpecialistId } from "@/specialists";

export interface Client { id: string; slug: string; name: string; description: string; created_at: Date }
export interface Guideline { id: string; client_id: string; title: string; body: string; status: string; updated_at: Date; updated_by_name: string | null }
export interface Campaign { id: string; client_id: string; name: string; goal: string; status: string; created_at: Date }
export interface Conversation {
  id: string; client_id: string; campaign_id: string | null; specialist_id: SpecialistId;
  title: string; created_at: Date; updated_at: Date; created_by_name: string | null; message_count: number;
}
export interface Message {
  id: string; conversation_id: string; role: "user" | "assistant"; content: string;
  author_name: string | null; model: string | null; created_at: Date;
}
export interface Handoff {
  id: string; client_id: string; campaign_id: string | null; campaign_name: string | null;
  from_specialist: SpecialistId; to_stage: SpecialistId | "review"; title: string; content: string;
  status: string; created_at: Date; approved_at: Date | null;
  created_by_name: string | null; approved_by_name: string | null; source_conversation_id: string | null;
}

export function slugify(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "client";
}

// ---------- clients ----------
export async function listClients() {
  return db()<Client[]>`select id, slug, name, description, created_at from team.clients order by name`;
}
export async function getClientBySlug(slug: string) {
  const r = await db()<Client[]>`select id, slug, name, description, created_at from team.clients where slug = ${slug}`;
  return r[0] ?? null;
}
export async function createClient(name: string, description: string, memberId: string) {
  let slug = slugify(name);
  const taken = await db()`select 1 from team.clients where slug = ${slug}`;
  if (taken.length) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  const r = await db()<Client[]>`
    insert into team.clients (slug, name, description, created_by) values (${slug}, ${name}, ${description}, ${memberId})
    returning id, slug, name, description, created_at`;
  return r[0];
}

// ---------- brand guidelines ----------
export async function listGuidelines(clientId: string) {
  return db()<Guideline[]>`
    select g.id, g.client_id, g.title, g.body, g.status, g.updated_at, m.display_name as updated_by_name
    from team.brand_guidelines g left join team.members m on m.id = g.updated_by
    where g.client_id = ${clientId} and g.status <> 'archived'
    order by g.status = 'approved' desc, g.updated_at desc`;
}
export async function saveGuideline(clientId: string, memberId: string, input: { id?: string; title: string; body: string; status: string }) {
  if (input.id) {
    await db()`
      update team.brand_guidelines set title = ${input.title}, body = ${input.body}, status = ${input.status},
        updated_by = ${memberId}, updated_at = now()
      where id = ${input.id} and client_id = ${clientId}`;
  } else {
    await db()`
      insert into team.brand_guidelines (client_id, title, body, status, updated_by)
      values (${clientId}, ${input.title}, ${input.body}, ${input.status}, ${memberId})`;
  }
}

// ---------- campaigns ----------
export async function listCampaigns(clientId: string) {
  return db()<Campaign[]>`
    select id, client_id, name, goal, status, created_at from team.campaigns
    where client_id = ${clientId} and status <> 'archived' order by created_at desc`;
}
export async function createCampaign(clientId: string, memberId: string, name: string, goal: string) {
  await db()`insert into team.campaigns (client_id, name, goal, created_by) values (${clientId}, ${name}, ${goal}, ${memberId})`;
}
export async function getCampaign(clientId: string, id: string) {
  const r = await db()<Campaign[]>`select id, client_id, name, goal, status, created_at from team.campaigns where id = ${id} and client_id = ${clientId}`;
  return r[0] ?? null;
}

// ---------- conversations ----------
export async function listConversations(clientId: string, specialistId?: SpecialistId) {
  return db()<Conversation[]>`
    select c.id, c.client_id, c.campaign_id, c.specialist_id, c.title, c.created_at, c.updated_at,
      m.display_name as created_by_name,
      (select count(*)::int from team.messages x where x.conversation_id = c.id) as message_count
    from team.conversations c left join team.members m on m.id = c.created_by
    where c.client_id = ${clientId} ${specialistId ? db()`and c.specialist_id = ${specialistId}` : db()``}
    order by c.updated_at desc limit 100`;
}
export async function getConversation(clientId: string, id: string) {
  const r = await db()<Conversation[]>`
    select c.id, c.client_id, c.campaign_id, c.specialist_id, c.title, c.created_at, c.updated_at,
      m.display_name as created_by_name, 0 as message_count
    from team.conversations c left join team.members m on m.id = c.created_by
    where c.id = ${id} and c.client_id = ${clientId}`;
  return r[0] ?? null;
}
export async function createConversation(clientId: string, specialistId: SpecialistId, memberId: string, campaignId: string | null) {
  const r = await db()<{ id: string }[]>`
    insert into team.conversations (client_id, specialist_id, created_by, campaign_id)
    values (${clientId}, ${specialistId}, ${memberId}, ${campaignId}) returning id`;
  return r[0].id;
}
export async function listMessages(conversationId: string) {
  return db()<Message[]>`
    select x.id, x.conversation_id, x.role, x.content, m.display_name as author_name, x.model, x.created_at
    from team.messages x left join team.members m on m.id = x.author_id
    where x.conversation_id = ${conversationId} order by x.created_at, x.id`;
}
export async function addMessage(input: {
  conversationId: string; role: "user" | "assistant"; content: string; authorId?: string | null;
  model?: string | null; inputTokens?: number | null; outputTokens?: number | null; stopReason?: string | null;
}) {
  const r = await db()<{ id: string }[]>`
    insert into team.messages (conversation_id, role, content, author_id, model, input_tokens, output_tokens, stop_reason)
    values (${input.conversationId}, ${input.role}, ${input.content}, ${input.authorId ?? null}, ${input.model ?? null},
      ${input.inputTokens ?? null}, ${input.outputTokens ?? null}, ${input.stopReason ?? null})
    returning id`;
  await db()`update team.conversations set updated_at = now() where id = ${input.conversationId}`;
  return r[0].id;
}
export async function setConversationTitleIfDefault(id: string, title: string) {
  await db()`update team.conversations set title = ${title} where id = ${id} and title = 'New conversation'`;
}

// ---------- handoffs ----------
const handoffSelect = (clientId: string) => db()`
  select h.id, h.client_id, h.campaign_id, c.name as campaign_name, h.from_specialist, h.to_stage, h.title, h.content,
    h.status, h.created_at, h.approved_at, cm.display_name as created_by_name, am.display_name as approved_by_name,
    msg.conversation_id as source_conversation_id
  from team.handoffs h
  left join team.campaigns c on c.id = h.campaign_id
  left join team.members cm on cm.id = h.created_by
  left join team.members am on am.id = h.approved_by
  left join team.messages msg on msg.id = h.source_message_id
  where h.client_id = ${clientId}`;

export async function listHandoffs(clientId: string) {
  return db()<Handoff[]>`${handoffSelect(clientId)} and h.status <> 'archived' order by h.created_at desc`;
}

/**
 * Approved handoffs a specialist should see: those addressed to them, plus
 * every approved handoff from an earlier stage of the same campaign
 * (or with no campaign, when the conversation has none).
 */
export async function approvedHandoffsFor(clientId: string, campaignId: string | null) {
  return db()<Handoff[]>`${handoffSelect(clientId)}
    and h.status = 'approved'
    and ${campaignId ? db()`h.campaign_id = ${campaignId}` : db()`h.campaign_id is null`}
    order by h.approved_at`;
}

export async function createHandoff(input: {
  clientId: string; campaignId: string | null; from: SpecialistId; to: SpecialistId | "review";
  title: string; content: string; sourceMessageId: string | null; memberId: string;
}) {
  await db()`
    insert into team.handoffs (client_id, campaign_id, from_specialist, to_stage, title, content, source_message_id, created_by)
    values (${input.clientId}, ${input.campaignId}, ${input.from}, ${input.to}, ${input.title}, ${input.content},
      ${input.sourceMessageId}, ${input.memberId})`;
}

export async function setHandoffStatus(clientId: string, id: string, status: string, memberId: string) {
  if (status === "approved") {
    await db()`update team.handoffs set status = 'approved', approved_by = ${memberId}, approved_at = now()
      where id = ${id} and client_id = ${clientId}`;
  } else {
    await db()`update team.handoffs set status = ${status}, approved_by = null, approved_at = null
      where id = ${id} and client_id = ${clientId}`;
  }
}

export async function getMessageInClient(clientId: string, messageId: string) {
  const r = await db()<(Message & { specialist_id: SpecialistId; campaign_id: string | null })[]>`
    select x.id, x.conversation_id, x.role, x.content, null as author_name, x.model, x.created_at,
      c.specialist_id, c.campaign_id
    from team.messages x join team.conversations c on c.id = x.conversation_id
    where x.id = ${messageId} and c.client_id = ${clientId}`;
  return r[0] ?? null;
}
