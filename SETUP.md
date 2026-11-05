# Setting up the Kindly Put Studio team workspace

This is a private web app for the Kindly Put Studio team. You and your teammate each sign in with your own account and chat with five AI specialists: Maya, Jules, Theo, Nova, and Remy. Every conversation is saved, each client's information is kept separate, and work moves between specialists only through handoffs that a person approves.

## How it fits with kindlyputstudio.com

The public website is a separate app and stays exactly as it is. This workspace is its own Vercel project, planned for a subdomain such as `team.kindlyputstudio.com`. You can link to it from the site's existing "Studio" login if you like, but nothing on the public site has to change.

## What each piece does (plain language)

| Piece | What it's for | Where it lives |
| --- | --- | --- |
| This app (Next.js) | The pages you use: sign in, team directory, chats, brand guidelines, handoffs | Vercel |
| Database (Postgres on Supabase) | Saves accounts, conversations, brand guidelines, campaigns, and handoffs | Supabase, in a separate `team` area |
| Claude API | Writes the specialists' replies | Anthropic, called from the server only |
| Specialist instructions | Each specialist's role, style, and rules | `src/specialists/`, in code, never mixed with chat history |

## Settings to add (never paste these into chat)

Add these in **Vercel → your workspace project → Settings → Environment Variables**. For local development, copy `.env.example` to `.env.local`.

| Name | What to put there | Where to get it |
| --- | --- | --- |
| `DATABASE_URL` | Postgres connection string | Supabase → your project → **Connect** → *Transaction pooler* (port 6543). Replace `[YOUR-PASSWORD]` with the database password. |
| `ANTHROPIC_API_KEY` | Claude API key | [console.anthropic.com](https://console.anthropic.com) → **API keys** → *Create key*. Add a payment method and, ideally, a monthly spend limit under **Billing**. |
| `TEAM_ALLOWED_EMAILS` | The two emails allowed to create accounts, comma separated | Your choice |
| `TEAM_SETUP_CODE` | A long random code (12+ characters) | Make one up, or generate one in a password manager. Share it with your teammate privately, not by email or chat. |
| `CLAUDE_MODEL` *(optional)* | Defaults to `claude-opus-5-5` | Set `claude-sonnet-5-5` to roughly halve the cost |
| `CLAUDE_EFFORT` *(optional)* | Defaults to `medium` | `low` is faster and cheaper; `high` thinks harder |

## First run

1. Create the database tables once: `DATABASE_URL=... npm run db:migrate`. This only adds tables in the `team` area; it doesn't change any existing tables.
2. Deploy to Vercel (import this repo as a new project, framework *Next.js*).
3. Open `/setup`, enter your name, email, a password, and the setup code. Your teammate does the same with their email.
4. Sign in, add your first client (for example "Kindly Put Studio" for in-house work), approve some brand guidelines, and start chatting.

## Costs

| Service | Cost | Notes |
| --- | --- | --- |
| Claude API | Pay per use: $4 per million input tokens and $20 per million output tokens on Claude Opus 5.5 | A typical reply costs a few cents. The specialists' instructions are cached, which cuts repeat costs. Set a monthly limit in the Anthropic console. |
| Supabase | $0 extra if the workspace uses your existing `kindly-put-rooms` database; about $10/month if you give it its own project | You're on the Supabase Pro plan |
| Vercel | Depends on your Vercel plan. A second project is free on Hobby, but Hobby is for non-commercial use; Pro is $20 per team member per month | Check which plan your team is on |
| Domain | $0 | A subdomain is just a DNS record on the domain you already own |

## What works now, and what's planned

**Working in this version**
- Separate accounts with sign-in, sessions, and sign-out
- Team directory and an individual chat with each specialist
- Real Claude replies, streamed as they're written (once `ANTHROPIC_API_KEY` is set)
- Saved conversations that either team member can reopen, with who-said-what
- Client workspaces with their own campaigns, brand guidelines, chats, and handoffs
- Explicit handoffs: save from a reply, then approve, request changes, or archive. Only approved handoffs reach later specialists, and only within the same client and campaign.

**Planned for later stages (not built yet)**
- Research: Claude's web search tool (about $10 per 1,000 searches plus normal token costs)
- Analytics: Instagram and Facebook via Meta's Graph API, Google Analytics, and TikTok, all free APIs that need account connections
- Reference uploads and an asset library, using Supabase Storage (included in Pro)
- Image and video generation, through a provider you choose (all are paid per image or per second of video)
- Editing tools for automated assembly (for example Shotstack or Creatomate, both paid)
- Publishing through the Buffer channels already connected to your site's database
- A full review queue before publishing

Until those connections exist, the specialists are instructed to say so, to give a plan or prompt instead, and never to claim something was generated, edited, saved, or published.
