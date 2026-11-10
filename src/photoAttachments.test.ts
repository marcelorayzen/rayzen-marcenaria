import { describe, expect, it } from "vitest";
import { BrowserPhotoAttachments, createPhotoAttachment, maxPhotoBytes } from "./photoAttachments";
import type { KeyValueStorage } from "./browserProjectStorage";

class MemoryStorage implements KeyValueStorage {
  private readonly values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

const photo = {
  id: "photo-1", projectId: "project-1", revisionId: "revision-1", fileName: "parede.png",
  mimeType: "image/png" as const, byteSize: 128, dataUrl: "image/png;base64,AAAA",
  capturedAt: null, note: "Saida de esgoto", createdAt: "2026-11-10T10:00:00.000Z",
};

describe("local photo attachments", () => {
  it("validates and persists a revision-scoped photo", () => {
    const checked = createPhotoAttachment(photo);
    expect(checked.ok).toBe(true);
    const store = new BrowserPhotoAttachments(new MemoryStorage(), "photos:r1");
    expect(store.save([photo])).toEqual([photo]);
  });

  it("rejects unsupported types, oversized files and malformed data", () => {
    expect(createPhotoAttachment({ ...photo, mimeType: "image/gif" as never }).ok).toBe(false);
    expect(createPhotoAttachment({ ...photo, byteSize: maxPhotoBytes + 1 }).ok).toBe(false);
    expect(createPhotoAttachment({ ...photo, dataUrl: "not-base64" }).ok).toBe(false);
  });
});
