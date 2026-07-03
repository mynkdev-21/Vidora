# GitHub & DevOps — Complete Guide (Hindi + English)

---

## 1. Git Basics — Kya hai?

Git = version control system. Code ka history track karta hai. Kab kya change hua, kisne kiya, revert bhi kar sakte ho.

GitHub = Git ka cloud platform. Code store, collaborate, CI/CD, releases.

---

## 2. Essential Git Commands

```bash
# ── Setup (ek baar) ────────────────────────────────────────
git config --global user.name "Mayank Singh"
git config --global user.email "your@email.com"

# ── New project start ──────────────────────────────────────
git init                        # Current folder ko git repo bana do
git add .                       # Sab files track karo
git commit -m "Initial commit"  # Snapshot save karo

# ── GitHub se connect ──────────────────────────────────────
git remote add origin https://github.com/username/repo.git
git branch -M main
git push -u origin main         # Code upload karo

# ── Daily workflow ─────────────────────────────────────────
git status                      # Kya change hua dekho
git add .                       # Changes stage karo
git commit -m "Fixed login bug" # Commit karo
git push                        # GitHub pe upload karo

# ── Pull (dusre ka code lao) ──────────────────────────────
git pull                        # Latest code download karo

# ── Branches ───────────────────────────────────────────────
git branch feature-xyz          # Naya branch banao
git checkout feature-xyz        # Us branch pe jao
git checkout -b new-feature     # Banao + switch ek command me
git merge feature-xyz           # Branch merge karo main me
git branch -d feature-xyz       # Branch delete karo

# ── Undo / Revert ─────────────────────────────────────────
git checkout -- file.js         # File revert karo (last commit pe)
git reset HEAD~1                # Last commit undo (changes rehti hain)
git reset --hard HEAD~1         # Last commit delete (changes bhi gayi)
git stash                       # Changes temporarily hatao
git stash pop                   # Wapas lao

# ── Tags (Releases) ───────────────────────────────────────
git tag v1.0.0                  # Version tag banao
git push origin v1.0.0          # Tag push karo (triggers CI/CD)
git tag -d v1.0.0               # Tag delete (local)
git push origin :refs/tags/v1.0.0  # Tag delete (remote)

# ── History ────────────────────────────────────────────────
git log --oneline               # Short history
git log --graph --oneline       # Visual branch history
git diff                        # Changes dekho
git blame file.js               # Kaun ne kya likha
```

---

## 3. .gitignore — Kya ignore karna hai

```gitignore
# Node.js
node_modules/
.env
*.log

# Build
dist/
build/
target/

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/

# Secrets (NEVER push these)
*.pem
*.key
firebase-service-account.json
```

---

## 4. Branching Strategy

```
main (production — stable code)
  └── develop (testing)
       ├── feature/login-page
       ├── feature/payment-system  
       └── fix/video-player-crash
```

**Flow:**
1. `main` = always working code
2. New feature? → `git checkout -b feature/xyz`
3. Kaam ho gaya? → Pull Request (PR) bana → Review → Merge to main

---

## 5. GitHub Features

| Feature | Kya karta hai |
|---------|---------------|
| **Repositories** | Code store |
| **Issues** | Bug tracking, feature requests |
| **Pull Requests** | Code review + merge |
| **Actions** | CI/CD (auto build, test, deploy) |
| **Releases** | Downloadable builds (.exe, .dmg) |
| **Pages** | Free static website hosting |
| **Secrets** | Environment variables (secure) |
| **Projects** | Kanban board (task management) |

---

## 6. GitHub Actions (CI/CD) — Automated Builds

### Kya hai?
Code push karo → automatically build, test, deploy ho jaye. No manual work.

### Workflow file: `.github/workflows/build.yml`

```yaml
name: Build & Deploy

on:
  push:
    branches: [main]    # Jab main pe push ho
  pull_request:
    branches: [main]    # Jab PR aaye

jobs:
  build:
    runs-on: ubuntu-latest    # Linux machine milti hai free

    steps:
      - uses: actions/checkout@v4          # Code download
      - uses: actions/setup-node@v4        # Node.js install
        with:
          node-version: 20

      - run: npm install                   # Dependencies install
      - run: npm run build                 # Build
      - run: npm test                      # Tests run
```

### Triggers:
| Trigger | Kab run hoga |
|---------|-------------|
| `push: branches: [main]` | Main pe push |
| `pull_request` | PR create/update |
| `tags: ['v*']` | Tag push (v1.0.0) |
| `workflow_dispatch` | Manual button |
| `schedule: cron: '0 0 * * *'` | Daily midnight |

