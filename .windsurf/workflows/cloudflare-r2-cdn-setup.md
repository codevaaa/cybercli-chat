---
description: Complete Cloudflare R2 CDN Setup for CyberCli Downloads
---

# Cloudflare R2 CDN Setup — CyberCli Downloads

## Overview

Cloudflare R2 is an S3-compatible object storage with **zero egress fees** (unlike AWS S3 which charges for bandwidth). This makes it perfect for serving large installer files (.exe, .dmg, .AppImage, .deb) without worrying about bandwidth costs.

**Why R2 instead of GitHub Releases proxy?**
- GitHub Releases proxy = Your Render backend streams every download (uses Render bandwidth)
- R2 CDN = Files served directly from Cloudflare edge (fastest, cheapest, scalable)

---

## Step 1: Create Cloudflare Account

1. Go to https://dash.cloudflare.com/
2. Sign up / Log in (free account works fine)
3. Verify email

---

## Step 2: Create R2 Bucket

1. In Cloudflare dashboard, go to **R2 Object Storage**
2. Click **Create bucket**
3. Bucket name: `cybercli-downloads`
4. Choose location: **Automatic** (recommended)
5. Click **Create bucket**

---

## Step 3: Upload Installer Files

### Option A: Manual Upload (Web UI)

1. Click on your bucket `cybercli-downloads`
2. Click **Upload** button
3. Drag and drop files:
   - `CyberCli-win-x64.exe`
   - `CyberCli-mac-universal.dmg`
   - `CyberCli-linux-x64.AppImage`
   - `CyberCli-linux-x64.deb`
4. Wait for upload to complete

### Option B: Upload via CLI (Recommended for CI/CD)

Install Wrangler (Cloudflare CLI):
```bash
npm install -g wrangler
```

Login:
```bash
wrangler login
# Opens browser, grant permission
```

Upload files:
```bash
# Windows
wrangler r2 object put cybercli-downloads/CyberCli-win-x64.exe --file=./release/CyberCli-win-x64.exe

# macOS
wrangler r2 object put cybercli-downloads/CyberCli-mac-universal.dmg --file=./release/CyberCli-mac-universal.dmg

# Linux AppImage
wrangler r2 object put cybercli-downloads/CyberCli-linux-x64.AppImage --file=./release/CyberCli-linux-x64.AppImage

# Linux .deb
wrangler r2 object put cybercli-downloads/CyberCli-linux-x64.deb --file=./release/CyberCli-linux-x64.deb
```

---

## Step 4: Create Custom Domain (cdn.cybercli.com)

1. In R2 bucket settings, go to **Custom Domains**
2. Click **Connect domain**
3. Enter: `cdn.cybercli.com`
4. Cloudflare will give you DNS records
5. Add these DNS records to your domain registrar
6. Wait for SSL certificate to provision (usually instant)

**Result:** Files accessible at:
```
https://cdn.cybercli.com/CyberCli-win-x64.exe
https://cdn.cybercli.com/CyberCli-mac-universal.dmg
https://cdn.cybercli.com/CyberCli-linux-x64.AppImage
https://cdn.cybercli.com/CyberCli-linux-x64.deb
```

---

## Step 5: Create R2 API Token (for Backend)

1. Go to **Manage R2 API Tokens**
2. Click **Create API token**
3. Token name: `CyberCli Downloads Backend`
4. Permissions:
   - Object Read & Write: `cybercli-downloads`
5. Click **Create API Token**
6. **COPY the values immediately** (shown only once):
   - `Access Key ID`
   - `Secret Access Key`
   - `Endpoint URL` (e.g., `https://<account>.r2.cloudflarestorage.com`)

---

## Step 6: Update Backend Environment Variables

Add these to your `.env` file and Render environment:

```bash
# R2 Config
R2_ENABLED=true
R2_BUCKET_NAME=cybercli-downloads
R2_ENDPOINT=https://<account>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=<your-access-key-id>
R2_SECRET_ACCESS_KEY=<your-secret-access-key>
R2_PUBLIC_URL=https://cdn.cybercli.com
```

---

## Step 7: Update Backend Download Route

The backend should:
1. First check if file exists on R2
2. If yes → redirect user to CDN URL (fastest)
3. If no → fallback to GitHub proxy (current behavior)

See `backend/src/routes/downloads.routes.js` — already updated for R2 support.

---

## Step 8: Test Everything

```bash
# Test direct R2 access
curl -I https://cdn.cybercli.com/CyberCli-win-x64.exe
# Should return 200 OK

# Test backend proxy (R2 redirect)
curl -I https://cybercli-api.onrender.com/api/v1/downloads/CyberCli-win-x64.exe
# Should return 302 redirect to cdn.cybercli.com
```

---

## Pricing (R2 Free Tier)

| Resource | Free Tier | Cost After |
|----------|-----------|------------|
| Storage | 10 GB | $0.015/GB/month |
| Class A Operations | 1 million/month | $4.50/million |
| Class B Operations | 10 million/month | $0.36/million |
| **Egress (Bandwidth)** | **Unlimited** | **FREE** |

**Unlike AWS S3, R2 has NO EGRESS FEES.** This is the killer feature.

---

## Automation (GitHub Actions CI)

Add this to your CI workflow to auto-upload releases to R2:

```yaml
- name: Upload to R2
  run: |
    npm install -g wrangler
    wrangler r2 object put cybercli-downloads/CyberCli-win-x64.exe --file=desktop/release/CyberCli-win-x64.exe
    wrangler r2 object put cybercli-downloads/CyberCli-mac-universal.dmg --file=desktop/release/CyberCli-mac-universal.dmg
    wrangler r2 object put cybercli-downloads/CyberCli-linux-x64.AppImage --file=desktop/release/CyberCli-linux-x64.AppImage
    wrangler r2 object put cybercli-downloads/CyberCli-linux-x64.deb --file=desktop/release/CyberCli-linux-x64.deb
  env:
    CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

---

## Summary

| Before (Render Proxy) | After (R2 CDN) |
|-----------------------|----------------|
| File goes through your server | File served directly from edge |
| Uses Render bandwidth | Uses Cloudflare bandwidth (free) |
| ~100MB file = slow for user | Edge cached = super fast |
| 1000 users = ~78GB Render | 1000 users = 0GB Render |
| Single point of failure | Distributed globally |
| Not scalable | Infinitely scalable |
