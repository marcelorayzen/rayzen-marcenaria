import { useMemo, useState, type ChangeEvent } from "react";
import { BrowserPhotoAttachments, createPhotoAttachment, maxPhotoBytes, type PhotoAttachment } from "./photoAttachments";

function storageKey(projectId: string, revisionId: string) {
  return `rayzen-marcenaria:project:${projectId}:revision:${revisionId}:photos:v1`;
}

export function PhotoAttachmentPanel({ projectId, revisionId }: { projectId: string; revisionId: string }) {
  const store = useMemo(() => new BrowserPhotoAttachments(window.localStorage, storageKey(projectId, revisionId)), [projectId, revisionId]);
  const [photos, setPhotos] = useState<PhotoAttachment[]>(() => store.load());
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  function addPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > maxPhotoBytes) { setMessage("A foto deve ter no maximo 10 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      const result = createPhotoAttachment({
        id: `photo-${crypto.randomUUID()}`, projectId, revisionId, fileName: file.name,
        mimeType: file.type as PhotoAttachment["mimeType"], byteSize: file.size, dataUrl,
        capturedAt: null, note: note.trim(), createdAt: new Date().toISOString(),
      });
      if (!result.ok) { setMessage(result.errors.join(" ")); return; }
      const next = store.save([...photos, result.attachment]);
      setPhotos(next); setNote(""); setMessage("Foto anexada a esta revisao local.");
    };
    reader.onerror = () => setMessage("Nao foi possivel ler a foto neste dispositivo.");
    reader.readAsDataURL(file);
  }

  function removePhoto(id: string) {
    const next = photos.filter(photo => photo.id !== id);
    setPhotos(store.save(next));
    setMessage("Foto removida desta revisao local.");
  }

  return <section className="photo-attachments" aria-labelledby="photo-attachments-title">
    <header><div><span className="small-label">EVIDENCIA LOCAL</span><h2 id="photo-attachments-title">Fotos do levantamento</h2></div><span>{photos.length} FOTO(S)</span></header>
    <p>As fotos ficam somente neste dispositivo e nesta revisao enquanto a sincronizacao remota nao for validada.</p>
    <label>Observacao da proxima foto<textarea value={note} onChange={event => setNote(event.target.value)} maxLength={1000} placeholder="Ex.: saida de esgoto na parede esquerda" /></label>
    <label className="text-button">Adicionar foto<input type="file" accept="image/jpeg,image/png,image/webp" onChange={addPhoto} hidden /></label>
    {message ? <p role="status">{message}</p> : null}
    {photos.length > 0 ? <div>{photos.map(photo => <article key={photo.id}>
      <img src={photo.dataUrl} alt={photo.note || photo.fileName} loading="lazy" />
      <div><strong>{photo.fileName}</strong><small>{photo.note || "Sem observacao"}</small></div>
      <button type="button" onClick={() => removePhoto(photo.id)}>Remover</button>
    </article>)}</div> : null}
  </section>;
}
