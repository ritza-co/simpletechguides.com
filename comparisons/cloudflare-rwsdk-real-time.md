---
slug: cloudflare-workers-vs-redwoodsdk-real-time-apps
title: "Building Real-Time Apps with Cloudflare Workers and RedwoodSDK"
description: Compare building real-time polling applications with Cloudflare Workers and RedwoodSDK. See the differences in development experience, code patterns, and deployment.
authors: [simpletechguides]
tags: [cloudflare, redwoodsdk, real-time, workers, comparison]
keywords: [cloudflare workers, redwoodsdk, real-time apps, durable objects, websockets, edge computing]
image: /img/comparisons/cloudflare-rwsdk-real-time/cover.png
---

# Building Real-Time Apps with Cloudflare Workers and RedwoodSDK

Cloudflare Workers excel at edge computing with instant cold starts and global distribution. When you need real-time features, you'll typically set up Durable Objects for state management, WebSocket handlers for live updates, and custom authentication. RedwoodSDK handles these patterns with React server components and built-in real-time features while generating standard Cloudflare Workers code.

{/* truncate */}

We'll build identical live polling applications with both approaches. You'll see what RedwoodSDK automates and decide whether its React-based development model fits your projects.

By the end of this tutorial, you'll have built identical real-time polling applications that look like this:

<video width="100%" controls style={{maxWidth: '100%'}}>
  <source src="/assets/cloudflare-rwsdk-real-time/real-time-polling-app.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

