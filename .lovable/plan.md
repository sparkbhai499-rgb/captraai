## RXP Caption AI — Complete Pivot Plan

Replacing Sellnix Partner entirely with **RXP Caption AI** — a video-caption SaaS with real AI transcription via Lovable AI Gateway (openai/gpt-4o-mini-transcribe). No extra API key needed — `LOVABLE_API_KEY` already exists.

### 1. Database migration (drop old, create new)
Drop: `orders, user_roles(delivery), batches, batch_*, whatsapp_*, my_agents*, communities, groups, contacts, messages, agent_settings, payment_requests, payment_settings, subscription_plans, user_subscriptions`.
Keep + repurpose: `profiles`, `user_roles(admin)`, `has_role()`.
New tables:
- `projects` — user_id, title, video_url, video_path, duration_sec, language, status(uploaded/transcribing/ready/failed), thumbnail_url
- `captions` — project_id, index, start_ms, end_ms, text, speaker (edited inline)
- `yt_metadata` — project_id, title, description, hashtags[], keywords[], tone
- `plans` — name, price_inr, minutes_included, features[]
- `subscriptions` — user_id, plan_id, status, expires_at
- `contact_messages` — name, email, subject, message

Storage buckets: `videos` (private, signed URLs), `thumbnails` (public).
RLS: users see only own projects/captions/yt_metadata/subscriptions; admin sees all; contact_messages insert-anon, admin read.

### 2. Edge functions
- `transcribe-video` — accepts `{project_id}`, downloads video from storage, extracts audio (send full file to `/v1/audio/transcriptions` with `openai/gpt-4o-mini-transcribe`, streaming), splits into ~5s caption chunks, inserts into `captions` table, marks project ready. Language auto-detect (Hindi/English/Hinglish/etc).
- `generate-yt-metadata` — takes project transcript, calls `google/gemini-3-flash-preview` with structured output, returns title/description/hashtags/keywords/tags.

### 3. Frontend — full replace
**Design tokens** (`index.css`): dark theme — bg `240 15% 6%`, cards glass `240 20% 12% / 0.6` with backdrop-blur, primary electric violet `265 90% 65%`, accent cyan `190 95% 55%`, gradient `linear-gradient(135deg, violet, cyan)`, glow shadows. Fonts: **Space Grotesk** (display) + **Inter** (body) via @fontsource. Framer Motion transitions everywhere.

**Pages:**
- `/` **Landing** — Hero (animated gradient blob, tagline "Create Professional AI Captions in Seconds"), inline Upload dropzone (redirects to /editor after upload), Live Demo player, Features grid (6 cards), Pricing (3 tiers), Testimonials carousel, FAQ accordion, Contact form, Footer.
- `/auth` — Login/Signup tabs, email/password + Google OAuth.
- `/dashboard` — Recent projects grid, quick upload, usage stats (minutes left).
- `/projects` — All projects list (search, filter by language/status).
- `/editor/:id` — Split view: video player (left) with live caption overlay; caption list (right) — editable rows, style panel (font/color/size/position/animation), tabs: Captions | Styling | YouTube Kit | Export.
  - Export: SRT / VTT / TXT download (client-side generated).
  - Burn-in: ffmpeg.wasm client-side option (with warning for large files).
- `/pricing` — Standalone pricing page.
- `/contact` — Contact form + FAQ.
- `/admin` — Users list, project count, contact messages (admin-only).

**Components:**
- `GlassCard`, `GradientButton`, `UploadDropzone`, `VideoPlayer` (with canvas caption overlay), `CaptionEditor`, `StylePanel`, `ExportMenu`, `Navbar` (sticky glass), `Footer`, `PricingCard`, `TestimonialCarousel`, `FAQAccordion`, `ContactForm`, `AnimatedBlob`.

### 4. Tech additions
- `@fontsource/space-grotesk`, `@fontsource/inter`
- `@ffmpeg/ffmpeg`, `@ffmpeg/util` (lazy-loaded only on burn action)
- Keep existing framer-motion, sonner, shadcn stack.

### 5. SEO / head
`index.html`: title "RXP Caption AI — Create Professional AI Captions in Seconds", meta description, og tags. Single H1 on landing.

### 6. Memory update
Rewrite `mem://index.md` core to reflect RXP Caption AI identity.

### Build order
1. Migration (drop + create + buckets + RLS + grants)
2. Edge functions (transcribe-video, generate-yt-metadata)
3. Design tokens + fonts + Tailwind config
4. Layout shell (Navbar, Footer, PageTransition kept)
5. Landing page + Auth
6. Dashboard + Projects list
7. Editor (player + caption editor + style panel + export + ffmpeg burn)
8. Admin + Contact + Pricing pages
9. Delete stale old files
10. Memory update

Confirm to proceed?