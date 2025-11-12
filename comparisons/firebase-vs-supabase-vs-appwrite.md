---
slug: firebase-vs-supabase-vs-appwrite
title: "Firebase vs Supabase vs Appwrite: We Built the Same App Three Times"
description: "Building a shopping list app on Firebase, Supabase, and Appwrite to compare setup experience, database models, security approaches, and developer tooling."
authors: [simpletechguides]
tags: [backend, firebase, supabase, appwrite, baas, comparison, real-time, authentication, database]
keywords: [firebase vs supabase vs appwrite, baas comparison, backend as a service, firestore vs postgres, firebase security rules, supabase rls, appwrite permissions]
image: /img/comparisons/signoz-datadog-grafana/cover.png
---

Most Firebase vs Supabase comparisons show you a signup form and a database insert. Then they declare a winner based on which syntax looks prettier.

We wanted to know which platform makes building actual features easier. So we built the same collaborative shopping list app three times: once on Firebase, once on Supabase, and once on Appwrite.

<!--truncate-->

Same React frontend. Same features (authentication, real-time updates, email invitations, public read-only sharing). Three completely different backends.

![Grocery Share showing a list shared with collaborators](/img/comparisons/firebase-supabase-appwrite/grocery-share-share-feature.png)

What we found is that these platforms solve the same problems in fundamentally different ways. Firebase's onboarding gets you writing code immediately, but you'll hit a learning curve when you need to look up users by email. Supabase gives you the full power of PostgreSQL, but you'll need to understand Row Level Security policies and debug circular dependency errors. Appwrite's imperative permissions feel natural if you're used to setting properties in code, but you'll be managing access control manually in every create and update function.

In this comparison, we'll walk through the setup experience for each platform, examine how their database models differ, show you their security implementations with real code, compare their developer tooling (including MCP support for AI assistants), and explain which use cases each platform handles best.

By the end, you'll understand which platform matches your experience level and project requirements.

## What We Built

