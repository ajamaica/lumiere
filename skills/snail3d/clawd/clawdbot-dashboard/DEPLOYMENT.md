# Deployment Guide

Deploy the Clawdbot Dashboard to production.

## Pre-Deployment Checklist

### Code Quality

- [ ] Run `npm run build` (no errors)
- [ ] Run `npm run lint` (no warnings)
- [ ] Check TypeScript: `npm run build` (strict mode passes)
- [ ] Review all custom colors/branding updated
- [ ] Test dark and light modes
- [ ] Test on mobile browser
- [ ] Test keyboard navigation
- [ ] Test message scrolling
- [ ] Test copy-to-clipboard

### Performance

- [ ] Build size acceptable (< 500KB gzipped)
- [ ] Lighthouse score > 90
- [ ] No console errors
- [ ] Images optimized (if adding images)
- [ ] No broken external CDN links

### Security

- [ ] No secrets in code
- [ ] No hardcoded API URLs (use env vars)
- [ ] HTML properly escaped (React does this)
- [ ] CSP headers configured (if using server)
- [ ] CORS headers correct (for API calls)

### Documentation

- [ ] README.md updated
- [ ] SKILL.md integration docs clear
- [ ] Environment variables documented
- [ ] Screenshots/demo link ready

---

## Build for Production

### Step 1: Optimize Build

```bash
cd /Users/ericwoodard/clawd/clawdbot-dashboard

# Install latest dependencies
npm update

# Run build
npm run build
```

**Output:**

```
dist/
├── index.html (1.5 KB)
├── assets/
│   ├── index-C1tKvlSb.css (40.5 KB)
│   ├── vendor-CfRnwZvW.js (131 KB)
│   ├── index-D9fOObQK.js (203 KB)
│   └── markdown-nDqusRn1.js (744 KB)
```

### Step 2: Test Production Build

```bash
npm run preview
# Opens http://localhost:4173
```

Test:

- [ ] All UI renders correctly
- [ ] Animations smooth
- [ ] Markdown renders with syntax highlighting
- [ ] Dark/light toggle works
- [ ] Copy buttons work
- [ ] No console errors

---

## Deployment Options

### Option 1: Vercel (Recommended)

**Easiest deployment with automatic deployments from Git.**

#### Setup

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel deploy --prod
```

#### Configure (optional)

Create `vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "env": {
    "VITE_API_URL": "https://api.example.com",
    "VITE_SOCKET_URL": "wss://socket.example.com"
  }
}
```

#### GitHub Auto-Deploy

1. Push to GitHub: `git push origin main`
2. Connect repo in Vercel dashboard
3. Auto-deploys on push

### Option 2: Netlify

**Simple drag-and-drop or Git integration.**

#### Deploy via CLI

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod --dir=dist
```

#### Deploy via Dashboard

1. Go to netlify.com
2. "Add new site" → "Deploy manually"
3. Drag and drop the `dist/` folder
4. Done!

#### Configure

Create `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  VITE_API_URL = "https://api.example.com"
  VITE_SOCKET_URL = "wss://socket.example.com"
```

### Option 3: GitHub Pages

**Free hosting with GitHub.**

#### Setup

1. Update `vite.config.ts`:

```typescript
export default {
  base: '/clawdbot-dashboard/', // Your repo name
}
```

2. Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

3. Enable Pages in repo settings

### Option 4: AWS S3 + CloudFront

**For advanced users needing global distribution.**

#### Deploy

```bash
# Build
npm run build

# Upload to S3
aws s3 sync dist/ s3://my-bucket-name/ --delete

# Invalidate CloudFront (if using)
aws cloudfront create-invalidation \
  --distribution-id E1234ABCD \
  --paths "/*"
```

### Option 5: Docker + Any Server

**For custom infrastructure.**

#### Create Dockerfile

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Serve stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### Create nginx.conf

```nginx
server {
  listen 80;

  location / {
    root /usr/share/nginx/html;
    try_files $uri $uri/ /index.html;
  }

  location /api {
    proxy_pass http://api-server:3000;
  }
}
```

#### Build & Deploy

```bash
docker build -t clawdbot-dashboard .
docker run -p 80:80 clawdbot-dashboard
```

---

## Environment Variables

### Create `.env.production`

```env
VITE_API_URL=https://api.clawdbot.example.com
VITE_SOCKET_URL=wss://socket.clawdbot.example.com
VITE_SESSION_ID=your-session-id
```

### Set in Deployment Platform

**Vercel:**
Settings → Environment Variables → Add variables

**Netlify:**
Settings → Build & Deploy → Environment → Edit Variables

**GitHub Actions:**
Settings → Secrets → New repository secret

---

## Post-Deployment

### Health Checks

1. **Page Loads**: Visit deployed URL
2. **No Errors**: Check browser console (F12)
3. **Markdown Works**: Scroll through messages
4. **Theme Toggles**: Click sun/moon icon
5. **Copy Works**: Click session key field
6. **Responsive**: Test on mobile (device or Chrome DevTools)

### Analytics

Add Google Analytics:

