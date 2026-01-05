---
slug: use-claude-code-in-chrome-with-dev-browser
title: How to give Claude Code access to Google Chrome with dev-browser
description: Learn how to install and use the dev-browser MCP server with Claude Code to enable visual browser testing. Test your code with Chrome and get real-time visual feedback on your implementations.
authors: [simpletechguides]
tags: [claude-code, dev-browser, mcp, chrome, browser-testing, visual-feedback, agentic-coding, automation, playwright, mcp-server]
keywords: [claude code browser, dev-browser mcp, claude code chrome, visual testing, agentic coding, browser automation, mcp server, claude code testing, chrome automation, visual feedback, dev-browser plugin]
image: /img/guides/use-claude-code-in-chrome-with-dev-browser/cover.png
---

# How to give Claude Code access to a web browser with dev-browser

When Claude Code builds a registration form, it has no idea if the form is centered, if the button is the right color, or if the layout breaks on mobile. It can't open a browser to check. So it guesses, ships the code, and it's up to you or your customers to discover the problems later.

Tools like Playwright can automate browser testing, but they don't help Claude iterate autonomously. Playwright requires you to write test scripts beforehand. Claude can't use it to inspect what it just built and decide what to fix next.

In this guide, you'll set up dev-browser, an MCP server that gives Claude Code access to Chrome. With [dev-browser](github.com/SawyerHood/dev-browser) Claude can test its own work, spot visual issues, and iterate autonomously—without you manually checking each change.

## Prerequisites 

For this tutorial, you'll need:

- **Claude Code** installed and working
- **Node.js 18+**
- **Google Chrome** installed
- Basic command line experience

## Install the MCP server

Start a Claude Code session:
```bash
claude
```

First, add dev-browser to your marketplace:

```bash
/plugin marketplace add sawyerhood/dev-browser
```

![MCP server marketplace add](/img/guides/use-claude-code-in-chrome-with-dev-browser/mcp-server-marketplace-add.png)

This registers the plugin in your Claude Code environment. Next, install the plugin:

```bash
/plugin install dev-browser@sawyerhood/dev-browser
```

You will be prompted to choose the installation scope. Choose what works for you, but we are selecting the `Install for you (user scope)` option.

![Plugin installation scope selection](/img/guides/use-claude-code-in-chrome-with-dev-browser/plugin-installation-scope-selection.png)

Once installation completes, you'll see a confirmation message.

![Plugin installed successfully](/img/guides/use-claude-code-in-chrome-with-dev-browser/plugin-installed-successfully.png)

Restart Claude Code for the changes to take effect:

```bash
# Exit current session
exit

# Start new session
claude
```

Verify dev-browser is installed:
```bash
/plugin list
```

You should see `dev-browser` in the output.

## Setting up a test project

To see dev-browser in action, you need a project with visual elements Claude can test. 

### Option A: Clone the project

Clone this example registration app:

```bash
git clone https://github.com/ritza-co/using-claude-code-with-chrome
cd using-claude-code-with-chrome
```

Start a Claude Code session and ask Claude to install and run the project:

```bash
claude
> Install dependencies and start the server for this registration project.
```
Claude will run `npm install` and `npm start as background tasks.

### Option B: Build from Scratch 

If you prefer to have Claude Code build the project from scratch, you can use this prompt to create the project.

````bash
Hi Claude,  
Create a minimal Node.js project that implements a user registration feature.

## Requirements

- Use **Node.js with Express**
- Use an **in-memory database** (JavaScript object or `Map`, no external database)
- Provide a **registration page** accessible at `GET /register` with an HTML form
- Handle form submission via `POST /register`
- Store registered users in memory with the following fields:
  - `id`
  - `email` (must be unique)
  - `password` (hashed)
  - `createdAt`
- Validate user input:
  - Valid email format
  - Minimum password length
- Hash passwords using **bcrypt**
- Return clear success and error responses (appropriate HTTP status codes and messages)

## Deliverables

- Project folder structure
- `package.json`
- Server entry point
- In-memory data store implementation
- Minimal HTML for the registration page

## Execution

The project must be runnable using:

```bash
npm install
npm start
```
````

You should have something similar: 

![Project creation result](/img/guides/use-claude-code-in-chrome-with-dev-browser/project-creation-result.png)

Then, you can ask Claude Code to run the server:

```bash
> Install dependencies and start the server for this registration project.
```

## Claude's autonomous testing workflow

With the server running, ask Claude to test and fix the registration form:
```
Use dev-browser to test the registration form. Check that:
1. The form is centered on the page
2. Input fields have labels
3. The submit button is blue (#0066cc)
4. Registration works with valid input

Fix any issues you find and re-test until everything matches these requirements.
```

Claude will use the dev-browser plugin to open Chrome and navigate to http://localhost:3000/register.

![Chrome registration page](/img/guides/use-claude-code-in-chrome-with-dev-browser/chrome-registration-page.png)

Claude fills in test credentials and submits the form.

![Registration success](/img/guides/use-claude-code-in-chrome-with-dev-browser/registration-success.png)

### Visual feedback and iterative refinement

Now let's test dev-browser's iterative capabilities. We'll ask Claude to redesign the layout based on visual feedback from Chrome.

Ask Claude to restructure the page:
```txt
Use dev-browser to redesign the registration page layout:
1. Move the form to the right side of the screen
2. Add descriptive text about the project on the left side
3. Make sure both sections are properly aligned and centered

Keep testing and iterating until the layout matches these requirements.
```

Claude uses dev-browser to analyze the current page, then begins making changes:

![Claude visual analysis](/img/guides/use-claude-code-in-chrome-with-dev-browser/claude-visual-analysis.png)

Claude iteratively modifies the HTML and CSS, checking the result in Chrome after each change. You'll see Claude: 

- Restructure the layout into a two-column design 
- Adjust spacing and alignment based on what it sees 
- Refine the styling through multiple iterations 
- Report when requirements are met

## Troubleshooting

Claude may report that the layout is complete after one or two iterations, even when issues remain. Push Claude to continue by pointing out specific problems you still see. Tell Claude to use dev-browser again and verify the exact requirements you want fixed.

After five or more iterations, Claude's fixes may stop improving or repeat the same errors. When this happens, start a new Claude Code session with clearer requirements. Break complex visual tasks into smaller steps. For example, first get the layout right, then work on colors and spacing separately.

Claude with dev-browser works best with specific, testable criteria:

**❌ Vague:**
```
Make the registration form look good
```

**✅ Specific:**
```
Use dev-browser to verify and iterate until:
1. Form is centered horizontally (max-width: 400px, margin: 0 auto)
2. Submit button is blue (#0066cc) with white text
3. Input fields have 10px padding
4. Form has 20px spacing between fields
```

If you can't verify it by looking, Claude can't either. Try to specify measurable requirements.

## Conclusion

In this guide, you installed the dev-browser MCP server and learned how to use it with Claude Code. You set up a test project, asked Claude to build and test features autonomously, and observed how Claude uses Chrome's visual feedback to iterate on UI improvements. dev-browser is useful when you're building user interfaces and want Claude to verify its own work visually. This works well for registration forms, dashboards, landing pages, or any feature where visual layout and styling matter.

In the next guide, we will explore how to use the official Google Chrome Claude extension to allow Claude Code to access Chrome and test its work.
