import type { KeyValueStorage } from "./browserProjectStorage";

export const photoMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;
export type PhotoMimeType = (typeof photoMimeTypes)[number];
export const maxPhotoBytes = 10 * 1024 * 1024;

export interface PhotoAttachment {
  id: string;
  projectId: string;
  revisionId: string;
  fileName: string;
  mimeType: PhotoMimeType;
  byteSize: number;
  dataUrl: string;
  capturedAt: string | null;
  note: string;
  linkedRecordIds: string[];
  createdAt: string;
}

export type PhotoAttachmentValidation =
  | { ok: true; attachment: PhotoAttachment }
  | { ok: false; errors: string[] };

export function createPhotoAttachment(input: PhotoAttachment): PhotoAttachmentValidation {
  const errors: string[] = [];
  if (!input.id.trim() || !input.projectId.trim() || !input.revisionId.trim()) errors.push("Identifique foto, projeto e revisao.");
  if (!input.fileName.trim()) errors.push("Informe o nome do arquivo da foto.");
  if (!(photoMimeTypes as readonly string[]).includes(input.mimeType)) errors.push("Tipo de foto nao suportado.");
  if (!Number.isSafeInteger(input.byteSize) || input.byteSize <= 0 || input.byteSize > maxPhotoBytes) errors.push("A foto deve ter entre 1 byte e 10 MB.");
  if (!input.dataUrl.startsWith(`data:${input.mimeType};base64,`)) errors.push("O conteudo da foto nao esta em base64 valido para o tipo informado.");
  if (input.note.length > 1000) errors.push("A observacao da foto deve ter no maximo 1.000 caracteres.");
  if (input.linkedRecordIds.some(id => !id.trim()) || new Set(input.linkedRecordIds).size !== input.linkedRecordIds.length) errors.push("Os vinculos da foto precisam ter IDs unicos e nao vazios.");
  if (Number.isNaN(Date.parse(input.createdAt))) errors.push("Data de registro da foto invalida.");
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, attachment: JSON.parse(JSON.stringify(input)) as PhotoAttachment };
}

export function validatePhotoAttachments(value: unknown): PhotoAttachment[] {
  if (!Array.isArray(value)) return [];
  const result: PhotoAttachment[] = [];
  const ids = new Set<string>();
  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object") continue;
    const attachment = candidate as PhotoAttachment;
    if (ids.has(attachment.id)) continue;
    const checked = createPhotoAttachment(attachment);
    if (checked.ok) {
      ids.add(attachment.id);
      result.push(checked.attachment);
    }
  }
  return result;
}

export class BrowserPhotoAttachments {
  constructor(private readonly storage: KeyValueStorage, private readonly key: string) {}

  load(): PhotoAttachment[] {
    const raw = this.storage.getItem(this.key);
    if (!raw) return [];
    try { return validatePhotoAttachments(JSON.parse(raw) as unknown); } catch { return []; }
  }

  save(attachments: PhotoAttachment[]): PhotoAttachment[] {
    const valid = validatePhotoAttachments(attachments);
    if (valid.length !== attachments.length) throw new Error("A lista de fotos contem anexo invalido ou duplicado.");
    this.storage.setItem(this.key, JSON.stringify(valid));
    return valid;
  }
}
