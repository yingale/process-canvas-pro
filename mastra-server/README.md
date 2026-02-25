# Mastra Multi-Agent Workflow Server

Multi-agent orchestration system for workflow editing, powered by OpenAI and Mastra patterns.

## Agents

| Agent | Role |
|-------|------|
| **Orchestrator** | Routes requests to the right agents based on intent |
| **Analyst** | Inspects workflows for bottlenecks, missing steps, improvements |
| **Builder** | Generates JSON Patch operations to modify workflows |
| **Reviewer** | Validates patches for correctness and best practices |

## Setup

```bash
cp .env.example .env
# Add your OPENAI_API_KEY and MASTRA_API_SECRET
npm install
npm run dev
```

## Deploy to Railway

1. Push this directory to a GitHub repo
2. Connect to Railway → New Project → Deploy from GitHub
3. Set environment variables in Railway dashboard:
   - `OPENAI_API_KEY` — your OpenAI API key
   - `MASTRA_API_SECRET` — a random secret string (same value goes into your Lovable project as `MASTRA_API_SECRET`)
4. Railway auto-detects the Dockerfile and deploys
5. Copy the Railway URL (e.g. `https://your-app.up.railway.app`) and add it as `MASTRA_SERVER_URL` secret in your Lovable project

## API

### POST /api/orchestrate

```json
{
  "prompt": "Add an approval step after data collection",
  "caseIr": { ... },
  "mode": "auto" // optional: "auto" | "build" | "analyze" | "full"
}
```

Response:
```json
{
  "patch": [...],
  "summary": "Added an approval step...",
  "analysis": { ... },
  "review": { ... },
  "agentsUsed": ["orchestrator", "analyst", "builder", "reviewer"]
}
```

### GET /health
Returns `{ "status": "ok" }`
