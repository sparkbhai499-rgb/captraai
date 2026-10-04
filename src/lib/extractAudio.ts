// Extracts a small mono WAV from a video/audio file so transcription gets clean, compact audio
// (works for songs + big 500 MB videos; keeps payload under the ~25 MB transcription limit).
export async function extractAudioWav(file: File): Promise<Blob | null> {
  try {
    const buf = await file.arrayBuffer();
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
    const ctx = new Ctx();
    const decoded = await ctx.decodeAudioData(buf);
    ctx.close();
    // pick sample rate so output stays < ~24 MB
    const maxBytes = 24 * 1024 * 1024;
    let rate = 16000;
    while (rate > 8000 && decoded.duration * rate * 2 > maxBytes) rate -= 2000;
    const len = Math.ceil(decoded.duration * rate);
    const off = new OfflineAudioContext(1, len, rate);
    const src = off.createBufferSource();
    src.buffer = decoded; src.connect(off.destination); src.start();
    const out = (await off.startRendering()).getChannelData(0);
    // normalize so quiet vocals over music are louder
    let peak = 0; for (let i = 0; i < out.length; i += 4) peak = Math.max(peak, Math.abs(out[i]));
    const gain = peak > 0 ? Math.min(4, 0.95 / peak) : 1;
    const ab = new ArrayBuffer(44 + out.length * 2);
    const v = new DataView(ab);
    const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, "RIFF"); v.setUint32(4, 36 + out.length * 2, true); w(8, "WAVE"); w(12, "fmt ");
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    w(36, "data"); v.setUint32(40, out.length * 2, true);
    for (let i = 0; i < out.length; i++) {
      const s = Math.max(-1, Math.min(1, out[i] * gain));
      v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return new Blob([ab], { type: "audio/wav" });
  } catch (e) {
    console.warn("audio extract failed", e);
    return null;
  }
}
