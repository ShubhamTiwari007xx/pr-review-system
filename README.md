# NEXUS

NEXUS is an AI-assisted GitHub pull request reviewer. It receives pull request webhooks, queues review work, analyzes the diff with a local Ollama model, stores the result in PostgreSQL, and posts a summary with actionable findings back to the pull request.

## How it works

1. GitHub sends a `pull_request` webhook to the NEXUS server.
2. The server verifies the webhook signature and accepts `opened`, `synchronize`, and `reopened` actions.
3. NEXUS saves a review record in PostgreSQL and enqueues the job in Redis using BullMQ.
4. A separate worker fetches the pull request diff and asks Ollama to review it.
5. The result is saved and posted as a comment on the pull request.

## Requirements

- Node.js (a current LTS release recommended) and npm
- PostgreSQL
- Redis, available at `127.0.0.1:6379`
- [Ollama](https://ollama.com/) with the `qwen2.5-coder:1.5b` model
- A GitHub repository webhook and GitHub API credentials authorized to create pull request comments

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure the environment

Create a `.env` file in the project root:

```dotenv
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/nexus?schema=public"
GITHUB_WEBHOOK_SECRET="replace-with-a-long-random-secret"
```

`DATABASE_URL` is used by Prisma to connect to PostgreSQL. `GITHUB_WEBHOOK_SECRET` must match the secret configured for the GitHub webhook.

The Redis URL (`redis://127.0.0.1:6379`) and Ollama endpoint/model (`http://localhost:11434`, `qwen2.5-coder:1.5b`) are currently configured in the source code. GitHub API authentication must use credentials with permission to write pull request comments. Keep all credentials private and out of source control.

### 3. Prepare PostgreSQL

Create the `nexus` database, then apply the Prisma schema:

```bash
npx prisma migrate dev --name init
```

### 4. Start Redis and Ollama

Ensure Redis is running on port `6379`, then download the model:

```bash
ollama pull qwen2.5-coder:1.5b
```

Ensure the Ollama service is running and reachable at `http://localhost:11434`.

### 5. Start NEXUS

Run the webhook server:

```bash
npm run dev
```

Run the review worker in a separate terminal:

```bash
npx tsx worker.ts
```

The server listens on port `3000`; its webhook endpoint is `POST /webhook`.

## Configure the GitHub webhook

In the repository's **Settings → Webhooks**, add a webhook pointing to the publicly reachable URL for your NEXUS server, ending in `/webhook`.

- **Content type:** `application/json`
- **Secret:** the same value as `GITHUB_WEBHOOK_SECRET`
- **Events:** select **Let me select individual events** and enable **Pull requests**
- **Permissions:** the GitHub API credentials used by NEXUS need permission to create issue comments on pull requests

For local development, expose port `3000` through a secure tunneling service and use its HTTPS URL as the webhook target. Do not expose a development server without considering the security implications.

## Review output

Each posted review includes an AI-generated summary and findings grouped by severity (`high`, `medium`, or `low`). Findings include a description and a suggested fix. If no meaningful issues are identified, the comment says so.

Review records are stored in the `Review` table. Jobs are retried up to three times with exponential backoff; failures are recorded after the final attempt.

## Project layout

| Path | Purpose |
| --- | --- |
| `server.ts` | Express webhook endpoint and job enqueueing |
| `worker.ts` | BullMQ worker for diff retrieval, AI review, persistence, and GitHub comments |
| `queue.ts` | BullMQ queue and Redis connection |
| `src/github/github.ts` | Pull request diff retrieval and comment posting |
| `src/ai/ollama.ts` | Ollama prompt, response parsing, and validation |
| `src/db.ts` | Prisma PostgreSQL client |
| `prisma/schema.prisma` | Database schema |

## Development notes

- `npm run dev` starts the webhook server through Nodemon.
- `npm test` is currently a placeholder and exits with “no test specified”; automated tests are not configured yet.
- Redis and Ollama settings are currently constants in the code rather than environment variables.
- Keep `.env` and any GitHub credentials out of version control.
