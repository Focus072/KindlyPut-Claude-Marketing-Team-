"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { endSession, requireMember } from "@/lib/auth";
import {
  createCampaign, createClient, createConversation, createHandoff, getCampaign, getClientBySlug,
  getMessageInClient, saveGuideline, setHandoffStatus,
} from "@/lib/data";
import { getSpecialist, PIPELINE, type SpecialistId } from "@/specialists";

async function clientOr404(slug: string) {
  const c = await getClientBySlug(slug);
  if (!c) redirect("/");
  return c;
}
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function signOut() {
  await endSession();
  redirect("/login");
}

export async function newClient(formData: FormData) {
  const m = await requireMember();
  const name = str(formData, "name");
  if (!name) redirect("/?error=name");
  const c = await createClient(name, str(formData, "description"), m.id);
  redirect(`/c/${c.slug}`);
}

export async function newCampaign(formData: FormData) {
  const m = await requireMember();
  const c = await clientOr404(str(formData, "client"));
  const name = str(formData, "name");
  if (name) await createCampaign(c.id, m.id, name, str(formData, "goal"));
  revalidatePath(`/c/${c.slug}`);
}

export async function upsertGuideline(formData: FormData) {
  const m = await requireMember();
  const c = await clientOr404(str(formData, "client"));
  const status = ["draft", "approved", "archived"].includes(str(formData, "status")) ? str(formData, "status") : "draft";
  const title = str(formData, "title");
  const body = str(formData, "body");
  if (title && body) await saveGuideline(c.id, m.id, { id: str(formData, "id") || undefined, title, body, status });
  revalidatePath(`/c/${c.slug}/brand`);
  redirect(`/c/${c.slug}/brand`);
}

export async function startConversation(formData: FormData) {
  const m = await requireMember();
  const c = await clientOr404(str(formData, "client"));
  const s = getSpecialist(str(formData, "specialist"));
  if (!s) redirect(`/c/${c.slug}`);
  const campaignId = str(formData, "campaign");
  const campaign = campaignId ? await getCampaign(c.id, campaignId) : null;
  const id = await createConversation(c.id, s.id, m.id, campaign?.id ?? null);
  redirect(`/c/${c.slug}/chat/${id}`);
}

export async function saveHandoff(formData: FormData) {
  const m = await requireMember();
  const c = await clientOr404(str(formData, "client"));
  const msg = await getMessageInClient(c.id, str(formData, "message"));
  if (!msg || msg.role !== "assistant") redirect(`/c/${c.slug}`);
  const to = str(formData, "to");
  const validTo = to === "review" || (PIPELINE as readonly string[]).includes(to);
  if (!validTo) redirect(`/c/${c.slug}/chat/${msg.conversation_id}`);
  await createHandoff({
    clientId: c.id,
    campaignId: msg.campaign_id,
    from: msg.specialist_id,
    to: to as SpecialistId | "review",
    title: str(formData, "title") || "Handoff",
    content: str(formData, "content") || msg.content,
    sourceMessageId: msg.id,
    memberId: m.id,
  });
  redirect(`/c/${c.slug}/handoffs?saved=1`);
}

export async function reviewHandoff(formData: FormData) {
  const m = await requireMember();
  const c = await clientOr404(str(formData, "client"));
  const status = str(formData, "status");
  if (["approved", "changes_requested", "draft", "archived"].includes(status)) {
    await setHandoffStatus(c.id, str(formData, "id"), status, m.id);
  }
  revalidatePath(`/c/${c.slug}/handoffs`);
}
