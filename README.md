# OpenAI Governance Gateway POC

This is a simple proof-of-concept system for testing **OpenAI API usage capture through your own backend gateway**.

The key idea is: the frontend does **not** call OpenAI directly. Every AI request goes through the backend gateway, and the gateway records governance and usage details before returning the answer to the frontend.

## What this POC captures

| Field | Captured by | Notes |
|---|---|---|
| User email | Frontend form / backend gateway | Test user identity for the POC |
| Matter ID | Frontend form / backend gateway | Example legal/project attribution |
| Task type | Frontend form / backend gateway | Example: contract summary, legal research |
| Prompt | Backend gateway | Stored locally for demo only |
| AI response | OpenAI response | Stored locally for demo only |
| Model used | Backend request | Default from `.env`, optional from UI |
| OpenAI response ID | OpenAI API response | Useful for tracing |
| Input tokens | OpenAI API response usage | Returned by the API response |
| Output tokens | OpenAI API response usage | Returned by the API response |
| Total tokens | OpenAI API response usage | Returned by the API response |
| Processing time | Backend timer | Gateway-measured latency |
| Estimated cost | Backend calculation | Uses values configured in `.env` |
| Status/error | Backend gateway | Success or failed request |
| Timestamp | Backend gateway | Local event creation time |

## Architecture

```text
React Frontend
  - user email
  - matter ID
  - task type
  - prompt
       |
       v
Node.js + Express + TypeScript Gateway
  - validates request
  - adds governance metadata
  - calls OpenAI Responses API
  - captures response ID
  - captures token usage
  - measures latency
  - estimates cost
  - stores event locally
       |
       v
OpenAI API
       |
       v
Local JSON Usage Store
       |
       v
Usage dashboard in React
```

## Requirements

Install these first:

- Node.js 20 or newer
- npm
- OpenAI API key

Check Node and npm:

```bash
node -v
npm -v
```

## Folder structure

```text
openai-governance-poc/
  backend/
    src/
      server.ts
      store.ts
      types.ts
    data/
      .gitkeep
    .env.example
    package.json
    tsconfig.json
  frontend/
    src/
      App.tsx
      App.css
      main.tsx
      vite-env.d.ts
    index.html
    package.json
    tsconfig.json
    vite.config.ts
```

## Step 1: Configure the backend

Go to the backend folder:

```bash
cd backend
```

Copy the environment example:

### Windows PowerShell

```powershell
copy .env.example .env
```

### macOS / Linux / Git Bash

```bash
cp .env.example .env
```

Open `backend/.env` and set your OpenAI key:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

You can also change the model:

```env
OPENAI_MODEL=gpt-4.1-mini
```

If your account does not have access to that model, replace it with a model available in your OpenAI account.

## Step 2: Install and run the backend

From the `backend` folder:

```bash
npm install
npm run dev
```

Expected output:

```text
Gateway running on http://localhost:4000
```

You can check the backend health endpoint:

```text
http://localhost:4000/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "openai-governance-gateway"
}
```

## Step 3: Install and run the frontend

Open a second terminal and go to the frontend folder:

```bash
cd frontend
npm install
npm run dev
```

Expected output:

```text
Local: http://localhost:5173/
```

Open this in your browser:

```text
http://localhost:5173
```

## Step 4: Test the POC

In the frontend:

1. Enter a user email.
2. Enter a matter ID, for example `MATTER-001`.
3. Select a task type.
4. Enter a prompt.
5. Click **Send through Gateway**.

The response will appear on the right side, and a new usage event will appear in the usage table.

## Step 5: Check the stored events

The backend stores usage events here:

```text
backend/data/usage-events.json
```

Example event:

```json
{
  "platform": "openai",
  "model": "gpt-4.1-mini",
  "userEmail": "lawyer@example.com",
  "matterId": "MATTER-001",
  "taskType": "contract_summary",
  "openaiResponseId": "resp_xxx",
  "inputTokens": 100,
  "outputTokens": 50,
  "totalTokens": 150,
  "processingTimeMs": 1600,
  "estimatedCost": 0,
  "status": "success"
}
```

## API endpoints

Backend runs on `http://localhost:4000`.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Check backend status |
| POST | `/api/chat` | Send prompt through the gateway |
| GET | `/api/events` | Retrieve captured usage events |
| GET | `/api/summary` | Retrieve usage summary |
| DELETE | `/api/events` | Clear captured demo events |

## Optional: set cost estimates

The POC can calculate estimated cost if you configure prices in `backend/.env`.

Example:

```env
INPUT_COST_PER_1M=0.40
OUTPUT_COST_PER_1M=1.60
```

These values mean:

- input cost = USD 0.40 per 1 million input tokens
- output cost = USD 1.60 per 1 million output tokens

Keep these values updated based on the model pricing you use.

## Important security note

This is a POC only.

For production:

- Do not store raw prompts and responses unless approved.
- Use PostgreSQL instead of a JSON file.
- Add authentication to the frontend and backend.
- Store API keys in a secrets manager.
- Encrypt sensitive content.
- Add role-based access control.
- Add retention and deletion rules.
- Add audit logs for who views prompt/response content.

## Why this proves the gateway approach

This POC shows that if AI traffic goes through your backend, you can reliably collect:

- user identity from your application
- matter/project ID from your application
- prompt and response metadata
- OpenAI model used
- OpenAI response ID
- token usage returned by the OpenAI API
- latency measured by your gateway
- estimated cost calculated by your gateway

This does **not** capture activity from the ChatGPT website. For ChatGPT Enterprise web-app activity, a separate Enterprise Compliance Platform integration is required.

## OpenAI documentation references

- OpenAI API quickstart: https://developers.openai.com/api/docs/quickstart
- OpenAI Responses API: https://platform.openai.com/docs/api-reference/responses/create
- OpenAI Usage API: https://platform.openai.com/docs/api-reference/usage
- OpenAI Costs API: https://platform.openai.com/docs/api-reference/usage/costs
- OpenAI Audit Logs API: https://platform.openai.com/docs/api-reference/audit-logs/list
