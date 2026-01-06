---
slug: use-claude-code-in-chrome-with-the-official-extension
title: How to Give Claude Code Access to Google Chrome With the Official Claude Extension
description: Learn how to install and use the official Claude Chrome extension with Claude Code to enable visual browser testing. Test your code with Chrome and get real-time visual feedback on your implementations.
authors: [simpletechguides]
tags: [claude-code, chrome-extension, chrome, browser-testing, visual-feedback, agentic-coding, automation]
keywords: [claude code browser, claude chrome extension, claude code chrome, visual testing, agentic coding, browser automation, claude code testing, chrome automation, visual feedback, browser extension]
image: /img/guides/use-claude-code-in-chrome-with-the-official-extension/cover.png

---

# How to Give Claude Code Access to Google Chrome With the Official Claude Extension

Anthropic released an official Chrome extension that automates browser tasks. You can ask Claude to shop on Amazon, analyze Yahoo Finance charts, or post on LinkedIn.

You can also give Claude Code control of your browser so it validates its own work. Claude builds features, tests them visually in Chrome, spots issues, and iterates without you manually checking each change.

This guide shows you how to set up and use the Chrome extension with Claude Code.

## Prerequisites 

You'll need:

- Claude Code installed and working
- Node.js 18+
- Google Chrome (standard version, not Chrome Dev)
- Basic command line experience

## Setting Up a Test Project

You need a project with visual elements that Claude can test.

### Option A: Clone the Project

Clone this registration app:

```bash
git clone https://github.com/ritza-co/using-claude-code-with-chrome
cd using-claude-code-with-chrome
```

Start Claude Code and ask Claude to install and run it:

```bash
claude
> Install dependencies and start the server for this registration project.
```

Claude runs `npm install` and `npm start` as background tasks.

### Option B: Build from Scratch 

Build from scratch with this prompt:

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

Ask Claude Code to run the server:

```bash
> Install dependencies and start the server for this registration project.
```

## Installing the Extension

Add the extension to Chrome from this [link](https://claude.com/chrome). Click the extension icon in your toolbar and log in.

![Claude Chrome extension icon in the browser toolbar with login prompt displayed](/img/guides/use-claude-code-in-chrome-with-the-official-extension/chrome-extension-login.png)

## Running Claude Code With Chrome

Start Claude Code with Chrome:

```bash
claude --chrome
```

If you get errors, check if Claude detects the extension with `/chrome`:

![Claude Code terminal showing Chrome extension detection status with connection confirmation message](/img/guides/use-claude-code-in-chrome-with-the-official-extension/chrome-detection-check.png)

Once it's done, you can ask Claude to set up and run the project you have created or cloned above. You can use the following prompt to test the registration form: 

```txt
Use the Chrome extension to test the registration form. Check that:
1. The form is centered on the page
2. Input fields have labels
3. The submit button is blue (#0066cc)
4. Registration works with valid input

Fix any issues you find and re-test until everything matches these requirements.
```

Claude Code opens Chrome and goes to http://localhost:3000/register.

![Chrome browser displaying the user registration form with email and password fields on localhost](/img/guides/use-claude-code-in-chrome-with-the-official-extension/registration-form-opened.png)

Claude fills in credentials and submits the form:

![Registration form filled with test email and password credentials, ready for submission](/img/guides/use-claude-code-in-chrome-with-the-official-extension/registration-form-filled.png)

Your browser shows this:

![Browser displaying successful registration confirmation message after form submission](/img/guides/use-claude-code-in-chrome-with-the-official-extension/registration-success-browser.png)

### Visual Feedback and Iterative Refinement

Test Claude Code's iterative capabilities by asking it to redesign the layout based on visual feedback. Ask Claude to restructure the page:

```bash
Use Chrome to redesign the registration page layout:
1. Move the form to the right side of the screen
2. Add descriptive text about the project on the left side
3. Make sure both sections are properly aligned and centered

Keep testing and iterating until the layout matches these requirements.
```

Claude will start redesigning the page.

![Claude Code terminal output showing the redesign process with code changes being applied to the registration page layout](/img/guides/use-claude-code-in-chrome-with-the-official-extension/redesign-in-progress.png)

Then, Claude takes screenshots to verify the UI requirements and runs tests to ensure everything works as expected.

![Claude Code taking automated screenshots and verifying UI requirements against specified criteria](/img/guides/use-claude-code-in-chrome-with-the-official-extension/testing-ui-requirements.png)

You will have a similar result.

![Final redesigned registration page with form on the right side and descriptive project text on the left, both properly aligned](/img/guides/use-claude-code-in-chrome-with-the-official-extension/redesign-final-result.png)

## Troubleshooting

If Claude Code can't detect the extension, verify you're using standard Chrome, not Chrome Dev. Claude Code won't detect the extension in Chrome Dev even when installed.

Claude with dev-browser works best with specific, testable criteria:

**❌ Vague:**

```
Make the registration form look good
```

**✅ Specific:**

```
Use Chrome to verify and iterate until:
1. Form is centered horizontally (max-width: 400px, margin: 0 auto)
2. Submit button is blue (#0066cc) with white text
3. Input fields have 10px padding
4. Form has 20px spacing between fields
```

If you can't verify it by looking, Claude can't either. Try to specify measurable requirements.

## Conclusion

In this guide, you learned how to install the official Chrome extension and how to use it with Claude Code. In the next article, we will discuss our experience using Claude Code and dev-browser to build a documentation, and how features were tested, what was built, and what was noticed.