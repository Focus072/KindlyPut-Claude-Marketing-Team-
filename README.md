# Kindly Put Studio · AI content team workspace

> **Status: paused prototype.** The AI Team is moving into the main website at `/admin/ai-team`, using the site's studio login and database. This standalone app is kept for reference. It isn't deployed, and its database changes were never applied. The integration package is in [`integration/website/`](integration/website/INTEGRATION.md).

A private workspace where the Kindly Put Studio team works with five AI specialists:

| Specialist | Role |
| --- | --- |
| **Maya** | Content Strategist: audience research, content ideas, campaign strategy, calendars, and briefs |
| **Jules** | Creative Director: creative concepts, visual direction, moodboards, and storyboards |
| **Theo** | Copywriter: hooks, captions, scripts, carousel copy, and calls to action |
| **Nova** | AI Director: image and video prompts, generation tools, and asset organization |
| **Remy** | Editor: content assembly, editing guidance, quality checks, and final deliverables |

Workflow: Strategy → Creative direction → Copywriting → Asset generation → Editing → Human review.

See **[SETUP.md](SETUP.md)** for setup, settings, costs, and what's working versus planned.

## Layout

- `src/specialists/`: each specialist's saved instructions, plus the team-wide rules. Kept apart from chat history.
- `src/lib/claude.ts`: builds each specialist's context from storage (approved brand guidelines, campaign, approved handoffs) and calls Claude.
- `src/lib/data.ts`: database queries. Every query is scoped to one client.
- `src/app/`: pages (sign-in, setup, client workspaces, team directory, chats, brand guidelines, handoffs) and the `/api/chat` streaming endpoint.
- `db/migrations/`: SQL for the `team` schema. Run it with `npm run db:migrate`.

## Development

```bash
npm install
cp .env.example .env.local   # fill in the values
npm run db:migrate
npm run dev
```