We built a collaborative shopping list app called [Grocery Share](https://github.com/ritza-co/grocery-share). You can create lists, invite people by email to edit them, or generate public read-only links to share with anyone.

<video width="100%" controls>
  <source src="/img/comparisons/firebase-supabase-appwrite/groceryshare-app-demo.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

The app lets you:

- Create an account with email and password
- Make shopping lists and add items you can check off
- Invite collaborators by email (they get full edit access)
- Generate public links for read-only sharing
- See updates instantly when someone else edits the list


These features force you to deal with each platform's security model. Multi-user permissions, real-time syncing, and email lookups reveal how platforms actually work when you build something beyond a todo list tutorial.

## The Platforms

We implemented the same app on three different platforms:

**[Firebase](https://firebase.google.com/)** - Google's backend platform that uses Firestore, a NoSQL document database.

**[Supabase](https://supabase.com/)** - An open-source alternative built on PostgreSQL with full relational database capabilities.

**[Appwrite](https://appwrite.io/)** - Another open-source option that uses a document-based database with built-in relationship support.

## Setup

Now that we've covered the basics of each platform, let's have a look into the setup process for each one.

### Firebase

Firebase gets you from zero to writing code quickly. Create a project and you're ready to start within seconds.

The setup wizard walks you through adding Firebase to your web app:

![Firebase onboarding showing the SDK setup](/img/comparisons/firebase-supabase-appwrite/firebase-config-onboarding.png)

You register your app, pick npm or a script tag, and Firebase shows you the exact code to copy. The config object has your API key, project ID, and auth domain already filled in. Copy it to your `.env` file and you're connected.

Enable Email/Password authentication in the console and you're ready to start building.

#### Database Setup

With Firebase, you don't create a database. You don't define a schema. Install the SDK, start writing to a collection, and Firestore creates it automatically.

Here's what the database looks like once you've added some data:

![Firebase Firestore database showing collections and documents](/img/comparisons/firebase-supabase-appwrite/firebase-db-view.png)

You can see the three-panel layout. Left side shows collections (`lists` and `users`). Middle shows documents in the selected collection. Right side shows the fields in the selected document.

The `lists` collection has documents with fields like `name`, `ownerId`, `collaborators` (an array of user IDs), `publicReadable` (boolean), and `publicId` (for sharing).

This is a NoSQL document database. Collections contain documents. Documents are JSON-like objects. You can nest collections inside documents (subcollections).

For the shopping list app:
- A `lists` collection where each document is one list
- An `items` subcollection under each list document
- A `users` collection to look up people by email

There are no foreign keys. No constraints. If you delete a list, you manually delete its items subcollection unless you write a Cloud Function to do it automatically.

This works well because you don't need any upfront planning. You start writing data and the database appears. This makes Firebase great for prototyping.

The limitation is that Firestore doesn't enforce relationships. You can end up with orphaned data if you're not careful about cleaning up. Arrays for collaborators also don't scale well past about 1000 users per list.

The auth view is straightforward:

![Firebase authentication showing user list](/img/comparisons/firebase-supabase-appwrite/firebase-auth-table-view.png)

You can see users with their UIDs, sign-in providers, creation dates, and last sign-in times. Manual user management is simple from here.

#### Security Model

Firebase uses a declarative rules file for security. You write `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /lists/{listId} {
      allow read: if request.auth != null &&
        (resource.data.ownerId == request.auth.uid ||
         request.auth.uid in resource.data.collaborators ||
         resource.data.publicReadable == true);

      allow write: if request.auth != null &&
        resource.data.ownerId == request.auth.uid;

      match /items/{itemId} {
        allow read, write: if request.auth != null &&
          (get(/databases/$(database)/documents/lists/$(listId)).data.ownerId == request.auth.uid ||
           request.auth.uid in get(/databases/$(database)/documents/lists/$(listId)).data.collaborators);
      }
    }
  }
}
```

Rules apply to all documents in a collection. You write them once, deploy them, and they enforce security on every query.

You can test rules in the Firebase emulator before deploying to production. This is genuinely useful when you're checking complex permission logic.

The rules approach works well because all your security logic lives in one file. This makes it easy to audit what permissions exist across your entire app. The rules file is also version controlled alongside your code.

The tricky part is learning the rules syntax. It's its own domain-specific language. Using `get()` calls inside rules (like checking the parent list's permissions for items in a subcollection) can also slow down queries since each rule evaluation needs to fetch additional documents.

#### Email Invites

The most complex feature to implement on Firebase is email invitations. Firestore doesn't expose user lookups by email, so you need to create a separate `users` collection that mirrors the auth data. When someone signs up, you write their email to `users/{uid}/email`. When inviting a collaborator, you query this collection to find the user ID.

This works, but it feels like a workaround. You're maintaining duplicate user data just to enable a basic feature. If auth data and the users collection get out of sync, your invite feature breaks.

### Supabase

Supabase gives you a real PostgreSQL database behind a nice UI. Create a project and wait for provisioning to complete.

![Supabase project creation screen](/img/comparisons/firebase-supabase-appwrite/supabase-create-project.png)

Pick a region, set a database password (you'll need this for direct Postgres connections), and wait. The free tier pauses after a week of inactivity, but you can unpause instantly when you need it.

#### Database Setup

Supabase's Table Editor shows you a spreadsheet-like view of your PostgreSQL tables:

![Supabase table editor showing the items table](/img/comparisons/firebase-supabase-appwrite/supabase-table-view-postgres.png)

You can see tables in the left sidebar (`items`, `list_collaborators`, `lists`). The main view shows the `items` table data with columns for `id`, `list_id`, `name`, `checked`, and `created_at`.

Notice the "Referencing record from public.lists" section at the bottom. This shows the foreign key relationship. The `list_id` column references the `lists` table. Click "Open table" and it jumps to the parent list.

This is a relational database. You define tables with foreign keys:

```sql
CREATE TABLE lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  public_id UUID UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID REFERENCES lists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  checked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE list_collaborators (
  list_id UUID REFERENCES lists(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (list_id, user_id)
);
```

The `ON DELETE CASCADE` means when you delete a list, all its items and collaborators are automatically removed. The database enforces data integrity.

For collaborators, we used a junction table (`list_collaborators`) instead of an array. This is the standard relational approach for many-to-many relationships.

The connection configuration shows your database credentials:

![Supabase connection config showing project URL and keys](/img/comparisons/firebase-supabase-appwrite/supabase-connection-config.png)

You copy the project URL and anon key to your `.env` file. That's it for client setup - just two environment variables compared to Firebase's seven.

#### Security Model

Supabase security happens at the database level with Row Level Security (RLS) policies. These are SQL statements that run on every query:

```sql
-- Users can view lists they own
CREATE POLICY "Users can view owned lists"
  ON lists FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

-- Users can view lists shared with them
CREATE POLICY "Users can view shared lists"
  ON lists FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM list_collaborators
      WHERE list_id = lists.id AND user_id = auth.uid()
    )
  );

-- Public lists are viewable by anyone with the link
CREATE POLICY "Anyone can view public lists"
  ON lists FOR SELECT
  TO authenticated
  USING (public_id IS NOT NULL);
```

Policies run at the database level. Even if someone connects directly to Postgres (not through your app), the policies apply. This is stronger security than client-side enforcement.

**The debugging challenge:** We hit a circular dependency error (`42P17: infinite recursion detected`). The `lists` policies checked the `list_collaborators` table, and the `list_collaborators` policies checked the `lists` table. PostgreSQL caught the loop and rejected it.

The fix was simplifying the `list_collaborators` policies to break the cycle. You need to read the error messages carefully and test different policy combinations until you find one that doesn't create circular references.

Supabase's RLS approach has real advantages. The security is enforced at the database level, which means it's impossible to bypass from the client. Even if someone connects directly to your PostgreSQL database, the policies still apply. Supabase also auto-generates API documentation from your schema, which is helpful.

The hard part is debugging policies. There's no "test this policy" button in the UI. You write queries, they fail with permission errors, you adjust the policies, and repeat. The SQL Editor becomes your main debugging tool.

#### Email Confirmation During Testing

When you start testing authentication by creating user accounts, Supabase sends a confirmation email by default:

![Supabase email confirmation in Gmail](/img/comparisons/firebase-supabase-appwrite/supabase-email-confirm.png)

This is enabled out of the box. For production apps, this is exactly what you want. For local development, you'll want to disable it in the auth settings (Authentication → Providers → Email → Confirm email) so you can test without checking your inbox every time.

The confirmation emails come from Supabase's servers (`noreply@mail.app.supabase.io`). They look professional and just work. Firebase also supports email confirmation, but it's optional and requires setting up email templates manually.

#### Email Invites with RLS

Email invitations require the most complexity on Supabase. You need to write a PostgreSQL RPC function to look up users by email (clients can't query `auth.users` directly for security reasons). Then you insert records into the `list_collaborators` junction table. Then you debug the RLS circular dependency we mentioned earlier. Then you make sure the junction table inserts work correctly with your policies.

The result is solid. Foreign keys enforce referential integrity. RLS policies protect access at the database level. But getting there requires understanding PostgreSQL, SQL functions, and RLS policy debugging.

### Appwrite

Appwrite has the friendliest onboarding. Create a project and immediately pick your platform:

![Appwrite platform selection modal](/img/comparisons/firebase-supabase-appwrite/appwrite-create-project.png)

You choose your framework (React, Vue, Next.js, or vanilla JavaScript), enter `localhost` for local development, and click Create Platform. There's no provisioning wait and no complex config object to copy. You just get a project ID and endpoint URL, and you're ready to go.

#### Database Setup

Appwrite's database view shows collections and attributes in a clean table:

![Appwrite database showing the items collection](/img/comparisons/firebase-supabase-appwrite/appwrite-database-view.png)

You can see the `items` collection with its columns: `$id` (auto-generated), `name` (string), `checked` (boolean), `createdAt` (datetime), `list` (relationship), and the automatic `$createdAt` and `$updatedAt` timestamps.

The `list` column shows "Type: Many to one" which means many items belong to one list. Appwrite handles this relationship visually - you click "Create relationship attribute," pick the target collection, choose the relationship type, and it's set up.

The frustrating part of Appwrite is the UI-based table creation. You add attributes one at a time. Click "+ Create column." Choose the type (string, boolean, number, datetime, relationship). Set the size and whether it's required. Click Create. Then repeat for every field.

For a collection with 10 fields, this becomes tedious fast. The alternative is using the Appwrite CLI to define collections in JSON and deploy them with one command. This is more efficient, but it means learning another tool and switching workflows.

The auth view shows users clearly:

![Appwrite authentication view](/img/comparisons/firebase-supabase-appwrite/appwrite-auth-view.png)

You see user IDs, names (if set), email identifiers, verification status, and join dates. The "Create user" button is right there for manual account creation during testing.

#### Security Model

Appwrite stores permissions with each document in a `$permissions` array. You set them when creating documents:

```javascript
await databases.createDocument(
  databaseId,
  'lists',
  ID.unique(),
  { name: 'Groceries', ownerId: userId },
  [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId))
  ]
);
```

To share with a collaborator, you update the permissions:

```javascript
const list = await databases.getDocument(databaseId, 'lists', listId);
const newPermissions = [
  ...list.$permissions,
  Permission.read(Role.user(collaboratorId)),
  Permission.update(Role.user(collaboratorId))
];

await databases.updateDocument(
  databaseId,
  'lists',
  listId,
  {},
  newPermissions
);
```

For public sharing:

```javascript
const publicPermissions = [
  ...list.$permissions,
  Permission.read(Role.any())  // Anyone can read
];
```

This is an imperative approach where you write code to set permissions. This contrasts with Firebase's declarative rules file or Supabase's database-level RLS policies.

The nice thing about Appwrite's approach is that permissions are visible in the console. You can click a document and see exactly who has access to it. Debugging is straightforward - if someone can't access data, you just check the `$permissions` array.

The repetitive part is that every `createDocument` call needs to include permissions. Every new feature means thinking through and setting permissions in code. This is flexible, but it means permission logic is scattered across your codebase instead of centralized in one file.

When you query documents, Appwrite automatically filters based on the current user's permissions. Call `listDocuments()` and you only get back what you can access. No need to write separate queries for owned vs shared lists like in Supabase.

#### Email Invites

Email invitations are the simplest feature to implement on Appwrite. You look up the user by email via the Users API, add their ID to the document's permissions, and you're done. There's no junction table to set up and no RLS policy debugging. You just update the permissions array.

This directness is Appwrite's strength. There's less ceremony and fewer layers between your code and the operation you want to perform.

## MCP Support

If you use Claude Code or other AI tools that support MCP (Model Context Protocol), this feature matters.

### Supabase

Supabase has an official MCP server. In your project's connection settings, there's an MCP tab that gives you the configuration for connecting AI assistants:

![Supabase MCP connection tab](/img/comparisons/firebase-supabase-appwrite/supabase-mcp-connection.png)

This provides the setup instructions and credentials you need to connect your MCP client (like Claude Code) to your Supabase project. Once you've configured it in your AI assistant, it connects to your database with the permissions you specify.

![Supabase MCP server connected in Claude Code](/img/comparisons/firebase-supabase-appwrite/supabase-mcp-server-tool-cli.png)

Once connected, your AI assistant can:
- Run SQL queries against your tables
- Inspect your database schema and relationships
- Read and analyze RLS policies
- Check function definitions
- View server logs

This is useful when debugging RLS policies. We asked Claude "why can't user X see this list?" and it queried the `list_collaborators` table, checked the RLS policies, and found that the policy only allowed SELECT but we needed to enable INSERT for the collaborators table.

### Appwrite

Appwrite has an official MCP server that integrates with Claude Code and other MCP clients:

![Appwrite MCP server](/img/comparisons/firebase-supabase-appwrite/appwrite-mcp.png)

The Appwrite MCP server lets you:
- List projects, databases, and collections
- Query documents directly
- Inspect document permissions
- Manage users and sessions
- Create and update documents
- Execute database operations

You connect it with your Appwrite project endpoint and API key. Once connected, your AI assistant can help you debug permissions, query your data, and understand your schema. We used it to check document permissions when debugging access issues, and it was helpful for understanding why certain users could or couldn't access specific documents.

### Firebase

Firebase doesn't have an MCP server. You can paste error messages and code snippets into Claude for help, but it can't connect directly to your Firestore database or read your security rules.

For teams using AI pair programming tools heavily, this is a noticeable gap. Supabase's MCP integration makes debugging RLS policies easier by letting your AI assistant query the database directly and analyze policies.

## Hosting Options

### Firebase

Firebase includes built-in hosting for static sites. Deploy your React build with `firebase deploy`:

![Firebase Hosting dashboard](/img/comparisons/firebase-supabase-appwrite/optional-firebase-hosting.png)

You get:
- Free SSL certificates
- Global CDN across Google's edge network
- Preview channels for pull requests
- GitHub Actions integration for CI/CD
- Rollback to previous deployments

This works well if you're building a single-page app where Firebase is already handling your backend. One command deploys both your Firestore rules and your frontend build.

### Appwrite

Appwrite Cloud recently added static site hosting (currently in beta):

![Appwrite hosting dashboard](/img/comparisons/firebase-supabase-appwrite/optional-appwrite-hosting.png)

You upload your build folder via the dashboard or CLI. SSL is configured automatically, and you can set environment variables per deployment.

This feature is newer than Firebase Hosting and still has some rough edges (the documentation is minimal). But it works well enough for simple React or Vue builds, and it's convenient if you want everything in one Appwrite project.

### Supabase

Supabase focuses on the backend. For your frontend, you'll need to use Vercel, Netlify, Cloudflare Pages, or another static hosting provider.

This means an extra service to manage, though most teams already have a preferred frontend deployment workflow. If you want everything in one platform, Firebase or Appwrite makes more sense.

## Database Models Compared

### Firebase

```javascript
// A list document
{
  id: "abc123",
  name: "Weekly Groceries",
  ownerId: "user_xyz",
  collaborators: ["user_123", "user_456"],  // Array
  publicReadable: true,
  createdAt: Timestamp
}

// Items are in a subcollection
lists/abc123/items/{itemId}
```

Collaborators are stored as an array of user IDs. This is simple to query with `array-contains` but doesn't scale well past about 1000 collaborators. Firestore has a limit of 20,000 indexes per collection, and every unique array value counts toward that.

Items live in a subcollection under each list. Subcollections aren't automatically deleted when you delete the parent - you handle that manually or with Cloud Functions.

### Supabase

```sql
-- Lists table
id | name | owner_id | public_id | created_at

-- Items table (foreign key to lists)
id | list_id | name | checked | created_at

-- Collaborators junction table
list_id | user_id | created_at
```

Collaborators get their own table, which is the standard relational database approach. You query owned lists, query the junction table for shared lists, and combine the results. This requires more queries, but it scales infinitely.

Foreign keys enforce referential integrity. Delete a list and the database automatically removes related items and collaborator entries (if you set `ON DELETE CASCADE`).

### Appwrite

```javascript
// A list document
{
  $id: "abc123",
  name: "Weekly Groceries",
  ownerId: "user_xyz",
  $permissions: [
    "read(\"user:user_xyz\")",
    "update(\"user:user_xyz\")",
    "read(\"user:user_123\")",  // Collaborator
    "update(\"user:user_123\")"
  ],
  $createdAt: DateTime
}

// Items have a relationship field
{
  $id: "item1",
  name: "Milk",
  checked: false,
  list: "abc123",  // Relationship to lists collection
  $permissions: []  // Inherited from parent
}
```

Collaborators aren't stored as data - they're permissions. Add a user to the `$permissions` array and they can access the document. This keeps your data model simple but means permissions are part of your application logic, not declarative rules.

Relationships between collections are first-class in Appwrite. When you create a "many-to-one" relationship from items to lists, Appwrite handles the linking automatically. If you delete a list with cascade enabled, the related items are removed automatically.

## Code Complexity

We counted non-comment, non-whitespace lines across all implementation files.

**Firebase came in at 240 lines total.** Auth context and hooks took 45 lines. Database operations took 85 lines. Real-time subscriptions took 25 lines. The security rules file added 30 lines. Sharing functionality required 55 lines. Firebase stayed concise with subcollections and a declarative rules file.

**Supabase required 390 lines total.** Auth context and hooks took 40 lines. SQL migrations (schema definition plus RLS policies plus RPC functions) needed 120 lines. Database operations took 110 lines. Real-time subscriptions required 45 lines. Sharing functionality added 75 lines. The extra code comes from SQL verbosity and the dual-query pattern for fetching owned and shared lists separately.

**Appwrite matched Firebase at 240 lines total.** Auth context and hooks took 35 lines. Collection setup script needed 25 lines. Database operations required 70 lines. Real-time subscriptions took 20 lines. Sharing functionality needed 90 lines. Appwrite stayed concise, but permissions code repeats across create and update functions.

Fewer lines doesn't mean better. Supabase's extra SQL bought strong data integrity and database-level security.

## Which One to Choose

**For MVPs and proof-of-concepts:** Firebase. No schema required means you start writing data immediately. The NoSQL model works great when you're validating an idea and the data model might change. Fast to prototype. The limitation is that it becomes restrictive once you need to scale beyond the initial concept. Arrays for collaborators don't scale past about 1000 users. The workarounds (like maintaining a separate `users` collection for email lookups) start to add up.

**For production applications:** Supabase. Foreign keys enforce referential integrity. RLS policies provide database-level security that can't be bypassed. Auto-generated TypeScript types keep your code in sync with your schema. The learning curve with PostgreSQL and RLS is steep, but the payoff is a solid foundation that scales properly.

**For a mix of both:** Appwrite. Permissions feel like regular code you're already writing. Email invites are straightforward. Real-time works out of the box. The downside is the UI-based table creation, which gets tedious for complex schemas (though the CLI solves this if you're willing to learn it). Appwrite sits between Firebase's simplicity and Supabase's power.

For this specific shopping list app, we'd start with Firebase to validate the core idea. If it gained traction and needed to scale, we'd [migrate to Supabase](https://supabase.com/docs/guides/platform/migrating-to-supabase/firestore-data) for the relational model and database-level security. [Appwrite would be the choice](https://appwrite.io/docs/advanced/migrations/firebase) if we wanted something production-ready without Supabase's steep learning curve.

## See the Code

All three implementations are in the [Grocery Share repository](https://github.com/ritza-co/grocery-share) on GitHub with complete code and detailed implementation notes:

- [Firebase implementation](https://github.com/ritza-co/grocery-share/tree/feat/firebase) on the `feat/firebase` branch
- [Supabase implementation](https://github.com/ritza-co/grocery-share/tree/feat/supabase) on the `feat/supabase` branch
- [Appwrite implementation](https://github.com/ritza-co/grocery-share/tree/feat/appwrite) on the `feat/appwrite` branch

Each branch has the complete authentication setup, database schema, CRUD operations, real-time subscriptions, private and public sharing implementations, and security configurations. The `/docs` folder in each branch explains the decisions we made along the way.

The [`main` branch](https://github.com/ritza-co/grocery-share/tree/main) has the UI shell (React components and routing) that all three implementations share.
