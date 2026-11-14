# I.M.B.P.I.S.H. — Groq Server

This folder contains the backend files for the I.M.B.P.I.S.H. Android web app.

## Required Render environment variable

Set `GROQ_API_KEY` in Render → your service → Environment.

Never put the API key in `server.js`, `package.json`, the HTML app, or GitHub.

## Endpoints

- `GET /` — server status
- `GET /health` — checks whether the server has a key configured
- `POST /chat` — expects JSON: `{ "message": "..." }`

## Model

Uses `openai/gpt-oss-20b` through Groq's OpenAI-compatible API.
Free-tier availability and limits are controlled by Groq and may change.
