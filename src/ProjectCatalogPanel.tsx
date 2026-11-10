import { useMemo, useState } from "react";
import { BrowserProjectCatalogItems, type CatalogItemKind, type ProjectCatalogItem } from "./projectCatalog";

export function ProjectCatalogPanel({ projectId }: { projectId: string }) {
  const store = useMemo(() => new BrowserProjectCatalogItems(window.localStorage, `rayzen-marcenaria:project:${projectId}:catalog:v1`), [projectId]);
  const [items, setItems] = useState(() => store.load());
  const [draft, setDraft] = useState({ code: "", name: "", kind: "door" as CatalogItemKind, sourceReference: "" });
  const [message, setMessage] = useState<string | null>(null);
  function save() {
    const item: ProjectCatalogItem = { id: `catalog-${crypto.randomUUID()}`, ...draft, manufacturer: null, specifications: {}, active: true };
    try { setItems(store.save([...items, item])); window.dispatchEvent(new CustomEvent("rayzen:catalog-updated", { detail: { projectId } })); setDraft({ code: "", name: "", kind: "door", sourceReference: "" }); setMessage("Item salvo no catalogo deste projeto."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Nao foi possivel salvar o item."); }
  }
  function remove(id: string) { setItems(store.save(items.filter(item => item.id !== id))); window.dispatchEvent(new CustomEvent("rayzen:catalog-updated", { detail: { projectId } })); setMessage("Item removido do catalogo local."); }
  return <section className="catalog-panel" aria-labelledby="catalog-title">
    <header><div><span className="small-label">E1 · CATALOGO LOCAL</span><h2 id="catalog-title">Itens do projeto</h2></div><span>{items.length} ITEM(NS)</span></header>
    <p>Cadastre portas, gavetas, ferragens e equipamentos somente com origem conhecida.</p>
    <div className="measurement-form">
      <label>Codigo<input value={draft.code} onChange={event => setDraft({ ...draft, code: event.target.value })} /></label>
      <label>Nome<input value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} /></label>
      <label>Tipo<select value={draft.kind} onChange={event => setDraft({ ...draft, kind: event.target.value as CatalogItemKind })}><option value="door">Porta</option><option value="drawer">Gaveta</option><option value="hardware">Ferragem</option><option value="equipment">Equipamento</option></select></label>
      <label>Origem da especificacao<input value={draft.sourceReference} onChange={event => setDraft({ ...draft, sourceReference: event.target.value })} placeholder="Ex.: fabricante ou regra da oficina" /></label>
      <button type="button" onClick={save}>Adicionar item</button>
    </div>
    {message ? <p role="status">{message}</p> : null}
    {items.length ? <ul>{items.map(item => <li key={item.id}><strong>{item.code} · {item.name}</strong><small>{item.kind} · origem: {item.sourceReference}</small><button type="button" onClick={() => remove(item.id)}>Remover</button></li>)}</ul> : null}
  </section>;
}