### Matrix builds (multiple platforms):
```yaml
strategy:
  matrix:
    os: [ubuntu-latest, windows-latest, macos-latest]
    node: [18, 20]
```

### Secrets use karo:
```yaml
env:
  API_KEY: ${{ secrets.API_KEY }}
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
```
GitHub → Repo Settings → Secrets → Add new secret

---

## 7. DevOps Concepts

### CI (Continuous Integration)
- Har push pe automatically code build + test
- Errors jaldi catch hote hain
- Team me conflict avoid

### CD (Continuous Deployment)
- Test pass → automatically deploy to production
- No manual deployment needed

### Pipeline:
```
Code Push → Build → Test → Deploy → Monitor
```

---

## 8. Deployment Options

| Service | Best for | Cost |
|---------|----------|------|
| **Vercel** | Frontend (React, Next.js) | Free |
| **Netlify** | Static sites | Free |
| **Railway** | Backend (Node.js) | $5/mo |
| **Render** | Full stack | Free tier |
| **Hetzner** | VPS (full control) | €4/mo |
| **AWS** | Enterprise | Expensive |
| **DigitalOcean** | VPS | $6/mo |
| **GitHub Pages** | Static sites | Free |

---

## 9. Production Deployment Checklist

```
□ Code on GitHub (private repo)
□ Environment variables in secrets (not in code)
□ .env.example file (without real values)
□ SSL certificate (HTTPS)
□ Domain configured
□ Database backup strategy
□ Error monitoring (Sentry, Crashlytics)
□ CI/CD pipeline working
□ Rate limiting enabled
□ CORS properly configured
□ Logs accessible
□ Health check endpoint
```

---

## 10. Vidora — Deployment Plan

```
┌─────────────────────────────────────────────────┐
│ GitHub (Code)                                    │
│ ├── vidora-backend                              │
│ ├── vidora-frontend                             │
│ ├── vidora-desktop (Tauri)                      │
│ └── vidora-android (private)                    │
├─────────────────────────────────────────────────┤
│ CI/CD (GitHub Actions)                          │
│ ├── Backend → Deploy to Hetzner/Railway         │
│ ├── Frontend → Deploy to Vercel/Netlify         │
│ ├── Desktop → Build .exe + .dmg → Releases     │
│ └── Android → Build APK (optional)             │
├─────────────────────────────────────────────────┤
│ Infrastructure                                  │
│ ├── Backend: Hetzner VPS (€4/mo)               │
│ ├── Database: MySQL on same VPS                 │
│ ├── Storage: Backblaze B2                       │
│ ├── CDN: Cloudflare (free)                      │
│ ├── Domain: vidora.app                          │
│ ├── SSL: Cloudflare (free)                      │
│ └── Monitoring: UptimeRobot (free)              │
└─────────────────────────────────────────────────┘
```

---

## 11. Useful GitHub CLI Commands

```bash
# Install: brew install gh

gh auth login                   # GitHub login
gh repo create vidora-backend --private  # Repo create
gh pr create --title "Add login" --body "Login page added"
gh pr list                      # PRs dekho
gh pr merge 1                   # PR merge karo
gh release create v1.0.0        # Release banao
gh run list                     # Actions runs dekho
gh run watch                    # Live build status
```

---

## 12. Security Best Practices

1. **Never push secrets** (.env, API keys, passwords)
2. **Use GitHub Secrets** for CI/CD environment variables
3. **Enable 2FA** on GitHub account
4. **Use PAT (Personal Access Token)** instead of password
5. **Private repos** for production code
6. **Branch protection** on main (require PR review)
7. **Dependabot** enable (auto security updates)

---

## 13. Quick Reference Card

| Action | Command |
|--------|---------|
| New repo | `git init` |
| Stage all | `git add .` |
| Commit | `git commit -m "msg"` |
| Push | `git push` |
| Pull | `git pull` |
| New branch | `git checkout -b name` |
| Switch branch | `git checkout name` |
| Merge | `git merge name` |
| See status | `git status` |
| See history | `git log --oneline` |
| Tag release | `git tag v1.0.0 && git push origin v1.0.0` |
| Undo last commit | `git reset HEAD~1` |
| Clone repo | `git clone URL` |

---

*Created for Vidora project — June 2, 2026*
