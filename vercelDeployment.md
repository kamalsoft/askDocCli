# Ask-Docs Vercel Deployment Guide

This document provides clear, step-by-step instructions for deploying your Ask-Docs application (both its API and web frontend) to Vercel. This guide is designed for users who may be new to Vercel deployments and aims to make the process as straightforward as possible.

## 1. Introduction to Vercel

Vercel is a cloud platform for frontend frameworks and static sites, built to integrate with your headless content, commerce, or database. It offers:
*   **Automatic Deployments**: Connects directly to your Git repository (GitHub, GitLab, Bitbucket) and deploys every time you push code.
*   **Serverless Functions**: Easily deploy backend code as serverless functions, perfect for APIs.
*   **Global Edge Network**: Your application is served quickly to users worldwide.

## 2. Prerequisites

Before you begin, ensure you have the following set up:

*   **Git**: You need Git installed on your local machine.
*   **Node.js and npm/yarn**: Install Node.js (LTS version recommended).
*   **Ask-Docs Codebase**: Make sure you have the Ask-Docs project cloned to your local machine and dependencies installed (`npm install`).
*   **Vercel Account**: Sign up for a free Vercel account at vercel.com.
*   **Git Repository**: Your project should be hosted on a Git provider (GitHub, GitLab, or Bitbucket).

## 3. Understanding Your Project Structure

Ask-Docs is structured as a monorepo:
```
your-ask-docs-repo/
├── ask-docs-UI/             # React frontend
├── ask-docs/        # Backend/CLI logic
├── docs/            # Your markdown documentation
├── package.json
└── vercel.json      # Vercel configuration
```

## 4. Deployment Steps Using Vercel CLI

### 4.1. Install Vercel CLI
Run:
```bash
npm install -g vercel
```

### 4.2. Log In
Run:
```bash
vercel login
```

### 4.3. Navigate to Project Directory
```bash
cd /Users/kamalsoft/dev/Project/askDocCli
```

### 4.4. Deploy Your Project
Run:
```bash
vercel
```
Follow these prompts:
1.  **Set up and deploy?** `Y`
2.  **Which scope?** [Your Account]
3.  **Link to existing project?** `N`
4.  **What's your project's name?** `ask-docs-app`
5.  **In which directory is your code located?** `ask-docs-UI`
6.  **Vercel detected a framework?** Confirm if it's correct (e.g., Vite or React).
7.  **Want to override settings?** `N` (usually defaults are fine).

### 4.5. Configure Environment Variables
If your app uses `OPENROUTER_API_KEY`:
1.  Go to the Vercel Dashboard.
2.  Select your project.
3.  Go to **Settings** > **Environment Variables**.
4.  Add the key and value.

## 5. Troubleshooting 404 Errors

If you see a 404 error after deploying:

1.  **Check Vite Base Path**: Ensure `ask-docs-UI/vite.config.js` has `base: '/'`. If it is set to `'/web/'`, your app is only accessible at `your-url.com/web/`.
2.  **Root Directory**: In Vercel Project Settings, ensure the **Root Directory** is set correctly. If you are deploying the whole monorepo, it should be `./`. If you are only deploying the UI, it should be `ask-docs-UI`.
3.  **Trailing Slashes**: Sometimes Vercel requires a trailing slash if you are using subdirectories (e.g., `.../web/` instead of `.../web`).

## 6. Testing the Deployment

### 6.1. Testing the Web UI
Open your browser to your Vercel URL. Open the **Developer Tools (F12)** and look at the **Network** tab. Refresh the page. All files (CSS, JS) should show a `200 OK` status.

### 6.2. Testing the API
Attempt to access an API endpoint directly in the browser or via `curl`, for example: `https://your-app.vercel.app/api/health` (if your API has a health check). If this returns a 404, your backend is not correctly routed.

### 4.6. Exclude Large Files
To prevent the Vercel CLI from uploading large machine learning models or unnecessary data, ensure you have a `.vercelignore` file in your project root.

Create a file named `.vercelignore` and add patterns for files you want to skip:
```text
**/*.onnx
**/models/
```

## 5. Handling Local Models on Vercel

**Important:** Vercel serverless functions have a size limit (typically 250MB). The local LLM models used by Ask-Docs (like Llama 3.2) are several gigabytes in size and **cannot** be hosted directly on Vercel's serverless infrastructure.

To make your deployment work:
1.  **Reasoning**: Use the `openrouter` mode in your config to use remote inference.
2.  **Embeddings**: For a fully web-deployed version, you may need to use a remote embedding service or host the embedding API on a server with persistent storage (like a VPS or dedicated AI hosting).

## 6. Post-Deployment Verification

1.  **Access Your App**: Open the URL provided by Vercel.
2.  **Test Endpoints**: If you have an API at `/api/...`, test it via `curl` or your browser.
3.  **Check Logs**: Use the **Logs** tab in the Vercel dashboard to troubleshoot any startup errors.

## 7. Continuous Deployment

Once linked to your Git repo:
*   **Production**: Every `git push` to `main` triggers a live deployment.
*   **Preview**: Every `git push` to other branches creates a unique preview URL.

---
*Generated for Ask-Docs Deployment*