```typescript
// In main.tsx
import { useEffect } from 'react'

useEffect(() => {
  const script = document.createElement('script')
  script.async = true
  script.src = 'https://www.googletagmanager.com/gtag/js?id=GA_ID'
  document.head.appendChild(script)

  window.dataLayer = window.dataLayer || []
  function gtag() {
    dataLayer.push(arguments)
  }
  gtag('js', new Date())
  gtag('config', 'GA_ID')
}, [])
```

### Monitoring

Monitor with:

- **Vercel Analytics**: Built-in (free tier)
- **Netlify Analytics**: Built-in
- **Sentry**: Error tracking
- **LogRocket**: User session replay

---

## Continuous Deployment

### GitHub Actions (Auto-Deploy)

Create `.github/workflows/build-deploy.yml`:

```yaml
name: Build & Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Test
        run: npm run lint

      - name: Deploy
        if: github.event_name == 'push'
        run: vercel deploy --prod --token ${{ secrets.VERCEL_TOKEN }}
```

---

## Rollback

### If Deployment Fails

**Vercel**: Automatic rollback to previous deployment
**Netlify**: Manual rollback in deploy history
**GitHub Pages**: Push to revert commit
**S3**: Restore from S3 versioning

### Manual Rollback

```bash
# Vercel
vercel rollback

# Or redeploy previous version
vercel deploy --prod

# Netlify
netlify deploy --prod --dir=dist --message="Rollback"
```

---

## Updating After Deployment

### Make Code Changes

```bash
# Update code
git add .
git commit -m "Update dashboard feature"
git push origin main

# Automatic deployment happens (if using Git integration)
```

### Manual Update

```bash
npm run build
vercel deploy --prod  # or netlify deploy --prod
```

---

## Optimization Checklist

- [ ] Enable gzip compression
- [ ] Cache bust CSS/JS (automatic with Vite)
- [ ] Set cache headers (1 year for assets)
- [ ] Use CDN for static files
- [ ] Minify HTML/CSS/JS (automatic)
- [ ] Lazy load images (if added)
- [ ] Preload critical fonts

### Cache Headers (nginx)

```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico)$ {
  expires 1y;
  add_header Cache-Control "public, immutable";
}

location / {
  expires -1;
  add_header Cache-Control "no-cache, no-store, must-revalidate";
}
```

---

## Performance After Deployment

### Run Lighthouse Audit

1. Open deployed site
2. Press F12 (DevTools)
3. Go to Lighthouse tab
4. Click "Generate report"
5. Target: > 90 on all metrics

### Common Issues & Fixes

| Issue                               | Fix                                      |
| ----------------------------------- | ---------------------------------------- |
| Slow load time                      | Enable compression, use CDN              |
| High CLS (Cumulative Layout Shift)  | Add explicit heights, avoid ads          |
| Poor LCP (Largest Contentful Paint) | Optimize images, defer non-critical      |
| 404 errors                          | Check asset paths, ensure dist/ uploaded |
| CORS errors                         | Configure CORS headers on API            |
| Styles not loading                  | Check `<base>` path in HTML              |

---

## Maintenance

### Weekly

- [ ] Monitor error logs
- [ ] Check uptime status
- [ ] Review analytics

### Monthly

- [ ] Update dependencies: `npm update`
- [ ] Run security audit: `npm audit`
- [ ] Review performance metrics

### Quarterly

- [ ] Major dependency updates
- [ ] Security vulnerability scan
- [ ] Accessibility audit

---

## Disaster Recovery

### Data Backup

- Git commits are automatic backups
- Keep `.env` files secure (don't commit)

### Site Recovery

```bash
# Rebuild from source
git clone <repo>
cd clawdbot-dashboard
npm install
npm run build

# Deploy again
vercel deploy --prod
```

---

## Domain Setup

### Point Custom Domain

**Vercel:**

1. Settings → Domains
2. Add domain
3. Follow DNS instructions

**Netlify:**

1. Settings → Domain Management
2. Add custom domain
3. Configure nameservers

### SSL/TLS

- Automatic with Vercel & Netlify
- Free (Let's Encrypt)
- Auto-renewal

---

## Success Criteria

✅ **Deployment Complete When:**

1. Site loads without errors
2. All pages responsive
3. Performance score > 90
4. No console errors
5. API connectivity works
6. Monitoring active
7. Backup strategy in place
8. Team knows how to deploy

---

## Troubleshooting Deployment

| Problem               | Solution                                 |
| --------------------- | ---------------------------------------- |
| Blank page            | Check HTML file loads, check console     |
| Assets 404            | Check `base` path, ensure dist/ uploaded |
| Styles not working    | Clear cache, check CDN links             |
| API errors            | Check env variables, CORS headers        |
| Slow performance      | Enable compression, use CDN              |
| Socket.io not working | Check WS/WSS protocols, CORS             |

---

## Quick Deploy Commands

```bash
# Vercel (fastest)
vercel deploy --prod

# Netlify
netlify deploy --prod --dir=dist

# Build only (all platforms)
npm run build
```

---

**Last Updated**: January 2025  
**Status**: Ready for Production  
**Support**: Check README.md & SKILL.md
