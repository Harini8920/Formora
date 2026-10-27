# Formora — Animated Form Builder

A polished Google Forms-inspired starter app built with React, Vite, Framer Motion, Lucide icons, and optional Supabase cloud persistence/authentication.

## Included

- Responsive dashboard with forms, drafts, published status, and stats
- Create forms from scratch or starter templates
- Question types: short answer, paragraph, multiple choice, checkboxes, dropdown, rating, date, number, email
- Edit question titles, descriptions, options, required status, and ordering
- Form preview and public share URL (`?form=FORM_ID`)
- Public submissions and response list
- CSV export of responses
- Light/dark theme toggle
- Analytics overview
- Supabase email/password auth and cloud forms/responses when configured
- Local browser demo mode if Supabase is not configured
- Animated interactions and reduced-motion accessibility support

## Requirements

- Node.js 20 or newer (Node 22 LTS recommended)
- npm
- A Supabase project for online accounts and cross-device persistence (optional for local demo)

## 1. Run locally

1. Extract the ZIP.
2. Open the extracted `formora` folder in VS Code.
3. Open a terminal in that folder.
4. Run:

   ```bash
   npm install
   cp .env.example .env
   npm run dev
   ```

   On Windows PowerShell, use `Copy-Item .env.example .env` instead of `cp`.
5. Open the local URL Vite prints, usually `http://localhost:5173`.

Without Supabase environment variables, the app uses browser local storage. This mode is for trying the interface and is not a multi-user database.

## 2. Configure Supabase

1. Create a project at https://supabase.com/.
2. In the project dashboard, open **SQL Editor**, create a query, paste all of `supabase/schema.sql`, and run it.
3. Open **Project Settings → API** (or the Connect panel, depending on dashboard version).
4. Copy the project URL and the **publishable key** (or legacy `anon` key).
5. Add them to `.env`:

   ```env
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
   ```

6. Stop and restart the dev server after editing `.env`.
7. Open Settings → Continue to create an account. Confirm the email if Supabase email confirmation is enabled, then sign in.

**Never put a Supabase `service_role` or secret key in a frontend `.env` variable.** The publishable/anon key is intended for browser use when row-level security policies are correctly configured.

### Important production notes

- This starter schema uses text IDs for form IDs because the demo can create IDs in the browser. Do not accept untrusted client-supplied IDs as a security boundary.
- Add rate limiting / CAPTCHA and abuse monitoring before allowing public submissions at scale.
- Consider requiring email verification, configuring your site's allowed redirect URLs, and setting sensible auth/session policies.
- Add server-side file storage and signed URLs before implementing uploads.
- For sensitive data, review your privacy policy, retention rules, and legal requirements before launch.
- Public published-form reads intentionally expose published form content. Do not store private data in the form's public content JSON.
- The included starter does not yet implement file uploads, team collaboration, custom domains, advanced branching, email notifications, or one-response enforcement. UI settings for these advanced options are not security enforcement.

## 3. Build for production

```bash
npm run build
npm run preview
```

The production output is written to `dist/`.

## 4. Deploy to Render (static site)

1. Push this project to a GitHub repository.
2. In Render, create **New → Static Site** and connect the repo.
3. Build command: `npm install && npm run build`
4. Publish directory: `dist`
5. Add environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Render.
6. Deploy.
7. In Supabase Authentication URL configuration, set the Site URL and allowed redirect URLs to your deployed domain.

The app's public form links use the same site URL with a `?form=...` query parameter. Ensure the static host serves `index.html` for the root route.

## 5. Deploy to Vercel

Import the repository, use the Vite preset, set build command `npm run build`, output directory `dist`, and add the same environment variables.

## Current scope / honest limitations

This is a functional starter platform, not a fully audited Google Forms replacement. Core form creation, editing, public response collection, response viewing, CSV export, dashboard, theme switching, and Supabase integration are implemented. Advanced branching, file uploads, collaboration, robust spam prevention, scheduled closing, email notifications, and enforced per-user response limits need additional development before production use.
