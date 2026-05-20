# Business Management Module — Roadmap

Sophisticated business management ecosystem with multi-agent AI, design canvas, social media automation, and analytics.

## Phases & Status

- [x] **Phase 0** — Roadmap + DB schema (all tables created upfront for forward compatibility)
- [ ] **Phase 1** — Business CRUD + Knowledge Base + Dashboard hub
- [ ] **Phase 2** — Multi-Agent System (CEO + spawnable specialists, task tree, tool calls)
- [ ] **Phase 3** — Design Canvas (Fabric.js, templates, AI image generation, export)
- [ ] **Phase 4** — Social Media Integration (Twitter/X, Meta, LinkedIn OAuth + scheduled posting)
- [ ] **Phase 5** — Analytics & Knowledge Loop (engagement tracking, AI learns from outcomes)
- [ ] **Phase 6** — Polish (business switcher, per-business theme, ZIP export, onboarding)

## Tables Created (Phase 0)

| Table | Purpose |
|---|---|
| `businesses` | Master record per business (logo, description, industry) |
| `business_knowledge` | Markdown KB entries (mission, product, audience, notes) |
| `business_metrics` | Time-series revenue/traffic/followers/sales |
| `business_assets` | Designed posters/tshirts/posts (Fabric.js JSON) |
| `agents` | AI agent definitions per business (CEO + specialists) |
| `agent_tasks` | Task tree with status tracking |
| `agent_messages` | Full conversation log per task |
| `social_accounts` | Encrypted OAuth tokens per platform |
| `social_posts` | Scheduled + posted content with engagement data |
| `posting_strategies` | AI-managed posting cadence per platform |

## API Keys Required (User-Provided)

- OpenAI / Ollama (existing) — agent reasoning
- DALL·E 3 (uses OpenAI key) — image generation
- Twitter/X API v2 — Client ID + Secret
- Meta Graph API — App ID + Secret (covers Instagram + Facebook)
- LinkedIn Marketing API — Client ID + Secret
- *(Optional)* TikTok, Threads, Replicate (alt image gen)

## Architecture Notes

- **Storage:** Logos + assets → filesystem (`userData/businesses/{id}/`), DB stores path
- **Tokens:** All social OAuth tokens AES-256 encrypted before DB write
- **Agent isolation:** Each business has its own agent tree (no cross-contamination)
- **Scheduler:** Cron in main process checks `social_posts` every 5 min for due posts
- **Multi-business:** Top-bar switcher; all tables scoped by `business_id`
