# Winivox — Tags semánticos “livianos” (Embeddings + grafo)  
**Objetivo:** habilitar que la “radio” navegue por *tags semánticamente cercanos* (ej. “Relaciones amorosas” → “Rupturas”, “Celos”, “Infidelidad”, “Citas”, etc.) **con costo mínimo**, sin depender de búsquedas caras ni inferencia LLM en runtime.

---

## 1) Recomendación ejecutiva (lo más liviano y robusto)

Para mantener costos, UX y moderación bajo control, lo mejor es **no** dejar que el sistema “explote” en miles de tags casi sinónimos. La estrategia que te recomiendo es:

1. **Separar “tags crudos” (raw tags) de “tags canónicos” (canonical tags)**  
   - El LLM puede proponer tags libres (“relación tóxica”, “amor no correspondido”, “pareja a distancia”…).  
   - El producto (feed, radio, filtros) trabaja con un conjunto **estable y deduplicado** de **tags canónicos** (idealmente 30–200, empezando con tus 20–40).

2. **Asignar embeddings solo a los tags canónicos y (opcionalmente) a aliases**, pero **una sola vez** por tag (no por request).  
   - Embedding en **worker** (offline) + cache.  
   - Nunca generás embeddings en el endpoint de “play”.

3. **Precomputar un grafo de similitud entre tags canónicos** (“vecinos semánticos”)  
   - Para cada tag canónico guardás sus **Top‑K vecinos** por similitud coseno.  
   - Runtime: la radio consulta una lista ya precomputada (DB/Redis), costo prácticamente cero.

4. **Mapear cada tag nuevo propuesto por el LLM al tag canónico más cercano** (con umbral y/o revisión)  
   - Esto te da la experiencia “semántica” sin pagar el costo organizacional/UX de tags infinitos.

Resultado:  
- **Costo de cómputo**: constante y bajo.  
- **Costo de tokens**: opcional (si usás embeddings externos) y muy bajo (strings cortos).  
- **Infra adicional**: opcional (podés hacerlo sin vector DB).  
- **UX**: consistente (no hay 15 variantes del mismo tag).

---

## 2) Enfoques posibles (y cuál elegir)

### A) (Recomendado) Canonical tags + aliases + grafo precomputado (sin vector DB)
**Cuándo:** MVP y fase 2; tags canónicos <= 200–500.

- Guardás embeddings de tags canónicos.  
- Para mapear raw→canonical: calculás similitud contra embeddings canónicos en memoria (cache) en el worker.  
- Para “radio”: usás vecinos precomputados.

**Pros:** muy simple, barato, pocas piezas.  
**Contras:** si querés 50k tags canónicos, ya conviene ANN/vector DB.

---

### B) Canonical tags + pgvector (Postgres) para nearest neighbor
**Cuándo:** cuando querés crecer (1k–200k tags canónicos) sin meter OpenSearch.

- Postgres + extensión **pgvector** con índice aproximado (HNSW/IVF).  
- Query “dame tags similares” directo en SQL.

**Pros:** una sola base (Postgres), búsquedas rápidas.  
**Contras:** requiere extensión y algo más de tuning.

---

### C) OpenSearch / Elasticsearch kNN
**Cuándo:** cuando ya vas a usar OpenSearch igual (búsqueda full‑text, filtros, embeddings de audios).

**Pros:** escala y features.  
**Contras:** más operativo y costo.

---

## 3) Diseño propuesto (A) en detalle — mínimo costo, máximo control

### 3.1 Componentes
- **Worker de tagging** (ya lo tenés): genera raw tags.
- **Worker de normalización de tags** (nuevo, liviano):
  1) normaliza string,  
  2) busca alias exacto,  
  3) si no existe, embebe y hace match a tag canónico,  
  4) guarda mapping (alias → canonical).
- **Job batch/event** (nuevo): recalcula vecinos semánticos cuando cambia el set canónico.
- **API /feed/radio**: usa grafo precomputado + ranking de audios.

### 3.2 Por qué esto es “barato”
- Embeddings se calculan **1 vez por tag** (y los tags son pocos).  
- La radio hace **lookups de IDs** (neighbors) + query estándar de audios.  
- No hay LLM ni embeddings on-demand.

---

## 4) Cambios de modelo de datos

