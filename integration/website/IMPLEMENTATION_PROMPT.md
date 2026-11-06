# Implementation prompt for the "Kindly Put Agency" project

Copy everything inside the block below into the Kindly Put Agency project.

```text
Add the AI Team to the website at /admin/ai-team, using the integration package that was prepared in another project.

Source (read-only, for copying files):
- Repository: Focus072/KindlyPut-Claude-Marketing-Team-
- Branch: claude/project-thread-7xvnwk
- Commit: 9e4bb86039b374de978ba95b0a6c2b857d4393e0
- Package: integration/website/ (read integration/website/INTEGRATION.md first; it is the spec)
- Files to copy: everything under integration/website/files/, into the website repo at the same relative paths
  (src/lib/ai-team/*, src/app/admin/ai-team/**, src/app/api/admin/ai-team/chat/route.ts,
   src/components/ai-team/*, supabase/migrations/20261106000000_ai_team.sql)

Target:
- Repository: Focus072/Kindlyputstudio.com, working from branch claude/project-thread-rg4eys
- Route: /admin/ai-team, inside the existing protected /admin dashboard

What to do:
1. Copy the package files. Add the dependency @anthropic-ai/sdk (built against 1.6.0). Confirm @supabase/supabase-js and server-only are already present.
2. Edit only src/lib/ai-team/adapter.ts:
   - requireTeamMember() must call the existing requireAdmin() from src/lib/auth.ts and return { id: admin_users.id, displayName }.
   - db() must return the site's existing server-only (service role) Supabase client. Replace the placeholder import "@/lib/supabase-server".
3. Add an "AI Team" link to the admin navigation. Keep the .ait-scoped stylesheet, or map its variables to the site's design tokens.
4. Do not bring over the standalone app's /login, /setup, team.members or team.sessions, or its DATABASE_URL, TEAM_ALLOWED_EMAILS or TEAM_SETUP_CODE. The studio login already covers G and Mohhamed.
5. Review supabase/migrations/20261106000000_ai_team.sql. It is additive only: five public.ai_team_* tables referencing calendar_clients(id) and admin_users(id), with RLS on and no policies. Show G the migration and get approval before applying it to the kindly-put-rooms Supabase project (ref pkpldgylmqqhogfpohzw).
6. Ask G to add ANTHROPIC_API_KEY to the kindlyputstudio-com Vercel project's environment variables (server-side only; never in chat). CLAUDE_MODEL and CLAUDE_EFFORT are optional.
7. Run the site's type check and build. Open a pull request into claude/project-thread-rg4eys. Do not deploy to production without G's go-ahead.

Rules to keep:
- Specialist instructions stay in code (src/lib/ai-team/specialists.ts and shared.ts), separate from conversation history.
- Each conversation stays tied to one calendar_clients row and one specialist. Every query in store.ts filters by client.
- Only approved brand guidelines and approved handoffs reach later specialists, within the same client and campaign.
- Never claim a real Claude reply, generation, edit, save, or publish happened without an actual result.

What is already verified, and what is not:
- Tested in the standalone prototype with a stand-in Claude API (fixed streamed text, no real model): saving, reopening history, sender attribution, handoff context, client isolation.
- Tested for the package: the migration runs (and re-runs) on Postgres 16; all files type-check and build with stubbed auth and Supabase helpers.
- NOT yet tested: a real Claude reply; store.ts against a live Supabase API (including the embedded selects that depend on foreign-key names); the adapter against the real requireAdmin().

Acceptance check (do this on a preview deployment and report the results):
- Sign in as G, open /admin/ai-team, pick a client, message Maya, and confirm a real Claude reply streams in and is saved.
- Sign in as Mohhamed, reopen that conversation, and confirm the full history shows with each message attributed to its sender.
- Save and approve a handoff, start a Jules chat in the same client and campaign, and confirm Jules uses Maya's brief.
- Open a different client and confirm none of the first client's guidelines or handoffs appear.
```
