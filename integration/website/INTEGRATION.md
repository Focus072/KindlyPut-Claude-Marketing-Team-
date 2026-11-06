# AI Team: integration package for kindlyputstudio.com

This package is for the **Kindly Put Agency** project, which owns the website. It moves the AI Team prototype into the existing site at **`/admin/ai-team`**. It reuses the site's studio login (`requireAdmin()`), its `/admin` dashboard, its server-only Supabase connection, and its `calendar_clients` list.

Everything needed is inside this folder. Copy the contents of `files/` into the website repo at the same relative paths, change the single adapter file, and review the migration before applying it.

## 1. Where this comes from

| | |
| --- | --- |
| Source repository | `Focus072/KindlyPut-Claude-Marketing-Team-` |
| Branch | `claude/project-thread-7xvnwk` |
| Prototype commit (standalone app) | `6d686d4d844c4fa4c6b26a535fe409f2d068e993` |
| Package location | `integration/website/` on the same branch. The commit is given in `IMPLEMENTATION_PROMPT.md`. |
| Target repository | `Focus072/Kindlyputstudio.com`, branch `claude/project-thread-rg4eys` |
| Target route | `/admin/ai-team` |

The standalone prototype stays in this repo as reference. **It is paused:** it isn't deployed anywhere, and none of its database changes were applied to Supabase.

## 2. File map

Copy each file from `files/` to the same path in the website repo.

| Package file | Purpose | Copy as-is? |
| --- | --- | --- |
| `src/lib/ai-team/shared.ts` | Team charter: honesty rules, workflow, handoff rules shared by all five | Yes |
| `src/lib/ai-team/specialists.ts` | Complete configs for Maya, Jules, Theo, Nova, Remy: role, style, needs, deliverables, starters, full instructions | Yes |
| `src/lib/ai-team/claude.ts` | Server-side Claude logic: builds context from storage, prompt caching, streaming, model and effort settings | Yes |
| `src/lib/ai-team/store.ts` | All database reads and writes, using the site's Supabase client. Every query is scoped to one client. | Yes |
| `src/lib/ai-team/adapter.ts` | **The only file to adapt.** Connects to `requireAdmin()` and the existing Supabase helper. | **Edit** |
| `src/app/admin/ai-team/**` | Pages: client picker, team directory, specialist page, chat, brand guidelines, handoffs and review. Includes `actions.ts`, `layout.tsx`, `paths.ts`, `ai-team.css`. | Yes, then restyle if wanted |
| `src/app/api/admin/ai-team/chat/route.ts` | Streaming chat endpoint. Saves the sender's message, streams the reply, and saves the reply only after it completes. | Yes |
| `src/components/ai-team/ChatView.tsx` | Client-side chat UI with streaming, shows who sent each message, and a "Save as handoff" slot | Yes |
| `src/components/ai-team/Avatar.tsx` | Initial-letter avatar with an "AI" badge | Yes |
| `supabase/migrations/20261106000000_ai_team.sql` | **Proposed** database change. Review it, then apply it through Kindly Put Agency. | Review |

New npm dependency: `@anthropic-ai/sdk` (built against `1.6.0`). The package also expects `@supabase/supabase-js` and `server-only`, which the site likely already has. `next@16`, React 19.

## 3. Adapting to the website (step by step)

1. **Auth.** In `src/lib/ai-team/adapter.ts`, `requireTeamMember()` calls the site's `requireAdmin()` from `src/lib/auth.ts`. Check what that function returns, then map it to `{ id, displayName }`. `id` must be the `admin_users.id` uuid, because messages are attributed by it. If `requireAdmin()` returns a session rather than the admin row, look up `admin_users` by its id or username there.
2. **Database.** Replace `import { getSupabaseAdmin } from "@/lib/supabase-server"` with the site's real server-only Supabase helper, which must use the service role. Nothing else imports Supabase directly.
3. **Clients.** `store.ts` reads `calendar_clients (id, name, color)` and never writes to it. Conversations, guidelines, campaigns and handoffs all reference `calendar_clients.id`.
4. **Layout.** `src/app/admin/ai-team/layout.tsx` sits inside the existing `/admin` layout and calls `requireAdmin()` again. Add an "AI Team" link to the admin navigation. The styles in `ai-team.css` are scoped under `.ait`, so they don't affect other admin pages. Swap the CSS variables for the site's own design tokens if it has them.
5. **Remove what's not needed.** The standalone app's `/login`, `/setup`, `team.members`, `team.sessions`, setup code and allowed-email list are **not** part of this package. The site's studio login replaces them.
6. **Middleware/proxy.** If the site protects `/admin` with middleware, make sure `/api/admin/ai-team/chat` is covered too, or excluded from any rule that would buffer or rewrite streaming responses. The route checks `requireAdmin()` on its own either way.
7. **Hosting.** The chat route sets `maxDuration = 300` and `runtime = "nodejs"`. On Vercel Hobby, the maximum function duration is lower. Most replies finish well within it.