> Nota: te lo planteo compatible con tu esquema actual (Postgres + Redis).  
> Si preferís mantener `audio_submissions.tags` como jsonb, igual podés; pero para performance y consultas, conviene normalizar a join tables.

### 4.1 Tablas nuevas

#### `tags` (canónicos)
- `id` (uuid)
- `name` (text) — “Relaciones amorosas”
- `slug` (text, unique) — “relaciones-amorosas”
- `description` (text, nullable) — 1–2 líneas (mejora embeddings)
- `embedding` (vector o float[]) — según implementación
- `status` (enum) — `ACTIVE | DEPRECATED | CANDIDATE`
- `created_at`

#### `tag_aliases` (raw tags normalizados)
- `id` (uuid)
- `alias_text` (text) — texto normalizado, ej “amor no correspondido”
- `canonical_tag_id` (uuid fk tags.id)
- `created_at`
- `source` (enum) — `LLM | ADMIN | USER`
- `unique(alias_text)`

#### `audio_tags` (relación N‑N)
- `audio_id` (uuid fk audio_submissions.id)
- `tag_id` (uuid fk tags.id)
- `confidence` (float) — del LLM o del mapper
- `created_at`
- `unique(audio_id, tag_id)`

#### `tag_neighbors` (grafo precomputado)
- `tag_id` (uuid)
- `neighbor_tag_id` (uuid)
- `similarity` (float) — coseno en [0,1]
- `rank` (int) — 1..K
- `updated_at`
- `unique(tag_id, neighbor_tag_id)`

### 4.2 ¿Guardar embeddings dónde?
**MVP ultra‑simple:**  
- Guardás embeddings como `float[]` (array) o JSON, y los cargás a memoria en el worker/radio.  
- El cálculo “tag similar” se hace con Python + cache.

**Escalable con mínima fricción:**  
- `pgvector` (tipo `vector(384)` o `vector(768)`) y un índice HNSW/IVF.  
- Te habilita query de vecinos en SQL sin levantar matrices en memoria.

---

## 5) Embeddings: qué modelo usar sin pagar tokens

Tenés dos caminos “low-cost”:

### 5.1 Embeddings locales (cero tokens)
Usar `sentence-transformers` (CPU) con un modelo **multilingüe** (por el español).  
Candidatos típicos (ejemplos, elegí uno y probalo con tu data):
- Multilingüe MiniLM (rápido, 384 dims)
- Multilingual‑E5‑small (buena calidad/velocidad)
- BGE multilingüe (si querés más calidad)

**Ventaja:** cero costo por llamada a proveedor.  
**Costo real:** CPU (muy bajo porque “tag” es texto corto).

### 5.2 Embeddings externos (tokens mínimos, pero costo variable)
Si preferís no correr modelo propio, embeddings como servicio suelen ser baratos para strings cortas.  
Aun así, mi recomendación para tu objetivo (“no gastar de más”) es empezar con **local embeddings** y, si en producción preferís externalizar, cambiás el backend de embeddings sin tocar el resto.

---

## 6) Normalización + deduplicación: evitar “explosión de tags”

### 6.1 Normalización de texto (determinista)
Antes de cualquier embedding:
- lowercase
- trim
- quitar tildes/diacríticos (opcional, pero ayuda)
- colapsar espacios
- quitar puntuación
- singularizar/pluralizar (opcional)
- lista de stopwords mínima (opcional)

Esto te resuelve *muchos* casos sin IA (“relaciones amorosas” vs “Relación amorosa”).

### 6.2 Match por etapas (barato → caro)
Cuando llega un raw tag `t`:

1) **Exact match por `alias_text`** en `tag_aliases`  
2) **Exact match por `slug`** en `tags`  
3) **Embedding + nearest canonical**  
   - Calculás embedding de `t` (una vez)  
   - Buscás el canónico más cercano  
   - Si `similarity >= TH_ACCEPT` ⇒ mapeás automático  
   - Si `TH_REVIEW <= similarity < TH_ACCEPT` ⇒ lo marcás para revisión (opcional)  
   - Si `< TH_REVIEW` ⇒ lo creás como `CANDIDATE` (o lo descartás)

### 6.3 Umbrales sugeridos (para arrancar)
- `TH_ACCEPT`: 0.86–0.92 (depende modelo/datos)  
- `TH_REVIEW`: 0.75–0.85

No hay “mágico”: se ajusta con un set de evaluación rápido (20–50 casos reales).