You can find the complete source code for both applications in [this repository](https://github.com/ritza-co/cloudflare-and-redwood-realtime-apps).

## Prerequisites

To follow along with this guide, you'll need Node.js 18 or higher installed on your system. You'll also need the following (all free):

- [Cloudflare account](https://dash.cloudflare.com/sign-up) with Workers enabled
- A code editor like VS Code

## Building the Polling App with Cloudflare Workers

We'll start with Cloudflare Workers to understand the platform fundamentals, then build the same app with RedwoodSDK to see how its React-based approach streamlines development.

Create a new directory for both projects:

```bash
mkdir polling-app-comparison
cd polling-app-comparison
```

### Creating the Cloudflare Workers Project

Start by setting up a new Cloudflare Workers project with React:

```bash
npx create-cloudflare@latest cloudflare-polling-app
```

When prompted, choose:
- Framework Starter
- React
- TypeScript
- Yes to using Git
- No to deploying (we'll deploy later)

Navigate to the new project and install the dependencies:

```bash
cd cloudflare-polling-app
npm install
```

Now we'll build the polling system step by step, starting with the database schema.

### Configuring the Database

Create a D1 database for the polling app:

```bash
npx wrangler d1 create polling-db
```

When you run this command, Cloudflare will prompt you to log in (if you haven't already) and then create the database. After creation, you'll see a prompt asking whether to add the database to your wrangler configuration:

```
✅ Successfully created DB 'polling-db' in region WEUR

? Would you like to add this database to wrangler.jsonc?
  Yes
❯ Yes, but let me choose the binding name
  No
```

Choose the second option, "Yes, but let me choose the binding name", and enter `DB` as the binding name.

### Configuring TypeScript Types

To ensure TypeScript recognizes your database and Durable Object bindings, update the `worker-configuration.d.ts` file. Replace the empty `Env` interface with:

```typescript
// Runtime types generated with workerd@1.20250906.0 2025-09-13
declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    POLL_DURABLE_OBJECT: DurableObjectNamespace;
    REALTIME_DURABLE_OBJECT: DurableObjectNamespace;
  }
}
interface Env extends Cloudflare.Env {}
```

This defines the types for:
- `DB`: Your D1 database binding (which we'll use immediately)
- `POLL_DURABLE_OBJECT` and `REALTIME_DURABLE_OBJECT`: Durable Object bindings we'll configure later for state management and real-time features

### Setting Up the Database Schema

First, create an empty migration file:

```bash
npx wrangler d1 migrations create polling-db "initial-schema"
```

This creates an empty migration file in the `migrations/` directory. Now you need to add the SQL schema to define your database tables.

For this polling app, we'll create a comprehensive schema that supports polls, choices, users, and voting. Add the following SQL to your migration file (located in `migrations/0001_initial-schema.sql`):

```sql
-- Initial schema for real-time polling application
-- Creates all necessary tables for polls, choices, users, and authentication

-- Users table for authentication
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL UNIQUE,
    "password_hash" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- User sessions for authentication
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" DATETIME NOT NULL,
    CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE
);

-- Polls table
CREATE TABLE "polls" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "created_by" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Poll choices
CREATE TABLE "choices" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "poll_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "votes" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "choices_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "polls" ("id") ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX "users_username_idx" ON "users"("username");
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");
CREATE INDEX "polls_created_by_idx" ON "polls"("created_by");
CREATE INDEX "polls_created_at_idx" ON "polls"("created_at" DESC);
CREATE INDEX "choices_poll_id_idx" ON "choices"("poll_id");
```

Apply the database migrations:

```bash
npx wrangler d1 migrations apply polling-db --local
```

### Building the Authentication System

With Cloudflare Workers, you need to build authentication entirely from scratch. There's no built-in framework to handle users, sessions, or cookies. This means writing substantial amounts of boilerplate code that most web frameworks provide out-of-the-box.

We'll create a complete authentication system including user registration, password hashing, session management, and cookie parsing. You have full control over every aspect of authentication, but you also need to implement every piece yourself.

Create the directory structure for your worker services:

```bash
mkdir -p worker/services
```

Create `worker/services/auth.ts` and build the authentication service step by step.

Start by creating the file with imports and TypeScript interfaces:

```typescript
import { generateId } from "../utils";

export interface User {
  id: string;
  username: string;
  created_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  created_at: string;
  expires_at: string;
}

export class AuthService {
  constructor(private db: D1Database) {}
}
```

Next, add the password hashing method below the constructor:

```typescript
  // Simple password hashing (for demo purposes, use proper hashing in production)
  private async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + "DEMO_SALT");
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
```

Add the user registration method below the password hashing:

```typescript
  // Register a new user
  async register(username: string, password: string): Promise<User | { error: string }> {
    try {
      // Check if user exists
      const existingUser = await this.findUserByUsername(username);
      if (existingUser) {
        return { error: "Username already exists" };
      }

      const userId = generateId();
      const hashedPassword = await this.hashPassword(password);
      const now = new Date().toISOString();

      await this.db.prepare(`
        INSERT INTO users (id, username, password_hash, created_at)
        VALUES (?, ?, ?, ?)
      `).bind(userId, username, hashedPassword, now).run();

      return {
        id: userId,
        username,
        created_at: now
      };
    } catch (error) {
      return { error: "Registration failed" };
    }
  }
```

Below the registration method, add login functionality:

```typescript
  // Login user
  async login(username: string, password: string): Promise<User | { error: string }> {
    try {
      const hashedPassword = await this.hashPassword(password);

      const result = await this.db.prepare(`
        SELECT id, username, created_at
        FROM users
        WHERE username = ? AND password_hash = ?
      `).bind(username, hashedPassword).first();

      if (!result) {
        return { error: "Invalid username or password" };
      }

      return result as User;
    } catch (error) {
      return { error: "Login failed" };
    }
  }
```

Add user lookup methods below the login method:

```typescript
  // Find user by username
  async findUserByUsername(username: string): Promise<User | null> {
    const result = await this.db.prepare(`
      SELECT id, username, created_at
      FROM users
      WHERE username = ?
    `).bind(username).first();

    return result as User | null;
  }

  // Find user by ID
  async findUserById(userId: string): Promise<User | null> {
    const result = await this.db.prepare(`
      SELECT id, username, created_at
      FROM users
      WHERE id = ?
    `).bind(userId).first();

    return result as User | null;
  }
```

Add session management methods:

```typescript
  // Create a session
  async createSession(userId: string): Promise<Session> {
    const sessionId = generateId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const session = {
      id: sessionId,
      user_id: userId,
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString()
    };

    await this.db.prepare(`
      INSERT INTO sessions (id, user_id, created_at, expires_at)
      VALUES (?, ?, ?, ?)
    `).bind(session.id, session.user_id, session.created_at, session.expires_at).run();

    return session;
  }

  // Get session by ID
  async getSession(sessionId: string): Promise<Session | null> {
    const result = await this.db.prepare(`
      SELECT id, user_id, created_at, expires_at
      FROM sessions
      WHERE id = ? AND expires_at > datetime('now')
    `).bind(sessionId).first();

    return result as Session | null;
  }

  // Delete session
  async deleteSession(sessionId: string): Promise<void> {
    await this.db.prepare(`
      DELETE FROM sessions WHERE id = ?
    `).bind(sessionId).run();
  }
```

Finally, add the cookie handling methods at the end of the class:

```typescript
  // Get user from session cookie
  async getUserFromCookie(cookieHeader: string | null): Promise<User | null> {
    if (!cookieHeader) return null;

    const cookies = this.parseCookies(cookieHeader);
    const sessionId = cookies.session_id;

    if (!sessionId) return null;

    const session = await this.getSession(sessionId);
    if (!session) return null;

    return await this.findUserById(session.user_id);
  }

  // Helper to parse cookies
  private parseCookies(cookieHeader: string): Record<string, string> {
    const cookies: Record<string, string> = {};
    cookieHeader.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      if (name && value) {
        cookies[name] = decodeURIComponent(value);
      }
    });
    return cookies;
  }

  // Create session cookie
  createSessionCookie(sessionId: string): string {
    return `session_id=${sessionId}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${7 * 24 * 60 * 60}`;
  }

  // Clear session cookie
  clearSessionCookie(): string {
    return `session_id=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`;
  }
}
```

This authentication service handles user registration, login, session management, and cookie parsing. In a production app, you'd use proper password hashing like bcrypt, but this simplified version works for our tutorial.

**What this demonstrates:** With Cloudflare Workers, authentication requires substantial custom code. You need to manually handle password hashing, session creation/validation, cookie parsing, and database operations. While this gives you complete control, it's also significant infrastructure code that you need to write, test, and maintain for every project.

### Creating the Durable Objects

Durable Objects are Cloudflare's solution for stateful computing at the edge. For our polling app, we need two types:

1. **Poll Durable Objects**: Handle vote counting with fast in-memory operations
2. **Realtime Durable Objects**: Manage WebSocket connections for live updates

This approach provides excellent performance because votes are processed instantly in memory and WebSocket connections can broadcast updates to all connected clients. However, it requires manual coordination between different object types and careful management of WebSocket lifecycle events.

First, add the Durable Objects configuration to your `wrangler.jsonc` file.

Open `wrangler.jsonc` and add the following sections after the existing `d1_databases` section:

```jsonc
	"durable_objects": {
		"bindings": [
			{
				"name": "POLL_DURABLE_OBJECT",
				"class_name": "PollDurableObject"
			},
			{
				"name": "REALTIME_DURABLE_OBJECT",
				"class_name": "RealtimeDurableObject"
			}
		]
	},
	"migrations": [
		{
			"tag": "v1",
			"new_sqlite_classes": [
				"PollDurableObject",
				"RealtimeDurableObject"
			]
		}
	]
```

Create the directory for Durable Object classes:

```bash
mkdir -p worker/durable-objects
```

Create `worker/durable-objects/PollDurableObject.ts`:

```typescript
import { DurableObject } from 'cloudflare:workers';

export interface PollVoteData {
  [choiceId: string]: number;
}

export class PollDurableObject extends DurableObject {
  private votes: PollVoteData | undefined;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.votes = undefined;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/get-votes") {
      const votes = await this.getVotes();
      return Response.json(votes);
    }

    if (url.pathname.startsWith("/vote/")) {
      const choiceId = url.pathname.split("/vote/")[1];
      if (!choiceId) {
        return new Response("Choice ID required", { status: 400 });
      }
      const votes = await this.vote(choiceId);
      return Response.json(votes);
    }

    if (url.pathname === "/reset-votes") {
      const votes = await this.resetVotes();
      return Response.json(votes);
    }

    return new Response("Not Found", { status: 404 });
  }

  async getVotes(): Promise<PollVoteData> {
    if (this.votes === undefined) {
      this.votes = await this.ctx.storage.get<PollVoteData>("votes") ?? {};
    }
    return this.votes;
  }

  async vote(choiceId: string): Promise<PollVoteData> {
    const currentVotes = await this.getVotes();
    this.votes = {
      ...currentVotes,
      [choiceId]: (currentVotes[choiceId] ?? 0) + 1
    };

    await this.ctx.storage.put("votes", this.votes);
    return this.votes;
  }

  async resetVotes(): Promise<PollVoteData> {
    this.votes = {};
    await this.ctx.storage.put("votes", this.votes);
    return this.votes;
  }
}
```

Create `worker/durable-objects/RealtimeDurableObject.ts` and build it step by step.

Start with the basic structure and imports:

```typescript
import { DurableObject } from 'cloudflare:workers';
import { PollVoteData } from './PollDurableObject';

interface SessionData {
  id: string;
  connectedAt: number;
  pollId?: string;
}

export class RealtimeDurableObject extends DurableObject {
  sessions: Map<WebSocket, SessionData>;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.sessions = new Map();

    // Restore hibernating WebSocket connections
    this.ctx.getWebSockets().forEach((ws) => {
      const attachment = ws.deserializeAttachment();
      if (attachment) {
        this.sessions.set(ws, attachment as SessionData);
      }
    });

    // Set up auto-response for WebSocket ping/pong
    this.ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair("ping", "pong")
    );
  }
}
```

Add the main request handler method below the constructor:

```typescript
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/ws") {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("Expected Upgrade: websocket", { status: 426 });
      }

      const webSocketPair = new WebSocketPair();
      const [client, server] = Object.values(webSocketPair);

      // Accept WebSocket with hibernation support
      this.ctx.acceptWebSocket(server);

      const sessionId = crypto.randomUUID();
      const sessionData: SessionData = {
        id: sessionId,
        connectedAt: Date.now()
      };

      // Serialize attachment for hibernation
      server.serializeAttachment(sessionData);
      this.sessions.set(server, sessionData);

      // Send welcome message
      server.send(JSON.stringify({
        type: "connected",
        sessionId: sessionId,
        timestamp: Date.now()
      }));

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    if (url.pathname === "/broadcast") {
      const message = await request.text();
      this.broadcast(message);
      return new Response("Broadcasted");
    }

    if (url.pathname === "/broadcast-vote-update") {
      const voteData = await request.json() as PollVoteData;
      this.broadcastVoteUpdate(voteData);
      return new Response("Vote update broadcasted");
    }

    return new Response("Not Found", { status: 404 });
  }
```

Add the WebSocket message handling methods:

```typescript
  async webSocketMessage(ws: WebSocket, message: string): Promise<void> {
    try {
      const data = JSON.parse(message);
      const session = this.sessions.get(ws);

      if (!session) {
        ws.send(JSON.stringify({ type: "error", message: "Session not found" }));
        return;
      }

      switch (data.type) {
        case "ping":
          ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
          break;

        case "join-room":
          ws.send(JSON.stringify({
            type: "joined-room",
            room: data.room,
            sessionId: session.id
          }));
          break;

        default:
          ws.send(JSON.stringify({
            type: "error",
            message: `Unknown message type: ${data.type}`
          }));
      }
    } catch (error) {
      ws.send(JSON.stringify({
        type: "error",
        message: "Invalid JSON message"
      }));
    }
  }

  async webSocketClose(ws: WebSocket, _code: number, _reason: string, _wasClean: boolean): Promise<void> {
    this.sessions.delete(ws);
  }

  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    console.error("WebSocket error:", error);
    this.sessions.delete(ws);
  }
```

Finally, add the broadcasting utility methods:

```typescript
  // Broadcast message to all connected clients
  broadcast(message: string): void {
    this.ctx.getWebSockets().forEach((ws) => {
      try {
        ws.send(message);
      } catch (error) {
        console.error("Error broadcasting to WebSocket:", error);
      }
    });
  }

  // Get current connection count
  getConnectionCount(): number {
    return this.ctx.getWebSockets().length;
  }

  // Broadcast poll vote update to all connected clients
  broadcastVoteUpdate(votes: PollVoteData): void {
    const message = JSON.stringify({
      type: "poll-vote-update",
      votes: votes,
      timestamp: Date.now()
    });

    this.broadcast(message);
  }
}
```

These Durable Objects handle poll-specific state management and WebSocket connections for real-time updates.

These two Durable Object classes require substantial infrastructure code. You need to manually handle WebSocket lifecycle events, message parsing, connection state management, session tracking, and error handling. Each feature that seems simple (like "broadcast a message to all connected clients") requires careful implementation of multiple methods and proper error handling.

### Adding Utility Functions

Now create `worker/utils.ts` for utility functions:

```typescript
// Helper function to generate unique IDs
export function generateId(): string {
  return crypto.randomUUID();
}
```

### Building the Main Worker

The main worker file is where all the complexity comes together. In Cloudflare Workers, this means manually implementing:

- **API routing**: Pattern matching URLs and HTTP methods
- **Authentication middleware**: Checking sessions on every protected route
- **Database operations**: SQL queries and result processing
- **Durable Object coordination**: Managing communication between poll state and real-time objects
- **Error handling**: Comprehensive try-catch blocks for every operation

This file will be quite large, with much of it being boilerplate that you'd write repeatedly across projects.

Replace the existing `worker/index.ts` file and build it step by step.

Start by replacing the entire file with the imports and exports:

```typescript
import { PollDurableObject } from "./durable-objects/PollDurableObject";
import { RealtimeDurableObject } from "./durable-objects/RealtimeDurableObject";
import { AuthService, type User } from "./services/auth";
import { generateId } from "./utils";

// Export Durable Objects
export { PollDurableObject, RealtimeDurableObject };
```

Add the poll creation handler below the exports:

```typescript
// Handle poll creation (requires authentication)
async function createPoll(request: Request, env: Env, user: User): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const data = await request.json() as {
      title: string;
      choices: Array<{ text: string; color: string }>;
    };

    if (!data.title || !data.choices || data.choices.length < 2) {
      return new Response("Invalid poll data", { status: 400 });
    }

    const pollId = generateId();
    const choices = data.choices.map(choice => ({
      id: generateId(),
      text: choice.text,
      color: choice.color,
      votes: 0
    }));

    // Save poll to database with user ownership
    await env.DB.prepare(`
      INSERT INTO polls (id, title, created_by) VALUES (?, ?, ?)
    `).bind(pollId, data.title, user.id).run();

    // Save choices to database
    for (const choice of choices) {
      await env.DB.prepare(`
        INSERT INTO choices (id, poll_id, text, color, votes) VALUES (?, ?, ?, ?, ?)
      `).bind(choice.id, pollId, choice.text, choice.color, choice.votes).run();
    }

    return Response.json({ id: pollId, title: data.title, choices });
  } catch (error) {
    console.error("Error creating poll:", error);
    return new Response("Internal server error", { status: 500 });
  }
}

// Handle user registration
async function handleRegister(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return new Response("Username and password required", { status: 400 });
    }

    const auth = new AuthService(env.DB);
    const result = await auth.register(username, password);

    if ('error' in result) {
      return new Response(result.error, { status: 400 });
    }

    // Create session
    const session = await auth.createSession(result.id);
    const cookie = auth.createSessionCookie(session.id);

    return new Response(JSON.stringify({ user: result }), {
      status: 201,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": cookie
      }
    });
  } catch (error) {
    console.error("Registration error:", error);
    return new Response("Registration failed", { status: 500 });
  }
}

// Handle user login
async function handleLogin(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return new Response("Username and password required", { status: 400 });
    }

    const auth = new AuthService(env.DB);
    const result = await auth.login(username, password);

    if ('error' in result) {
      return new Response(result.error, { status: 401 });
    }

    // Create session
    const session = await auth.createSession(result.id);
    const cookie = auth.createSessionCookie(session.id);

    return new Response(JSON.stringify({ user: result }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": cookie
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    return new Response("Login failed", { status: 500 });
  }
}

// Handle poll voting
async function handlePollVote(request: Request, env: Env, pollId: string, choiceId: string): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    // Get the poll-specific Durable Object
    const doId = env.POLL_DURABLE_OBJECT.idFromName(pollId);
    const pollObj = env.POLL_DURABLE_OBJECT.get(doId);

    // Cast vote using the durable object
    const voteResponse = await pollObj.fetch(new Request(`https://dummy.com/vote/${choiceId}`));
    const newVotes = await voteResponse.json();

    // Update database (increment vote count)
    await env.DB.prepare(`
      UPDATE choices SET votes = votes + 1 WHERE id = ?
    `).bind(choiceId).run();

    // Broadcast update to poll-specific realtime room
    const realtimeId = env.REALTIME_DURABLE_OBJECT.idFromName(`poll-${pollId}`);
    const realtimeObj = env.REALTIME_DURABLE_OBJECT.get(realtimeId);
    await realtimeObj.fetch(new Request("https://dummy.com/broadcast-vote-update", {
      method: "POST",
      body: JSON.stringify(newVotes),
      headers: { "Content-Type": "application/json" }
    }));

    return Response.json(newVotes);
  } catch (error) {
    console.error(`Error handling vote for poll ${pollId}:`, error);
    return new Response("Internal server error", { status: 500 });
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const auth = new AuthService(env.DB);

    // Get current user from session
    const currentUser = await auth.getUserFromCookie(request.headers.get("Cookie"));

    // Handle poll-specific WebSocket upgrade
    if (url.pathname.startsWith("/ws/")) {
      const pollId = url.pathname.split("/ws/")[1];
      if (!pollId) {
        return new Response("Poll ID required for WebSocket", { status: 400 });
      }

      const realtimeId = env.REALTIME_DURABLE_OBJECT.idFromName(`poll-${pollId}`);
      const realtimeObj = env.REALTIME_DURABLE_OBJECT.get(realtimeId);
      return realtimeObj.fetch(new Request(`${request.url.replace(url.pathname, "/ws")}`, request));
    }

    // Authentication routes
    if (url.pathname === "/api/auth/register") {
      return handleRegister(request, env);
    }

    if (url.pathname === "/api/auth/login") {
      return handleLogin(request, env);
    }

    // Get current user info
    if (url.pathname === "/api/auth/me" && request.method === "GET") {
      if (!currentUser) {
        return new Response("Unauthorized", { status: 401 });
      }
      return Response.json({ user: currentUser });
    }

    // Create new poll (requires authentication)
    if (url.pathname === "/api/polls" && request.method === "POST") {
      if (!currentUser) {
        return new Response("Authentication required", { status: 401 });
      }
      return createPoll(request, env, currentUser);
    }

    // Get user's polls (requires authentication)
    if (url.pathname === "/api/polls" && request.method === "GET") {
      if (!currentUser) {
        return new Response("Authentication required", { status: 401 });
      }
      try {
        const result = await env.DB.prepare(`
          SELECT p.id, p.title, p.created_at,
                 c.id as choice_id, c.text as choice_text, c.color as choice_color, c.votes as choice_votes
          FROM polls p
          LEFT JOIN choices c ON p.id = c.poll_id
          WHERE p.created_by = ?
          ORDER BY p.created_at DESC, c.id
        `).bind(currentUser.id).all();

        const pollsMap = new Map();

        for (const row of result.results) {
          const poll = pollsMap.get(row.id) || {
            id: row.id,
            title: row.title,
            created_at: row.created_at,
            choices: []
          };

          if (row.choice_id) {
            poll.choices.push({
              id: row.choice_id,
              text: row.choice_text,
              color: row.choice_color,
              votes: row.choice_votes
            });
          }

          pollsMap.set(row.id, poll);
        }

        return Response.json(Array.from(pollsMap.values()));
      } catch (error) {
        console.error("Error getting polls:", error);
        return new Response("Internal server error", { status: 500 });
      }
    }

    // Get specific poll
    if (url.pathname.match(/^\/api\/polls\/[^\/]+$/)) {
      const pollId = url.pathname.split("/api/polls/")[1];

      try {
        const result = await env.DB.prepare(`
          SELECT p.id, p.title, p.created_at,
                 c.id as choice_id, c.text as choice_text, c.color as choice_color, c.votes as choice_votes
          FROM polls p
          LEFT JOIN choices c ON p.id = c.poll_id
          WHERE p.id = ?
          ORDER BY c.id
        `).bind(pollId).all();

        if (result.results.length === 0) {
          return new Response("Poll not found", { status: 404 });
        }

        const poll = {
          id: result.results[0].id,
          title: result.results[0].title,
          created_at: result.results[0].created_at,
          choices: result.results
            .filter(row => row.choice_id)
            .map(row => ({
              id: row.choice_id,
              text: row.choice_text,
              color: row.choice_color,
              votes: row.choice_votes
            }))
        };

        return Response.json(poll);
      } catch (error) {
        console.error("Error getting poll:", error);
        return new Response("Internal server error", { status: 500 });
      }
    }

    // Vote on a poll choice
    if (url.pathname.match(/^\/api\/polls\/[^\/]+\/vote\/[^\/]+$/)) {
      const pathParts = url.pathname.split("/");
      const pollId = pathParts[3];
      const choiceId = pathParts[5];

      return handlePollVote(request, env, pollId, choiceId);
    }

    // All other routes return 404 (React app will be served by assets)
    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
```

**What you just built:** This main worker file contains extensive backend logic. Every API endpoint requires manual route matching, authentication checks, database queries, and error handling. The poll voting function alone needs to coordinate between three different systems: the database (for persistence), poll Durable Objects (for fast vote counting), and realtime Durable Objects (for broadcasting updates).

This demonstrates both the power and burden of Cloudflare Workers: you have complete control over every aspect of your application's behavior, but you also need to implement every piece of infrastructure yourself.

### Building the React Frontend

The polling app needs several React components for different parts of the interface. We'll build these step by step, starting by updating the existing `src/App.tsx` file and then creating the individual components.

#### Step 1: Update the Main App Component

Replace the contents of the existing `src/App.tsx` file with this updated version:

```typescript
import { useState, useEffect } from 'react'
import { PollPage } from './components/PollPage'
import { LoginForm } from './components/LoginForm'
import { UserDashboard } from './components/UserDashboard'
import './App.css'

interface User {
  id: string;
  username: string;
  created_at: string;
}

function App() {
  const [currentView, setCurrentView] = useState<'home' | 'poll'>('home')
  const [currentPollId, setCurrentPollId] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Check for existing session on app load
  useEffect(() => {
    checkSession()
  }, [])

  // Simple hash-based routing
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash
      if (hash.startsWith('#/poll/')) {
        const pollId = hash.split('#/poll/')[1]
        setCurrentPollId(pollId)
        setCurrentView('poll')
      } else {
        setCurrentView('home')
        setCurrentPollId(null)
      }
    }

    handleHashChange()
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const checkSession = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      }
    } catch (error) {
      console.error('Session check failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const navigateToPoll = (pollId: string) => {
    window.location.hash = `#/poll/${pollId}`
  }

  const navigateHome = () => {
    window.location.hash = '#/'
  }

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser)
  }

  const handleLogout = () => {
    setUser(null)
    navigateHome()
  }

  if (loading) {
    return (
      <div className="loading-container">
        Loading...
      </div>
    )
  }

  // Show login form if not authenticated
  if (!user) {
    return <LoginForm onLogin={handleLogin} />
  }

  // Show poll page if viewing a specific poll
  if (currentView === 'poll' && currentPollId) {
    return (
      <PollPage
        pollId={currentPollId}
        onBack={navigateHome}
      />
    )
  }

  // Show user dashboard
  return (
    <UserDashboard
      user={user}
      onLogout={handleLogout}
      onNavigateToPoll={navigateToPoll}
    />
  )
}

export default App
```

This updated `App.tsx` includes proper routing, session management, and separates concerns into individual components.

#### Step 2: Create the Components Directory

Create a new directory for your React components:

```bash
mkdir src/components
```

#### Step 3: Create Individual Component Files

Now we'll create each component file separately. This modular approach makes the code much more maintainable than having everything in one giant file.

**Create `src/components/LoginForm.tsx`:**
```typescript
import { useState } from 'react';

interface User {
  id: string;
  username: string;
  created_at: string;
}

interface LoginFormProps {
  onLogin: (user: User) => void;
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });

      if (response.ok) {
        const data = await response.json();
        onLogin(data.user);
      } else {
        const errorText = await response.text();
        setError(errorText || 'Authentication failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-form-container">
      <h2 className="login-title">
        {isRegistering ? 'Create Account' : 'Login'}
      </h2>

      <form onSubmit={handleSubmit}>
        <div className="login-section">
          <label className="login-label">
            Username:
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="login-input"
          />
        </div>

        <div className="login-section">
          <label className="login-label">
            Password:
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="login-input"
          />
        </div>

        {error && (
          <div className="login-error">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !username || !password}
          className={`login-button-primary ${(loading || !username || !password) ? 'disabled' : ''}`}
        >
          {loading ? 'Please wait...' : (isRegistering ? 'Create Account' : 'Login')}
        </button>

        <button
          type="button"
          onClick={() => {
            setIsRegistering(!isRegistering);
            setError('');
          }}
          className="login-button-secondary"
        >
          {isRegistering ? 'Already have an account? Login' : 'Need an account? Register'}
        </button>
      </form>
    </div>
  );
}
```

**Create `src/components/UserDashboard.tsx`:**
```typescript
import { useState, useEffect } from 'react';
import { PollForm } from './PollForm';

interface User {
  id: string;
  username: string;
  created_at: string;
}

interface Poll {
  id: string;
  title: string;
  created_at: string;
  choices: Array<{
    id: string;
    text: string;
    color: string;
    votes: number;
  }>;
}

interface UserDashboardProps {
  user: User;
  onLogout: () => void;
  onNavigateToPoll: (pollId: string) => void;
}

export function UserDashboard({ user, onLogout, onNavigateToPoll }: UserDashboardProps) {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPolls = async () => {
    try {
      const response = await fetch('/api/polls', {
        credentials: 'include'
      });
      if (response.ok) {
        const pollsData = await response.json();
        setPolls(pollsData);
      }
    } catch (error) {
      console.error('Error fetching polls:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolls();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      onLogout();
    } catch (error) {
      console.error('Logout error:', error);
      onLogout(); // Logout anyway on error
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Your Voting Polls</h1>
        <div className="dashboard-user-info">
          <span className="dashboard-username">Welcome, {user.username}!</span>
          <button
            onClick={handleLogout}
            className="logout-button"
          >
            Logout
          </button>
        </div>
      </div>

      <p className="dashboard-description">
        Create custom voting polls with multiple choices and colors. Share polls with others and watch results update in real-time!
      </p>

      <PollForm onPollCreated={fetchPolls} />

      {loading ? (
        <div className="centered-content">
          Loading polls...
        </div>
      ) : polls.length > 0 ? (
        <div>
          <h2 style={{ marginTop: "3rem", marginBottom: "1rem" }}>Your Polls</h2>
          <div className="poll-list">
            {polls.map(poll => {
              const totalVotes = poll.choices.reduce((sum, choice) => sum + choice.votes, 0);

              return (
                <div key={poll.id} className="poll-list-item">
                  <h3 className="poll-list-title">
                    {poll.title}
                  </h3>
                  <div className="poll-choices-preview">
                    {poll.choices.map(choice => (
                      <span key={choice.id} className="poll-choice-tag" style={{
                        background: choice.color
                      }}>
                        {choice.text}: {choice.votes} votes
                      </span>
                    ))}
                  </div>
                  <div className="poll-actions">
                    <button
                      onClick={() => onNavigateToPoll(poll.id)}
                      className="poll-view-button"
                    >
                      View & Vote →
                    </button>
                    <span className="poll-vote-count">
                      {totalVotes} total votes
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="centered-content">
          <p>You haven't created any polls yet. Use the form above to create your first poll!</p>
        </div>
      )}
    </div>
  );
}
```

**Create `src/hooks/useWebSocket.ts` (for real-time functionality):**

First, create the hooks directory and the WebSocket hook:

```bash
mkdir src/hooks
```

```typescript
import { useEffect, useRef, useState, useCallback } from 'react';

export interface PollVoteData {
  [choiceId: string]: number;
}

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export interface UseWebSocketReturn {
  votes: PollVoteData | null;
  isConnected: boolean;
  connectionCount: number;
  error: string | null;
  reconnect: () => void;
}

export function useWebSocket(pollId?: string): UseWebSocketReturn {
  const [votes, setVotes] = useState<PollVoteData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionCount, setConnectionCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (!pollId || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      setError(null);
      const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/${pollId}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        reconnectAttempts.current = 0;

        // Send initial ping
        ws.send(JSON.stringify({ type: 'ping' }));
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          switch (message.type) {
            case 'poll-vote-update':
              if (message.votes) {
                setVotes(message.votes);
              }
              break;

            case 'connected':
              console.log('WebSocket session established:', message.sessionId);
              break;

            case 'pong':
              // Handle pong response
              break;

            case 'connection-count':
              setConnectionCount(message.count || 0);
              break;

            case 'error':
              console.error('WebSocket server error:', message.message);
              setError(message.message);
              break;

            default:
              console.log('Unknown message type:', message.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        wsRef.current = null;

        // Attempt to reconnect with exponential backoff
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
          console.log(`Attempting to reconnect in ${delay}ms...`);

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        } else {
          setError('Failed to connect to WebSocket after multiple attempts');
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('WebSocket connection error');
      };

    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setError('Failed to create WebSocket connection');
    }
  }, [pollId]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttempts.current = 0;
    connect();
  }, [connect, disconnect]);

  // Load initial poll vote data from durable object if pollId is provided
  useEffect(() => {
    if (pollId) {
      // For polls, we'll get the initial votes from the durable object via WebSocket
      // or we could fetch from /api/polls/{pollId} if needed
    }
  }, [pollId]);

  // Establish WebSocket connection
  useEffect(() => {
    if (pollId) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [connect, disconnect, pollId]);

  // Ping interval to keep connection alive
  useEffect(() => {
    if (isConnected && wsRef.current) {
      const pingInterval = setInterval(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000); // Ping every 30 seconds

      return () => clearInterval(pingInterval);
    }
  }, [isConnected]);

  return {
    votes,
    isConnected,
    connectionCount,
    error,
    reconnect,
  };
}
```

**Create `src/components/PollPage.tsx`:**
```typescript
import { useEffect, useState } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { VoteButtons } from './VoteButtons';

export interface Poll {
  id: string;
  title: string;
  created_at: string;
  choices: Choice[];
}

export interface Choice {
  id: string;
  text: string;
  color: string;
  votes: number;
}

interface PollPageProps {
  pollId: string;
  onBack: () => void;
}

export function PollPage({ pollId, onBack }: PollPageProps) {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { votes } = useWebSocket(pollId);

  useEffect(() => {
    const fetchPoll = async () => {
      try {
        const response = await fetch(`/api/polls/${pollId}`);
        if (response.ok) {
          const pollData = await response.json();
          setPoll(pollData);
        } else if (response.status === 404) {
          setError("Poll not found");
        } else {
          setError("Failed to load poll");
        }
      } catch {
        setError("Error loading poll");
      } finally {
        setLoading(false);
      }
    };

    fetchPoll();
  }, [pollId]);

  if (loading) {
    return (
      <div className="loading-container">
        Loading poll...
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h1 className="error-title">Error</h1>
        <p className="error-message">{error}</p>
        <button
          onClick={onBack}
          className="poll-back-button"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (!poll) {
    return null;
  }

  // Update choice votes from durable object if available
  const choicesWithVotes = poll.choices.map(choice => ({
    ...choice,
    votes: votes?.[choice.id] ?? choice.votes
  }));

  const totalVotes = choicesWithVotes.reduce((sum, choice) => sum + choice.votes, 0);

  return (
    <div className="poll-page-container">
      <h1 className="poll-title">
        {poll.title}
      </h1>

      <p className="poll-subtitle">
        Vote and watch the results update live!
      </p>

      <div className="poll-choices-grid">
        {choicesWithVotes.map(choice => {
          const percentage = totalVotes > 0 ? Math.round((choice.votes / totalVotes) * 100) : 0;

          return (
            <div key={choice.id} className="poll-choice-card" style={{
              border: `3px solid ${choice.color}`
            }}>
              <h2 className="poll-choice-title" style={{
                color: choice.color
              }}>
                {choice.text}
              </h2>
              <div className="poll-choice-votes" style={{
                color: choice.color
              }}>
                {choice.votes}
              </div>
              <div className="poll-choice-percentage">
                {percentage}%
              </div>

              <div className="poll-progress-bar">
                <div className="poll-progress-fill" style={{
                  width: `${percentage}%`,
                  background: choice.color
                }} />
              </div>
            </div>
          );
        })}
      </div>

      <VoteButtons pollId={pollId} choices={choicesWithVotes} />

      <p className="poll-stats">
        Total votes: {totalVotes} • Results update live across all devices!
      </p>

      <div style={{ marginTop: "2rem" }}>
        <button
          onClick={onBack}
          className="poll-back-button"
          style={{
            marginRight: "1rem"
          }}
        >
          ← Back to Polls
        </button>
      </div>
    </div>
  );
}
```

**Create `src/components/PollForm.tsx`:**
```typescript
import { useState } from "react";

type Choice = {
  text: string;
  color: string;
};

type PollFormProps = {
  onPollCreated: () => void;
};

export function PollForm({ onPollCreated }: PollFormProps) {
  const [title, setTitle] = useState("");
  const [choices, setChoices] = useState<Choice[]>([
    { text: "", color: "#007cba" },
    { text: "", color: "#dc3545" }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState("");

  const addChoice = () => {
    const colors = ["#28a745", "#ffc107", "#6f42c1", "#fd7e14", "#e83e8c", "#20c997"];
    const nextColor = colors[choices.length % colors.length];
    setChoices([...choices, { text: "", color: nextColor }]);
  };

  const removeChoice = (index: number) => {
    if (choices.length > 2) {
      setChoices(choices.filter((_, i) => i !== index));
    }
  };

  const updateChoice = (index: number, field: keyof Choice, value: string) => {
    const updated = choices.map((choice, i) =>
      i === index ? { ...choice, [field]: value } : choice
    );
    setChoices(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setResult("Please enter a poll title");
      return;
    }

    const validChoices = choices.filter(c => c.text.trim());
    if (validChoices.length < 2) {
      setResult("Please enter at least 2 choices");
      return;
    }

    setIsSubmitting(true);
    setResult("");

    try {
      const response = await fetch("/api/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: title.trim(),
          choices: validChoices
        })
      });

      if (response.ok) {
        setTitle("");
        setChoices([
          { text: "", color: "#007cba" },
          { text: "", color: "#dc3545" }
        ]);
        setResult("Poll created successfully!");
        onPollCreated();
      } else {
        setResult("Failed to create poll");
      }
    } catch (error) {
      setResult("Error creating poll");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="poll-form-container">
      <h2 className="poll-form-title">Create New Poll</h2>

      <form onSubmit={handleSubmit}>
        <div className="poll-form-section">
          <label className="poll-form-label">
            Poll Title:
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What would you like to ask?"
            className="poll-form-input"
          />
        </div>

        <div className="poll-form-section">
          <label className="poll-form-label">
            Choices:
          </label>
          {choices.map((choice, index) => (
            <div key={index} className="poll-form-input-flex">
              <input
                type="text"
                value={choice.text}
                onChange={(e) => updateChoice(index, "text", e.target.value)}
                placeholder={`Choice ${index + 1}`}
                className="poll-form-input-text"
              />
              <input
                type="color"
                value={choice.color}
                onChange={(e) => updateChoice(index, "color", e.target.value)}
                className="poll-form-color-input"
              />
              {choices.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeChoice(index)}
                  className="poll-form-button-danger"
                >
                  Remove
                </button>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={addChoice}
            disabled={choices.length >= 8}
            className={`poll-form-button-secondary ${choices.length >= 8 ? 'disabled' : ''}`}
          >
            Add Choice ({choices.length}/8)
          </button>
        </div>

        <div className="poll-form-actions">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`poll-form-button-primary ${isSubmitting ? 'disabled' : ''}`}
          >
            {isSubmitting ? "Creating..." : "Create Poll"}
          </button>

          {result && (
            <span className={`poll-form-result ${result.includes("successfully") ? 'success' : 'error'}`}>
              {result}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
```

**Create `src/components/VoteButtons.tsx`:**
```typescript
import { useState } from "react";

type Choice = {
  id: string;
  text: string;
  color: string;
  votes: number;
};

type VoteButtonsProps = {
  pollId: string;
  choices: Choice[];
};

export function VoteButtons({ pollId, choices }: VoteButtonsProps) {
  const [isVoting, setIsVoting] = useState(false);
  const [lastVoted, setLastVoted] = useState<string | null>(null);

  const handleVote = async (choiceId: string) => {
    setIsVoting(true);
    setLastVoted(choiceId);

    try {
      const response = await fetch(`/api/polls/${pollId}/vote/${choiceId}`, {
        method: "POST"
      });

      if (!response.ok) {
        console.error("Failed to vote:", await response.text());
      }
    } catch (error) {
      console.error("Failed to vote:", error);
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <div className="vote-buttons-container">
      {choices.map(choice => (
        <button
          key={choice.id}
          onClick={() => handleVote(choice.id)}
          disabled={isVoting}
          className="vote-button"
          style={{
            background: choice.color,
            opacity: isVoting ? 0.6 : 1,
            transform: lastVoted === choice.id && !isVoting ? "scale(1.05)" : "scale(1)"
          }}
          onMouseOver={(e) => {
            if (!isVoting) {
              e.currentTarget.style.transform = "scale(1.05)";
              e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
            }
          }}
          onMouseOut={(e) => {
            if (!isVoting) {
              e.currentTarget.style.transform = lastVoted === choice.id ? "scale(1.05)" : "scale(1)";
              e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
            }
          }}
        >
          {isVoting && lastVoted === choice.id ? "Voting..." : `Vote ${choice.text}`}
        </button>
      ))}
    </div>
  );
}
```

In the following sections, we'll implement each of these components step by step, showing you the exact code for each file. This organized approach makes it much easier to understand what each component does and how they work together.

### Adding Styling

For the complete CSS styling, copy the styles from the `src/App.css` file in [this repository](https://github.com/ritza-co/cloudflare-and-redwood-realtime-apps/blob/master/cloudflare-polling-app/src/App.css) and place it in your `src/` directory.

### Testing the Cloudflare Workers App

Now you can test your Cloudflare Workers polling app:

```bash
npm run dev
```

Open your browser to `http://localhost:5173`. You should see a login form where you can register a new account, create polls, and vote in real-time.

**Testing real-time functionality:**

1. Create a poll with multiple choices and different colors
2. Copy the poll URL from the "View & Vote →" button
3. **Open a new private/incognito browser window** and navigate to the poll URL
4. Register a different user in the private browser
5. **Share the poll URL** with others or test in multiple browser tabs with different users
6. Vote from different browsers to see the real-time updates working across all connected clients

Opening polls in private browsers ensures you're testing with separate user sessions, which better simulates how real users would interact with your shared polls.

<img src="/assets/cloudflare-rwsdk-real-time/cf-workers-demo.png" alt="Cloudflare Workers app running" style={{maxWidth: '600px', width: '100%', height: 'auto'}} />

**What you've accomplished:**

You've built a complete, production-ready polling application using Cloudflare Workers. The final tally:

- **Substantial backend code** across 6 different files
- **Complex React frontend** with WebSocket management
- **Multiple configuration files** with manual database and Durable Object setup
- **Manual coordination** between authentication, database, and real-time systems

Every feature required building from first principles. Authentication meant writing session management from scratch. Real-time features meant manually handling WebSocket connections and message broadcasting. Database operations meant writing SQL and handling results.

The benefit: you understand exactly how every piece works and have complete control over the implementation. The cost: significant development time and manual infrastructure management.

Now let's see how RedwoodSDK handles the same functionality.

## Building the Same App with RedwoodSDK

Now we'll build the identical polling application using RedwoodSDK. The goal is exactly the same functionality: real-time polling with vote counting and live updates. You'll see how the framework provides built-in solutions for the infrastructure patterns you just implemented manually.

Instead of building authentication from scratch, RedwoodSDK provides it out-of-the-box. Instead of manually managing WebSocket connections, the framework handles real-time updates automatically. Instead of writing custom API routing, you'll use declarative route definitions.

Navigate back to the parent directory and create the RedwoodSDK version:

```bash
cd ../
npx create-rwsdk redwood-polling-app
cd redwood-polling-app
npm install
```

### RedwoodSDK Authentication Setup

Here's the first major difference: RedwoodSDK includes built-in authentication. Instead of writing extensive custom authentication code like you did with Cloudflare Workers, the framework provides this automatically.

Look at the `protected` route in `src/worker.tsx` to see how RedwoodSDK handles session loading and user context:

```typescript
// RedwoodSDK automatically loads sessions and user data
route("/protected", [
  ({ ctx }) => {
    if (!ctx.user) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/user/login" },
      });
    }
  },
  Home,
]),
```

**The authentication advantage:** The framework automatically populates `ctx.user` from the session, handles redirects, and manages all the authentication middleware behind the scenes. No session parsing, no cookie management, no password hashing because it's all handled by the framework.

RedwoodSDK includes modern WebAuthn/passkey authentication out of the box. You can see the complete login implementation in your `src/app/pages/user/Login.tsx` file. It handles both passkey registration and login with just a few function calls to `startPasskeyLogin()` and `finishPasskeyLogin()`.

Compare this to the authentication service you wrote for Cloudflare Workers. RedwoodSDK provides all of this functionality without any custom code.

**Try it yourself:** Run `npm run dev` and visit `http://localhost:5173/protected` in your browser. You'll see the authentication system in action. It automatically redirects you to the login page, where you can register with a passkey and then access the protected content. This `/protected` route is a working example of how to implement authentication middleware in your own routes.

<img src="/assets/cloudflare-rwsdk-real-time/passkey.png" alt="Passkey Registration" style={{maxWidth: '600px', width: '100%', height: 'auto'}} />

>**Note:** For today's tutorial, we'll be using an experimental feature called the real-time client (`initRealtimeClient()`) to build live polling functionality. Since RedwoodSDK is still in active development, authentication is not currently configured to work with the real-time client system.

### Configuring Durable Objects for Real-Time Features

Here's another key difference: RedwoodSDK provides a built-in `RealtimeDurableObject` that handles WebSocket connections and message broadcasting automatically. You only need to create application-specific Durable Objects for your custom logic.

Remember in the Cloudflare Workers version, you had to build two complete Durable Object classes (180+ lines) to handle both WebSocket management and poll state. With RedwoodSDK, you only need to create the poll state management because the real-time WebSocket handling is provided by the framework.

Your fresh RedwoodSDK project starts with these `wrangler.jsonc` configurations:

```jsonc
{
  "durable_objects": {
    "bindings": [
      {
        "name": "SESSION_DURABLE_OBJECT",
        "class_name": "SessionDurableObject"
      }
    ]
  },
  //...
  "migrations": [
    {
      "tag": "v1",
      "new_sqlite_classes": ["SessionDurableObject"]
    }
  ]
}
```

Update your `wrangler.jsonc` file to add the real-time and poll Durable Objects. Replace the existing `durable_objects` and `migrations` sections with these:

```jsonc
{
  "durable_objects": {
    "bindings": [
      {
        "name": "SESSION_DURABLE_OBJECT",
        "class_name": "SessionDurableObject"
      },
      {
        "name": "REALTIME_DURABLE_OBJECT",
        "class_name": "RealtimeDurableObject"
      },
      {
        "name": "POLL_DURABLE_OBJECT",
        "class_name": "PollDurableObject"
      }
    ]
  },
  //...
  "migrations": [
    {
      "tag": "v1",
      "new_sqlite_classes": ["SessionDurableObject"]
    },
    {
      "tag": "v2",
      "new_sqlite_classes": ["RealtimeDurableObject", "PollDurableObject"]
    }
  ]
}
```

This configuration adds:
- **`REALTIME_DURABLE_OBJECT`**: Built-in RedwoodSDK class that handles WebSocket connections and real-time updates
- **`POLL_DURABLE_OBJECT`**: Custom class you'll create to manage poll vote counting with fast in-memory updates
- **Migration v2**: Creates the new Durable Object classes alongside the existing session management

**The framework advantage:** Unlike the Cloudflare Workers version where you had to manually create both Durable Object classes, RedwoodSDK provides the `RealtimeDurableObject` built-in. You only need to create the poll-specific one, cutting your Durable Object code in half.

### Setting Up the Database Schema

**Database simplification:** RedwoodSDK uses Prisma for database management, which means you define your schema declaratively instead of writing SQL migrations. Your fresh project already includes User and Credential models for authentication (which you had to build from scratch in Cloudflare Workers), but we need to add polling functionality.

Compare this to the Cloudflare Workers approach where you wrote a 50-line SQL migration file. Here you'll define the same schema in just a few lines of Prisma syntax.

Update your `prisma/schema.prisma` file by adding the polls relationship to the User model and the new Poll and Choice models:

```prisma
// Add these new models:
model Poll {
  id        String   @id @default(uuid())
  title     String
  createdAt DateTime @default(now())

  choices Choice[]
}

model Choice {
  id     String @id @default(uuid())
  pollId String
  poll   Poll   @relation(fields: [pollId], references: [id], onDelete: Cascade)
  text   String
  color  String
  votes  Int    @default(0)

  @@index([pollId])
}
```

Generate the Prisma client and TypeScript types:

```bash
npm run migrate:new "Polling Migration"
```

This command creates a migration, generates the Prisma database client, creates TypeScript types, and sets up all the database configuration. The database itself will be created automatically when you first run the development server.

Compare this to the Cloudflare Workers setup where you manually wrote SQL migrations, configured database bindings, and created TypeScript interface definitions across multiple files.

### Building the Backend Worker

**The key difference:** Instead of building a large main worker file like you did with Cloudflare Workers, RedwoodSDK's approach is declarative. You'll add just a few route definitions and the framework handles all the infrastructure including authentication middleware, error handling, request parsing, and response formatting.

Notice how much simpler this becomes. Where Cloudflare Workers required manual route matching and authentication checks, RedwoodSDK provides this automatically.

First, add the real-time and polling imports to your `src/worker.tsx`. Add these lines after the existing imports:

```typescript
import { realtimeRoute, renderRealtimeClients } from "rwsdk/realtime/worker";
import { createPoll } from "./app/pages/polls/functions";
import Poll from "./app/pages/polls/Poll";
```

Also update the router import on line 2 to include `index`:

```typescript
import { index, route, render, prefix } from "rwsdk/router";
```

Add these exports after the existing `SessionDurableObject` export:

```typescript
export { RealtimeDurableObject } from "rwsdk/realtime/durableObject";
export { PollDurableObject } from "./pollDurableObject";
```

Add the real-time route to the `defineApp` array after `setCommonHeaders()`:

```typescript
realtimeRoute(() => env.REALTIME_DURABLE_OBJECT),
```

Add this route after the database setup middleware and before the `render` function:

```typescript
route("/api/poll/create", async ({ request }) => {
  if (request.method !== "POST") {
    return new Response(null, { status: 405 });
  }

  try {
    const data = await request.json();
    await createPoll(data);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to create poll" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}),
```

Add this route right after the poll creation route:

```typescript
route("/api/poll/:pollId/vote/:choiceId", async ({ request, params }) => {
  if (request.method !== "POST") {
    return new Response(null, { status: 405 });
  }

  const { pollId, choiceId } = params as { pollId: string; choiceId: string };

  try {
    const doId = env.POLL_DURABLE_OBJECT.idFromName(pollId);
    const pollDO = env.POLL_DURABLE_OBJECT.get(doId);
    await pollDO.vote(choiceId);

    await renderRealtimeClients({
      durableObjectNamespace: env.REALTIME_DURABLE_OBJECT,
      key: `/poll/${pollId}`,
    });

    return new Response(null, { status: 200 });
  } catch (error) {
    return new Response(null, { status: 500 });
  }
}),
```

Finally, update the render routes. Replace the existing routes in the `render(Document, [...])` array with:

```typescript
    route("/", Home),
    route("/poll/:pollId", Poll),
    prefix("/user", userRoutes),
```

**What you just built:** Your worker now includes two API endpoints for poll creation and voting, plus the real-time route that enables live updates. Notice that this entire backend is declarative with just route definitions and function calls. The framework provides built-in solutions for the infrastructure patterns you manually implemented in Cloudflare Workers:

- **No manual route matching** with just `route("/api/poll/create", ...)`
- **No authentication middleware** because the framework handles sessions automatically
- **No error handling boilerplate** because try/catch blocks are handled by the framework
- **No response formatting** as you just return data and RedwoodSDK handles JSON responses

### Setting Up the Real-Time Client

Now you need to update the client-side code to enable real-time functionality. RedwoodSDK's real-time client automatically handles WebSocket connections and page updates when data changes.

Update the existing `src/client.tsx` file. Replace the basic client initialization:

```typescript
import { initClient } from "rwsdk/client";

initClient();
```

With the real-time client initialization:

```typescript
import { initRealtimeClient } from "rwsdk/realtime/client";
import "./styles.css";

// Initialize realtime client with current pathname as key
initRealtimeClient({
  key: window.location.pathname,
});
```

This change tells RedwoodSDK to:
- Establish a WebSocket connection to your worker's real-time route
- Use the current pathname as the real-time "key" to group related clients together
- Automatically re-render React server components when `renderRealtimeClients()` is called

The `key` parameter determines which clients receive updates together. For our polling app, using `window.location.pathname` means:
- All users viewing `/poll/123` will be in the same real-time group
- When someone votes on poll 123, all viewers of that poll get live updates
- Users on different poll pages don't receive updates for polls they're not viewing

**Real-time made simple:** This is much simpler than the Cloudflare Workers version where you had to manually manage WebSocket connections, handle connection lifecycle events, and coordinate message broadcasting between different Durable Objects.

With RedwoodSDK, real-time features require just these three lines of setup. The framework automatically handles connection management, reconnection logic, message parsing, and page re-rendering when data changes.

> **⚠️ Experimental Feature**
> RedwoodSDK's real-time functionality is currently experimental. It works well for collaborative apps and live notifications, but the RedwoodSDK team is still gathering feedback on edge cases and advanced use scenarios.

### Creating the Poll Durable Object

Create `src/pollDurableObject.ts` to handle vote counting:

```typescript
import { DurableObject } from "cloudflare:workers";

export type PollVoteData = {
  [choiceId: string]: number;
};

export class PollDurableObject extends DurableObject {
  private state: DurableObjectState;
  private votes: PollVoteData | undefined;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.state = state;
    this.votes = undefined;
  }

  async getVotes(): Promise<PollVoteData> {
    return (this.votes ??=
      (await this.state.storage.get<PollVoteData>("votes")) ?? {});
  }

  async vote(choiceId: string): Promise<PollVoteData> {
    const currentVotes = await this.getVotes();
    this.votes = {
      ...currentVotes,
      [choiceId]: (currentVotes[choiceId] ?? 0) + 1
    };
    await this.state.storage.put<PollVoteData>("votes", this.votes);
    return this.votes;
  }
}
```

**Simpler Durable Objects:** This Durable Object handles the vote counting in memory with persistence to storage, providing fast increments without database writes on every vote.

Notice this is only 25 lines compared to the 180+ lines you wrote for Cloudflare Workers. You only need to implement the poll-specific logic because the framework provides the WebSocket handling that you had to build manually before.

### Creating the React Components

Now update the existing `src/app/pages/Home.tsx` to handle polling functionality:

```typescript
import { RequestInfo } from "rwsdk/worker";
import { getAllPolls } from "./polls/functions";
import { PollForm } from "./polls/PollForm";

export async function Home() {
  const polls = await getAllPolls();

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Voting Polls</h1>
      </div>

      <p className="dashboard-description">
        Create new voting polls and share them with others.
      </p>

      <PollForm />

      {polls.length > 0 ? (
        <div>
          <h2 style={{ marginTop: "3rem", marginBottom: "1rem" }}>All Polls</h2>
          <div className="poll-list">
            {polls.map(poll => (
              <div key={poll.id} className="poll-list-item">
                <h3 className="poll-list-title">
                  {poll.title}
                </h3>
                <div className="poll-choices-preview">
                  {poll.choices.map(choice => (
                    <span key={choice.id} className="poll-choice-tag" style={{
                      background: choice.color
                    }}>
                      {choice.text}: {choice.votes} votes
                    </span>
                  ))}
                </div>
                <a
                  href={`/poll/${poll.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="poll-view-link"
                >
                  View Poll →
                </a>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="centered-content">
          <p>No polls created yet. Use the form above to create the first poll!</p>
        </div>
      )}
    </div>
  );
}
```

This server component fetches all polls from the database without requiring authentication.

Create `src/app/pages/polls/PollForm.tsx` for poll creation:

```typescript
"use client";

import { useState, useTransition } from "react";
import { createPoll } from "./functions";

type Choice = {
  text: string;
  color: string;
};

export function PollForm() {
  const [title, setTitle] = useState("");
  const [choices, setChoices] = useState<Choice[]>([
    { text: "", color: "#007cba" },
    { text: "", color: "#dc3545" }
  ]);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState("");

  const addChoice = () => {
    const colors = ["#28a745", "#ffc107", "#6f42c1", "#fd7e14", "#e83e8c", "#20c997"];
    const nextColor = colors[choices.length % colors.length];
    setChoices([...choices, { text: "", color: nextColor }]);
  };

  const removeChoice = (index: number) => {
    if (choices.length > 2) {
      setChoices(choices.filter((_, i) => i !== index));
    }
  };

  const updateChoice = (index: number, field: keyof Choice, value: string) => {
    const updated = choices.map((choice, i) =>
      i === index ? { ...choice, [field]: value } : choice
    );
    setChoices(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setResult("Please enter a poll title");
      return;
    }

    const validChoices = choices.filter(c => c.text.trim());
    if (validChoices.length < 2) {
      setResult("Please enter at least 2 choices");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/poll/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            choices: validChoices
          })
        });

        if (response.ok) {
          setTitle("");
          setChoices([
            { text: "", color: "#007cba" },
            { text: "", color: "#dc3545" }
          ]);
          setResult("Poll created successfully!");

          // Reload page to show new poll in the list
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } else {
          setResult("Failed to create poll");
        }
      } catch (error) {
        setResult("Error creating poll");
      }
    });
  };

  return (
    <div className="poll-form-container">
      <h2 className="poll-form-title">Create New Poll</h2>

      <form onSubmit={handleSubmit}>
        <div className="poll-form-section">
          <label className="poll-form-label">
            Poll Title:
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What would you like to ask?"
            className="poll-form-input"
          />
        </div>

        <div className="poll-form-section">
          <label className="poll-form-label">
            Choices:
          </label>
          {choices.map((choice, index) => (
            <div key={index} className="poll-form-input-flex">
              <input
                type="text"
                value={choice.text}
                onChange={(e) => updateChoice(index, "text", e.target.value)}
                placeholder={`Choice ${index + 1}`}
                className="poll-form-input-text"
              />
              <input
                type="color"
                value={choice.color}
                onChange={(e) => updateChoice(index, "color", e.target.value)}
                className="poll-form-color-input"
              />
              {choices.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeChoice(index)}
                  className="poll-form-button-danger"
                >
                  Remove
                </button>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={addChoice}
            disabled={choices.length >= 8}
            className={`poll-form-button-secondary ${choices.length >= 8 ? 'disabled' : ''}`}
          >
            Add Choice ({choices.length}/8)
          </button>
        </div>

        <div className="poll-form-actions">
          <button
            type="submit"
            disabled={isPending}
            className={`poll-form-button-primary ${isPending ? 'disabled' : ''}`}
          >
            {isPending ? "Creating..." : "Create Poll"}
          </button>

          {result && (
            <span className={`poll-form-result ${result.includes("successfully") ? 'success' : 'error'}`}>
              {result}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
```

This component uses React's `useTransition` for better UX during form submission and includes proper form validation.

Create `src/app/pages/polls/Poll.tsx` for the real-time voting interface:

```typescript
import { RequestInfo } from "rwsdk/worker";
import { getPoll } from "./functions";
import { VoteButtons } from "./VoteButtons";
import { getPollVotes } from "./pollFunctions";

const Poll = async ({ params }: RequestInfo<{ pollId: string }>) => {
  const pollId = params.pollId;
  const poll = await getPoll(pollId);

  if (!poll) {
    return (
      <div className="error-container">
        <h1 className="error-title">Poll Not Found</h1>
        <p className="error-message">The poll you're looking for doesn't exist.</p>
        <a href="/" className="login-link">
          Go Home
        </a>
      </div>
    );
  }

  const votes = await getPollVotes(pollId);

  // Update choice votes from durable object
  const choicesWithVotes = poll.choices.map(choice => ({
    ...choice,
    votes: votes[choice.id] || 0
  }));

  const totalVotes = choicesWithVotes.reduce((sum, choice) => sum + choice.votes, 0);

  return (
    <div className="poll-page-container">
      <h1 className="poll-title">
        {poll.title}
      </h1>

      <p className="poll-subtitle">
        Vote and watch the results update live!
      </p>

      <div className="poll-choices-grid">
        {choicesWithVotes.map(choice => {
          const percentage = totalVotes > 0 ? Math.round((choice.votes / totalVotes) * 100) : 0;

          return (
            <div key={choice.id} className="poll-choice-card" style={{
              border: `3px solid ${choice.color}`
            }}>
              <h2 className="poll-choice-title" style={{
                color: choice.color
              }}>
                {choice.text}
              </h2>
              <div className="poll-choice-votes" style={{
                color: choice.color
              }}>
                {choice.votes}
              </div>
              <div className="poll-choice-percentage">
                {percentage}%
              </div>

              <div className="poll-progress-bar">
                <div className="poll-progress-fill" style={{
                  width: `${percentage}%`,
                  background: choice.color
                }} />
              </div>
            </div>
          );
        })}
      </div>

      <VoteButtons pollId={pollId} choices={choicesWithVotes} />

      <p className="poll-stats">
        Total votes: {totalVotes} • Results update live across all devices!
      </p>

      <div style={{ marginTop: "2rem" }}>
        <a href="/" className="poll-back-link">
          Create Your Own Poll
        </a>
      </div>
    </div>
  );
};

export default Poll;
```

This server component fetches poll data and integrates with the Durable Object to get real-time vote counts. RedwoodSDK's `renderRealtimeClients` in the worker handles the real-time updates.

Finally, create `src/app/pages/polls/VoteButtons.tsx`:

```typescript
"use client";

import { useState, useTransition } from "react";

type Choice = {
  id: string;
  text: string;
  color: string;
  votes: number;
};

type VoteButtonsProps = {
  pollId: string;
  choices: Choice[];
};

export function VoteButtons({ pollId, choices }: VoteButtonsProps) {
  const [isPending, startTransition] = useTransition();
  const [lastVoted, setLastVoted] = useState<string | null>(null);

  const handleVote = async (choiceId: string) => {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/poll/${pollId}/vote/${choiceId}`, {
          method: "POST"
        });

        if (response.ok) {
          setLastVoted(choiceId);
          // The page will reload automatically due to realtime updates
        }
      } catch (error) {
        console.error("Failed to vote:", error);
      }
    });
  };

  return (
    <div className="vote-buttons-container">
      {choices.map(choice => (
        <button
          key={choice.id}
          onClick={() => handleVote(choice.id)}
          disabled={isPending}
          className="vote-button"
          style={{
            background: choice.color,
            opacity: isPending ? 0.6 : 1,
            transform: lastVoted === choice.id ? "scale(1.05)" : "scale(1)"
          }}
          onMouseOver={(e) => {
            if (!isPending) {
              e.currentTarget.style.transform = "scale(1.05)";
              e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
            }
          }}
          onMouseOut={(e) => {
            if (!isPending) {
              e.currentTarget.style.transform = lastVoted === choice.id ? "scale(1.05)" : "scale(1)";
              e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
            }
          }}
        >
          {isPending && lastVoted === choice.id ? "Voting..." : `Vote ${choice.text}`}
        </button>
      ))}
    </div>
  );
}
```

This component uses React's `useTransition` for smooth voting UI and automatically triggers page reloads through RedwoodSDK's real-time system.

### Creating Server Functions

Now create the server functions that handle database operations. Create `src/app/pages/polls/functions.ts`:

```typescript
"use server";

import { db } from "@/db";

export type CreatePollData = {
  title: string;
  choices: Array<{ text: string; color: string }>;
};

export const createPoll = async (data: CreatePollData) => {
  const pollId = crypto.randomUUID();

  const poll = await db.poll.create({
    data: {
      id: pollId,
      title: data.title,
      choices: {
        create: data.choices.map(choice => ({
          id: crypto.randomUUID(),
          text: choice.text,
          color: choice.color,
          votes: 0
        }))
      }
    },
    include: {
      choices: true
    }
  });

  return poll;
};

export const getAllPolls = async () => {
  return await db.poll.findMany({
    include: {
      choices: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
};

export const getPoll = async (pollId: string) => {
  return await db.poll.findUnique({
    where: {
      id: pollId
    },
    include: {
      choices: true
    }
  });
};
```

And create `src/app/pages/polls/pollFunctions.ts` for interacting with the Durable Object:

```typescript
"use server";

import { env } from "cloudflare:workers";
import { PollVoteData } from "../../../pollDurableObject";

export const getPollVotes = async (pollId: string): Promise<PollVoteData> => {
  const doId = env.POLL_DURABLE_OBJECT.idFromName(pollId);
  const pollDO = env.POLL_DURABLE_OBJECT.get(doId);
  return pollDO.getVotes();
};
```

**Server functions advantage:** These server functions use the `"use server"` directive to run on the server-side and handle database operations with Prisma and Durable Object interactions.

Compare this to the Cloudflare Workers approach where you had to manually write SQL queries, handle database connections, and manage error states. Here, Prisma provides type-safe database operations and the framework handles the server/client boundary automatically.

### Adding Styling

For the complete CSS styling, copy the styles from the `src/styles.css` file in [this repository](https://github.com/ritza-co/cloudflare-and-redwood-realtime-apps/blob/master/redwood-polling-app/src/styles.css) and place it in your `src/` directory.

### Testing the RedwoodSDK App

Start the development server:

```bash
npm run dev
```

The development environment automatically sets up your database, applies migrations, and starts the server. No configuration needed.

Open your browser to `http://localhost:5173` and you'll see the same polling functionality, but notice how much less code you wrote to achieve it.

**Testing real-time functionality:**

1. Create a poll with multiple choices and different colors
2. Copy the poll URL by clicking "View Poll →" next to any poll
3. **Open a new private/incognito browser window** and navigate to the poll URL
4. **Share the poll URL** with others or open in multiple browser tabs
5. Vote from different browsers and watch the **automatic page updates**

**What's happening behind the scenes:** When you vote in RedwoodSDK, the client calls the `/api/poll/pollId/vote/choiceId` route, which triggers `renderRealtimeClients()` in the worker. This automatically sends a message to all connected WebSocket clients viewing the same poll path. The `initRealtimeClient()` in your browser receives this message and **automatically re-renders the entire page** to show updated vote counts with no manual WebSocket message handling required.

RedwoodSDK's real-time system eliminates the need for custom WebSocket management, giving you live updates with minimal code.

**What you've accomplished with RedwoodSDK:**

- **Minimal backend code** in a single worker file (vs. extensive code across multiple files)
- **Simple custom Durable Object** (vs. complex manual implementations)
- **Zero authentication code** (vs. substantial custom auth implementation)
- **Declarative database schema** (vs. manual SQL migrations)
- **Automatic real-time updates** (vs. manual WebSocket management)

You built the exact same application with significantly less code. Every infrastructure pattern is provided by the framework, letting you focus on your application logic rather than platform plumbing.

<video width="100%" controls style={{maxWidth: '100%'}}>
  <source src="/assets/cloudflare-rwsdk-real-time/real-time-polling-app.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

## The Developer Experience Verdict

Both applications deliver identical functionality to your users: real-time voting, persistent data storage, and live updates across devices. They run on the same Cloudflare Workers infrastructure with the same performance characteristics. The difference is entirely in your development experience.

### What RedwoodSDK Brings to the Table

RedwoodSDK significantly reduces the code required for identical functionality. You get a zero-config development environment with built-in authentication, real-time features, and database management. The framework handles infrastructure complexity that you'd otherwise manage manually.

### The Tradeoffs to Consider

RedwoodSDK follows a "zero magic" philosophy with minimal abstraction over Cloudflare Workers. The framework generates standard Cloudflare Workers code and uses native Web APIs directly. The main tradeoff is framework dependency for infrastructure decisions, but you maintain full visibility into the underlying code.

### When to Choose RedwoodSDK

RedwoodSDK excels when you want React server components, automatic real-time features, and built-in authentication while maintaining platform transparency. It's designed for developers who understand Cloudflare Workers but want framework-provided solutions for common patterns like WebSocket management and user sessions.

### When to Stick with Cloudflare Workers

Choose Cloudflare Workers when you're building custom infrastructure patterns that don't fit standard web application models, or when you want to learn the platform primitives from first principles. RedwoodSDK assumes you want React-based server rendering and real-time capabilities.

## Further Reading

### Cloudflare Workers Resources

If you want to dive deeper into Cloudflare Workers development, explore the [Cloudflare Workers documentation](https://developers.cloudflare.com/workers/). The [Durable Objects guide](https://developers.cloudflare.com/durable-objects/) provides comprehensive coverage of stateful edge computing patterns.

### RedwoodSDK Documentation

Learn more about RedwoodSDK's capabilities at the [official documentation](https://docs.rwsdk.com). The [getting started guide](https://docs.rwsdk.com/getting-started) covers project setup, while the [React server components documentation](https://docs.rwsdk.com/react-server-components) explains how real-time features work under the hood.

### Related Technologies

To understand the broader ecosystem, check out [React Server Components](https://react.dev/blog/2023/03/22/react-labs-what-we-have-been-working-on-march-2023#react-server-components) from the React team and [Prisma's documentation](https://www.prisma.io/docs) for advanced database patterns that work with both approaches.