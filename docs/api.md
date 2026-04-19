# API Reference

Base URL: `http://localhost:4000`

## Health
`GET /health` — Returns `{ status: "ok" }`

## Auth
`POST /auth/register` — Register a new user
`POST /auth/login`    — Login and receive JWT

## Problems
`GET  /problems`        — List all problems
`GET  /problems/:id`    — Get a single problem
`POST /problems/:id/submit` — Submit an answer

## Users
`GET /users/me`         — Get current user profile
`GET /users/me/progress` — Get learning progress
