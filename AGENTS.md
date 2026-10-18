# Project rules
- Audio and video caption generation share the authenticated `transcribe-video` function, which resolves owned project or asset storage paths; never accept arbitrary media URLs.
- Keep audio classification in `src/lib/media.ts` so upload and Studio initialization choose the same media type.
- Studio transcript editing and subtitle downloads use persisted caption rows; timeline text layers are inserted in one batch to avoid per-caption undo/render overhead.