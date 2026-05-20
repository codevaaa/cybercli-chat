---
description: Deploy CyberCli to Vercel (frontend) + Render (backend)
---

# Vercel + Render Deployment Guide

## Prerequisites
- Vercel account (vercel.com)
- Render account (render.com)
- GitHub repo connected to both

## Step 1: Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) and click **Add New Project**
2. Import your GitHub repository `stilcybermindcli/cybercli-chat`
3. Set **Root Directory** to `frontend`
4. Vercel auto-detects Vite — build settings:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Add Environment Variables:
   - `VITE_API_BASE_URL` → your Render backend URL (e.g., `https://cybercli-api.onrender.com`)
   - `VITE_SUPABASE_URL` → your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` → your Supabase anon key
6. Click **Deploy**

## Step 2: Deploy Backend to Render

1. Go to [dashboard.render.com](https://dashboard.render.com)
2. Click **New +** → **Web Service**
3. Connect your GitHub repo
4. Configure:
   - Name: `cybercli-api`
   - Root Directory: `backend`
   - Runtime: Node
   - Build Command: `npm install`
   - Start Command: `node src/server.js`
5. Add Environment Variables from `backend/.env`:
   - `NODE_ENV` = `production`
   - `PORT` = `3000`
   - `FRONTEND_URL` = `https://cybercli.vercel.app`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `MONGODB_URI`
   - `REDIS_URL`
   - `ENCRYPTION_KEY`
   - `OPENROUTER_API_KEY`
   - `GROQ_API_KEY`
   - `GEMINI_API_KEY`
   - `NVIDIA_API_KEY`
   - `HUGGINGFACE_API_KEY`
   - `MISTRAL_API_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
6. Click **Create Web Service**

## Step 3: Update Frontend Env

After Render deploys, copy the backend URL and update Vercel:
1. Go to Vercel Dashboard → Project Settings → Environment Variables
2. Set `VITE_API_BASE_URL` to your Render backend URL
3. Redeploy frontend

## Step 4: Custom Domain (Optional)

1. In Vercel Dashboard → Domains → Add `cybercli.chat` or your domain
2. Update DNS records as instructed by Vercel
3. Update `FRONTEND_URL` in Render env vars to match
