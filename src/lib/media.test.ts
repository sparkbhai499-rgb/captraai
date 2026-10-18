import { describe, expect, it } from "vitest";
import { isAudioMedia, mediaKind } from "./media";

describe("audio caption sources", () => {
  it("recognizes an MP3 without a MIME type", () => {
    expect(isAudioMedia("voice.MP3")).toBe(true);
    expect(mediaKind("voice.MP3")).toBe("audio");
  });
  it("recognizes audio uploads by MIME type", () => {
    expect(mediaKind("recording", "audio/wav")).toBe("audio");
  });
  it("does not treat photos as caption sources", () => {
    expect(isAudioMedia("photo.png", "image/png")).toBe(false);
    expect(mediaKind("photo.png")).toBe("image");
  });
});