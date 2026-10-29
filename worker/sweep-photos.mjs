// Photos of deleted houses (29 Oct 2026). A host can delete a house or their whole account (Guest Guide Maker, houses
// menu), but the database cannot delete files (storage.protect_delete). So the worker removes every guide-assets folder
// whose house no longer exists: at start, then at most once an hour.
// Safe by order: folders are listed before the houses, so a house made in between keeps its folder; only folders named
// like a house id are looked at; an empty list of houses stops everything; each folder's house is checked once more
// just before its files go.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function makeSweep({ url, headers, rest, fetchRetry, log, every = 3600000 }) {
  async function list(prefix) {
    const out = [];
    for (let offset = 0; ; offset += 1000) {
      const r = await fetchRetry(`${url}/storage/v1/object/list/guide-assets`, { method: 'POST', headers, body: JSON.stringify({ prefix, limit: 1000, offset }) });
      if (!r.ok) throw new Error(`storage list ${prefix || '/'} -> ${r.status}`);
      const page = await r.json(); out.push(...page);
      if (page.length < 1000) return out;
    }
  }
  async function filesUnder(prefix) {   // every file in a folder and its subfolders
    const files = [];
    for (const it of await list(prefix)) { const p = prefix + it.name; if (it.id) files.push(p); else files.push(...await filesUnder(p + '/')); }
    return files;
  }
  let last = 0, busy = false;
  return async function sweepPhotos(force = false) {
    if (busy || (!force && Date.now() - last < every)) return 0;
    busy = true; last = Date.now();
    try {
      const folders = (await list('')).filter(it => !it.id && UUID.test(it.name)).map(it => it.name);
      if (!folders.length) return 0;
      const houses = new Set(((await rest('/rest/v1/guides?select=id')) || []).map(g => g.id));
      if (!houses.size) return 0;
      let gone = 0;
      for (const id of folders.filter(f => !houses.has(f))) {
        if (((await rest(`/rest/v1/guides?select=id&id=eq.${id}`)) || []).length) continue;
        const files = await filesUnder(id + '/');
        for (let i = 0; i < files.length; i += 100) {
          const r = await fetchRetry(`${url}/storage/v1/object/guide-assets`, { method: 'DELETE', headers, body: JSON.stringify({ prefixes: files.slice(i, i + 100) }) });
          if (!r.ok) throw new Error(`storage delete ${id.slice(0, 8)} -> ${r.status}`);
        }
        gone += files.length;
        log(`Photos of a deleted house removed: ${files.length} file(s) (${id.slice(0, 8)}).`);
      }
      return gone;
    } finally { busy = false; }
  };
}
