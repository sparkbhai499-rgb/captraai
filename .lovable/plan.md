## Goal
Pivot W8sap from AI chat/WhatsApp clone into a **Study Course platform** where admin creates batches and uploads PDFs/notes, optional video lectures, posts announcements, and students enroll to access content.

## Scope
- **Full replace**: remove AI chat UI, WhatsApp chat, contacts, groups, communities, my-agents pages from navigation/routing.
- Keep: auth (email/password), profiles, admin role system, avatars storage.

## New Database Schema (migration)
- `batches` — name, description, cover_image, created_by, is_published
- `batch_contents` — batch_id, type (`pdf` | `video` | `note`), title, description, file_url (PDF in storage), video_url (YouTube/link), order_index
- `batch_enrollments` — batch_id, user_id, joined_at (unique pair)
- `batch_announcements` — batch_id, title, message, created_at

Storage bucket: `batch-pdfs` (private; signed URLs for enrolled students + admin).

RLS:
- Batches: everyone authenticated can view published; only admin insert/update/delete.
- batch_contents/announcements: enrolled students + admin read; admin write.
- enrollments: user can self-enroll & view own; admin can view all.

## New Pages
- `/` — **Home**: list all published batches as cards (cover, name, description, Enroll/Open button).
- `/batch/:id` — Batch detail: tabs for **Contents** (PDF list w/ download + video lectures embed) and **Announcements**. Enroll button if not enrolled.
- `/my-batches` — Student's enrolled batches.
- `/admin` — Admin dashboard rewritten:
  - Create/edit/delete batches
  - Upload PDFs to a batch (file picker → Supabase storage)
  - Add video lecture (paste YouTube/MP4 URL + title)
  - Post announcement
  - Manage users (keep ban/unban)
- `/auth` — login/signup (existing).
- `/profile`, `/settings` — keep.

## Pages to Remove
Index AI chat, WhatsApp agent, my-agents, agent landing, create-group, create-community, embed widget section, edge functions w8sap-ai/agent-chat/whatsapp-webhook (leave files but unroute, or delete).

## UI Direction
Clean education theme — replace WhatsApp green with indigo/blue scholar palette. Card-grid layout for batches. Top header with logo "StudyHub" + nav (Browse, My Batches, Admin if admin) + profile avatar dropdown.

## Technical Notes
- PDFs stored in private `batch-pdfs` bucket; download via `supabase.storage.from('batch-pdfs').createSignedUrl()` only if enrolled.
- Videos: YouTube embed via iframe if URL is youtube, else `<video>` tag.
- Use react-pdf? No — just open signed URL in new tab; keep light.
- Realtime announcement updates optional (skip v1).

## Build Order
1. Migration (tables + storage bucket + RLS + grants).
2. Remove old routes from `App.tsx`, delete old chat components from active tree.
3. Build `BatchesHome`, `BatchDetail`, `MyBatches`, new `AdminPage`.
4. Update theme tokens in `index.css` for study look.
5. Update memory file to reflect new app identity.

Confirm to proceed?