# Deploying CampusShare (GitHub + Netlify)

## What Netlify is

[Netlify](https://www.netlify.com) is a free hosting service for websites made of static files (HTML, CSS, JS), like CampusShare. You give it the project folder, or connect a GitHub repository. It serves the site at a public link such as `https://campus-share.netlify.app`, with HTTPS. **Anyone with the link can open the app** on any phone or laptop. They don't need an account or any installation.

When the site is connected to GitHub, every `git push` redeploys it automatically in about 30 seconds.

> Data still stays in each visitor's own browser (`localStorage`). Everyone gets their own copy of the demo; visitors don't see each other's changes. See SUBMISSION.md §4, assumption 1.

---

## Step 1: Put the code on GitHub

The local repository is initialised and every file is staged. Make the first commit under your own name (one-time setup):

```bash
git config user.name "Your Name"
git config user.email "you@example.com"
git commit -m "CampusShare: campus sharing prototype with tests and docs"
```

Then, on the GitHub website:

1. Sign in at <https://github.com>, click **New repository**.
2. Name it `campus-share`. Choose **Public** so anyone can see it. **Do not** tick "Add a README" (one already exists).
3. Click **Create repository**, then run these commands in the project folder. They are shown on GitHub's page too.

```bash
git remote add origin https://github.com/<your-username>/campus-share.git
git push -u origin main
```

GitHub will ask you to sign in in the browser the first time.

Your code is now at `https://github.com/<your-username>/campus-share`. Anyone can read it, and the README renders on the front page.

---

## Step 2: Publish with Netlify

### Option A: connected to GitHub (recommended, auto-updates)

1. Go to <https://app.netlify.com> and sign up with **GitHub**.
2. **Add new site → Import an existing project → GitHub →** choose `campus-share`.
3. Leave the build command empty and set the publish directory to `.` (both come from `netlify.toml`). Click **Deploy**.
4. **Site configuration → Change site name** → e.g. `campus-share-iitm` gives `https://campus-share-iitm.netlify.app`.

From now on, every push to `main` redeploys the site.

### Option B: drag and drop (fastest, no GitHub needed)

1. Go to <https://app.netlify.com/drop>.
2. Drag the whole `Campus Share` folder onto the page. `node_modules` is not needed, so you can delete it first or ignore it.
3. You get a link immediately. Sign in to keep it permanently and rename it.

### Option C: GitHub Pages (alternative)

On the GitHub repo, open **Settings → Pages → Source: Deploy from a branch → `main` / root**. The site appears at `https://<your-username>.github.io/campus-share/`.

---

## Step 3: Finish the submission

1. Paste the Netlify link and the GitHub link into the TODO fields at the top of `docs/SUBMISSION.md` and `README.md`.
2. Commit and push: `git commit -am "Add live links" && git push`.
3. Open the link on your phone and do one full borrow flow, using the "Viewing as" switcher to play both sides.

## Why this setup

| Choice | Merit |
|---|---|
| Static hosting (no server) | Free, fast (Lighthouse 100) and nothing to maintain or secure. |
| Netlify connected to GitHub | Every push redeploys, so the link always matches the code graders read. |
| Public GitHub repo | Graders can read the code, docs, prompt log and test suite at one link. |
| `netlify.toml` in the repo | Deployment settings and security headers are versioned with the code ("docs as code", L5 s37). |