## 4. Database changes (proposed, not applied)

`supabase/migrations/20261106000000_ai_team.sql` adds five tables to `public` in the `kindly-put-rooms` project. It only adds tables and changes nothing that already exists:

| Table | Holds | Linked to |
| --- | --- | --- |
| `ai_team_conversations` | One chat = one client + one specialist (+ optional campaign) | `calendar_clients`, `admin_users`, `ai_team_campaigns` |
| `ai_team_messages` | Every message, shared by both team members. `author_id` records the sender. | `ai_team_conversations`, `admin_users` |
| `ai_team_handoffs` | Handoffs between stages. Only `status = 'approved'` ones (the approved briefs) reach later specialists, within the same client and campaign. | `calendar_clients`, `ai_team_campaigns`, `ai_team_messages`, `admin_users` |
| `ai_team_brand_guidelines` | Per-client brand rules and approved context. Only `approved` rows go to specialists. | `calendar_clients`, `admin_users` |
| `ai_team_campaigns` | Optional grouping, so handoffs stay with the right campaign | `calendar_clients`, `admin_users` |

These are in `public` (not a separate schema) so the site's existing Supabase client can reach them without changing the API's exposed schemas. Row level security is on with no policies, so browser keys can't access the tables. Only the server, using the service role, can. The foreign-key names are spelled out because `store.ts` uses them in its embedded selects.

## 5. Environment variables for the website

The site's existing Supabase variables stay unchanged. Whatever names the server-only Supabase helper already uses are reused.

| Name | Needed? | Notes |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | **New, required** | From console.anthropic.com. Set it in Vercel for the `kindlyputstudio-com` project, server-side only. Never prefix it with `NEXT_PUBLIC_`. |
| `CLAUDE_MODEL` | Optional | Defaults to `claude-opus-5-5`. `claude-sonnet-5-5` costs about half as much. |
| `CLAUDE_EFFORT` | Optional | Defaults to `medium`. `low` is cheaper and faster. `high` thinks harder. |
| `DATABASE_URL` | **Not needed** | The site's Supabase client replaces the prototype's direct Postgres connection. |
| `TEAM_ALLOWED_EMAILS` | **Not needed** | The site's studio login already limits access to G and Mohhamed. |
| `TEAM_SETUP_CODE` | **Not needed** | There's no separate sign-up. |

## 6. What has been tested, and what hasn't

**Tested in the standalone prototype, with stand-in Claude responses** (a local fake API that streams fixed text; no real model was called), on a local Postgres database:
- Two separate accounts. Messages are attributed to their sender, and either account can reopen a conversation with its full history.
- Streaming replies are saved only after they finish. Earlier turns are sent with each new message, prefixed with the sender's name.
- Approved brand guidelines and approved handoffs reach the next specialist in the same client and campaign. A different client's chat received neither.
- Signed-out visitors are redirected.
- The request sent to the API has the expected shape: model `claude-opus-5-5`, cached team-plus-role instructions, `fallbacks: "default"`.

**Tested for this package:**
- The migration runs on Postgres 16 against stand-in `calendar_clients` and `admin_users` tables, and running it twice is safe.
- All package files type-check and run through `next build` (Next 16.4.5) with stub versions of `requireAdmin()` and the Supabase helper.

**Not tested yet:**
- **A real Claude reply.** No API key has been used. This needs `ANTHROPIC_API_KEY` on the site.
- `store.ts` against a real Supabase API. Its queries were type-checked but not run, because no Supabase API was available locally. The embedded selects that depend on foreign-key names should get one live check after the migration.
- The adapter against the real `requireAdmin()` and Supabase helper, and how the pages look inside the real admin layout.

**Acceptance check after integration:** sign in as G, open `/admin/ai-team`, pick a client, chat with Maya, and confirm a real reply streams in. Then sign in as Mohhamed, reopen the same conversation, and confirm both messages show the right sender. Approve a handoff, start a Jules chat in the same campaign, and confirm Jules refers to Maya's brief. Open a different client and confirm Jules doesn't see it.