### 6.4 Política recomendada para nuevos canónicos
Para mantener calidad:
- Un tag nuevo queda como **CANDIDATE**  
- Se “promueve” a `ACTIVE` si:
  - aparece ≥ N veces en una ventana (ej. 20 veces en 7 días) **y**
  - no es similar a un canónico existente **y**
  - (opcional) pasa revisión admin

Esto mantiene el set canónico estable.

---

## 7) Grafo de similitud de tags (lo que usa la radio)

### 7.1 Construcción
Cada vez que cambia el set canónico (alta/baja/promo):
1) tomás embeddings de todos los `ACTIVE`
2) calculás similitud coseno entre cada tag y los demás
3) guardás Top‑K vecinos por tag en `tag_neighbors`

Para 40–200 tags, esto es trivial (O(n²) con n pequeño).  
Para 1k tags, sigue siendo manejable si lo haces batch (1M pares).  
Para 10k, ya conviene ANN (pgvector/OpenSearch).

### 7.2 K recomendado
- MVP: `K = 8–20`  
- Más grande no necesariamente mejora; puede degradar diversidad.

### 7.3 Runtime
- Dado un `tag_id`, el endpoint pide `tag_neighbors` (cacheable).
- La radio elige el “siguiente tag” muestreando vecinos con pesos por similitud.

---

## 8) Algoritmo de “radio guiada por tags” (simple, efectivo)

### 8.1 Estado mínimo (seed)
Para que sea reproducible y barato, devolvé un `seed` y un “contexto” corto:
- `current_tag_id`
- `recent_tag_ids` (últimos 5–10)
- `excluded_audio_ids` (últimos 20–50) o un cursor temporal
- `mode`: `explore|focused` (opcional)

El cliente lo manda en cada request a `/feed/radio`.

### 8.2 Selección del próximo tag (Markov simple)
1) vecinos = `tag_neighbors[current_tag]`
2) filtrás vecinos ya usados recientemente
3) sampleás con probabilidad ∝ `(similarity ** alpha)`  
   - `alpha` ~ 2 favorece los más cercanos  
4) con prob pequeña `epsilon` (ej. 0.1) “explorás” un tag random ponderado por popularidad reciente

### 8.3 Selección de audios
Para el `next_tag`:
- candidatos = audios `APPROVED` con ese tag (join `audio_tags`)
- score = ranking MVP (likes/plays/age_decay) + boost por “match tag”
- excluís audios ya escuchados recientemente
- devolvés N items (ej. 10) + `next_seed`

### 8.4 Diversidad
Para evitar “loop” y monotonía:
- no repetir tag en ventana de 5
- no repetir audio en ventana de 50
- si un tag queda sin candidatos, fallback a:
  - tag vecino #2, o
  - “Nuevos”, o
  - “Top semanal”

---

## 9) Integración con tu pipeline actual

### 9.1 Dónde encaja
En tu pipeline “Tagging” (stage 4) agregás un sub‑stage:

**4.a Tagging (LLM)** → produce raw tags  
**4.b Tag mapping (nuevo)** → raw tags → canonical tags  
**4.c Persist** → `audio_tags` + `audio_submissions.tags` (si querés mantener jsonb como cache)

### 9.2 Eventos
- `audio.tagged` (raw)  
- `audio.tags_mapped` (canonical)  
- `tag.candidate_created` (si aparece un tag nuevo)  
- `tag.graph_rebuilt` (cuando recalculás vecinos)

---

## 10) API cambios mínimos

### 10.1 Endpoint de radio
`GET /feed/radio?tag_id=...&seed=...`

Devuelve:
- lista de audios (metadata + stream URL si corresponde)
- `context` (seed actualizado)
- `explain` opcional: `{current_tag, next_tag, similarity}`

### 10.2 Endpoint de tags (opcional)
- `GET /tags` (lista de tags canónicos, para UI)
- `GET /tags/{id}/neighbors` (debug/admin)

---

## 11) Performance y costos: qué esperar

### 11.1 Costo de embeddings
- Se calcula **solo cuando** aparece un alias nuevo o un tag canónico nuevo.  
- Los strings son cortos, así que CPU/tiempo es mínimo.

### 11.2 Costo de radio
- Lectura de vecinos (cache) + query SQL por audios.  
- Esto escala bien.

