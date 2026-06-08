# gojo-mock-api

Mock multi-service REST API used as the live target for Gojo voice agent demos.

## Stack
- Node.js + Express + TypeScript
- Postgres (pg)
- JWT authentication

## Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /users | — | List all users |
| GET | /users/:id | — | Get user by ID |
| POST | /users | — | Create user |
| DELETE | /users/:id | — | Delete user |
| GET | /posts | JWT | List posts |
| POST | /posts | JWT | Create post |
| PUT | /posts/:id | JWT | Update post |

## Quick Start
```bash
npm install
DATABASE_URL=postgresql://localhost:5432/gojo_mock npm run dev
```

## Gojo Voice Commands that target this repo
- "Show me all users" → SQL SELECT
- "Add an index on posts.user_id" → InsForge Postgres
- "Add rate limiting middleware" → spawn Replicas agent
- "Create a PR with the auth changes" → Replicas opens PR

---

*by Dhruva with love*
