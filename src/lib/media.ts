export const isAudioMedia = (name: string, mime = "") =>
  mime.startsWith("audio/") || /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(name);

export const mediaKind = (name: string, mime = ""): "audio" | "video" | "image" | "gif" => {
  if (isAudioMedia(name, mime)) return "audio";
  if (mime === "image/gif" || /\.gif$/i.test(name)) return "gif";
  if (mime.startsWith("image/") || /\.(jpg|jpeg|png|webp|bmp|avif)$/i.test(name)) return "image";
  return "video";
};

export const probeMediaDuration = (file: File, kind: string): Promise<number | null> =>
  new Promise((resolve) => {
    if (kind === "image" || kind === "gif") return resolve(null);
    const media = document.createElement(kind === "audio" ? "audio" : "video");
    const url = URL.createObjectURL(file);
    const finish = (duration: number | null) => {
      clearTimeout(timer);
      media.onloadedmetadata = null;
      media.onerror = null;
      media.removeAttribute("src");
      URL.revokeObjectURL(url);
      resolve(duration);
    };
    const timer = setTimeout(() => finish(null), 15000);
    media.preload = "metadata";
    media.onloadedmetadata = () => finish(Number.isFinite(media.duration) ? media.duration : null);
    media.onerror = () => finish(null);
    media.src = url;
  });