### 11.3 Caching recomendado
Redis:
- `tag_neighbors:{tag_id}` → lista de (neighbor_id, sim)
- `tag_embedding:{tag_id}` → embedding (si hacés cálculos en app)
- `tag_canonical_list` → IDs + embeddings (para el mapper)

TTL: 1–6 horas, invalidación on-change.

---

## 12) Plan de implementación (paso a paso)

### Fase 1 — Data model + foundations
1) Crear migraciones:
   - `tags`, `tag_aliases`, `audio_tags`, `tag_neighbors`
2) Poblar `tags` con tu taxonomía inicial (20–40) + `description` breve
3) Implementar `normalize_tag(text)` (función determinista)
4) Implementar `TagRepository` (CRUD + fetch embeddings)

**DoD:** tablas y repos listos, tags iniciales creados.

---

### Fase 2 — Embeddings (local) + backfill
1) Agregar lib `sentence-transformers`
2) Implementar `embed(text) -> vector`
3) Backfill embeddings para todos los `tags.ACTIVE`
4) Guardar embeddings en DB (o en un artefact store si preferís)

**DoD:** embeddings calculados y persistidos para tags canónicos.

---

### Fase 3 — Mapper raw→canonical (worker)
1) En el stage de tagging, capturar raw tags (strings)
2) Por cada raw tag:
   - normalizar
   - buscar alias exacto
   - si no existe:
     - embedding + nearest canonical (en memoria o DB)
     - aplicar umbrales
     - crear alias o candidate
3) Insertar `audio_tags` (con `confidence`)
4) (Opcional) guardar raw tags en jsonb para auditoría

**DoD:** cada audio aprobado termina con `audio_tags` canónicos consistentes.

---

### Fase 4 — Grafo de similitud + cache
1) Implementar job `rebuild_tag_graph(K=12)`
   - calcula Top‑K vecinos por coseno
   - upsert en `tag_neighbors`
2) Cache Redis para neighbors
3) Hook: cuando un tag se promueve/depreca → encolar rebuild

**DoD:** cada tag canónico tiene vecinos listos.

---

### Fase 5 — Radio endpoint con navegación semántica
1) Implementar `/feed/radio`
2) Selección `next_tag` con Markov simple + diversidad
3) Query de audios por `audio_tags`
4) Integrar ranking base + filtros (visibility, reports, etc.)
5) Instrumentar métricas

**DoD:** la radio se mueve por tags similares y entrega audios de forma estable.

---

## 13) Testing y observabilidad (mínimo necesario)

### Tests
- Unit:
  - `normalize_tag()`
  - “mapper”: thresholds + casos de sinonimia
  - “radio”: no repite tags/audios en ventana
- Integration:
  - flujo tagging → mapping → radio
- Regression set:
  - 30–50 pares (raw tag, canonical esperado)

### Métricas clave
- `tag_alias_created_total`
- `tag_candidate_created_total`
- `tag_mapping_similarity_distribution` (histograma)
- `radio_fallback_rate` (cuántas veces no hay candidatos)
- `radio_repeat_rate` (repetición de tag/audio)

---

## 14) Checklist de decisiones (para cerrar antes de codear)
1) ¿Tags canónicos visibles al usuario? (recomendado: sí)  
2) ¿Se permiten tags “CANDIDATE” en producción? (recomendado: no, solo para análisis)  
3) ¿Embeddings locales vs externos? (recomendado: local primero)  
4) K vecinos (recomendado: 12) y ventana anti‑repetición (5 tags / 50 audios)  
5) Umbrales `TH_ACCEPT` y `TH_REVIEW` (arrancar conservador y ajustar)

---

## 15) Extensión natural (fase 2+): embeddings de audio
Cuando tengas volumen:
- embeddeás el *resumen* o el *transcript* del audio
- usás similitud audio‑audio para radio más fina
- los tags siguen siendo “control de UX” y filtros

Pero para el objetivo de ahora (liviano y barato), el grafo de tags canónicos te da el 80/20.

---  

## Apéndice: implementación sin vector DB (cómo hacer nearest)
Si `tags` <= 200:
- En el worker, cargás embeddings canónicos en memoria (o Redis)
- Para cada raw tag:
  - emb = embed(raw)
  - best = argmax(cosine(emb, tag_embeddings))
  - listo

Complejidad: O(N_tags) por raw tag, N_tags pequeño, ultra barato.

