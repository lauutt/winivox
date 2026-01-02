import { useEffect, useMemo, useRef, useState } from "react";
import AuthPanel from "./components/AuthPanel.jsx";
import Layout from "./components/Layout.jsx";
import { apiBase, authHeaders, fetchJson } from "./lib/api.js";

function FeedPage() {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [feed, setFeed] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState("");
  const [currentTrack, setCurrentTrack] = useState(null);
  const [voteError, setVoteError] = useState("");
  const [tagOptions, setTagOptions] = useState([]);
  const [selectedTags, setSelectedTags] = useState(() => parseTagsFromUrl());
  const [tagLoading, setTagLoading] = useState(true);
  const [tagError, setTagError] = useState("");
  const [lowSerendipia, setLowSerendipia] = useState([]);
  const [lowSerendipiaLoading, setLowSerendipiaLoading] = useState(true);
  const [lowSerendipiaError, setLowSerendipiaError] = useState("");
  const [autoPlay, setAutoPlay] = useState(false);
  const [playerNotice, setPlayerNotice] = useState("");
  const [playerError, setPlayerError] = useState("");
  const [sortMode, setSortMode] = useState("latest");
  const [sleepTimer, setSleepTimer] = useState(0);
  const [storyId, setStoryId] = useState(() => parseStoryFromUrl());
  const [story, setStory] = useState(null);
  const [storyLoading, setStoryLoading] = useState(false);
  const [storyError, setStoryError] = useState("");
  const audioRef = useRef(null);
  const sleepTimerRef = useRef(null);

  const headers = useMemo(() => authHeaders(token), [token]);

  useEffect(() => {
    loadTags();
  }, []);

  useEffect(() => {
    loadLowSerendipia();
  }, []);

  useEffect(() => {
    loadFeed(selectedTags);
    updateTagsInUrl(selectedTags);
  }, [selectedTags]);

  useEffect(() => {
    const handlePop = () => {
      setStoryId(parseStoryFromUrl());
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  useEffect(() => {
    if (!storyId) {
      setStory(null);
      setStoryError("");
      return;
    }
    loadStory(storyId);
  }, [storyId]);

  useEffect(() => {
    if (!currentTrack || !autoPlay || !audioRef.current) return;
    audioRef.current
      .play()
      .catch(() => {
        setAutoPlay(false);
        setPlayerNotice("La reproduccion automatica fue bloqueada. Toca reproducir.");
      });
  }, [currentTrack, autoPlay]);

  useEffect(() => {
    if (sleepTimerRef.current) {
      clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }
    if (!sleepTimer) return;

    sleepTimerRef.current = setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setAutoPlay(false);
      setPlayerNotice("Temporizador finalizado.");
      setSleepTimer(0);
    }, sleepTimer * 60 * 1000);

    return () => {
      if (sleepTimerRef.current) {
        clearTimeout(sleepTimerRef.current);
        sleepTimerRef.current = null;
      }
    };
  }, [sleepTimer]);

  const loadTags = async () => {
    setTagLoading(true);
    setTagError("");
    try {
      const res = await fetch(`${apiBase}/feed/tags?limit=30`);
      if (!res.ok) {
        throw new Error("tags failed");
      }
      const data = await res.json();
      setTagOptions(data || []);
    } catch {
      setTagOptions([]);
      setTagError("No se pudieron cargar las etiquetas");
    } finally {
      setTagLoading(false);
    }
  };

  const loadFeed = async (tags = []) => {
    setFeedLoading(true);
    setFeedError("");
    try {
      const url = buildFeedUrl(tags);
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("feed failed");
      }
      const data = await res.json();
      setFeed(data || []);
    } catch {
      setFeed([]);
      setFeedError("No se pudieron cargar las historias");
    } finally {
      setFeedLoading(false);
    }
  };

  const loadLowSerendipia = async () => {
    setLowSerendipiaLoading(true);
    setLowSerendipiaError("");
    try {
      const res = await fetch(`${apiBase}/feed/low-serendipia?limit=6`);
      if (!res.ok) {
        throw new Error("low serendipia failed");
      }
      const data = await res.json();
      setLowSerendipia(data || []);
    } catch {
      setLowSerendipia([]);
      setLowSerendipiaError("No se pudo cargar esta seccion");
    } finally {
      setLowSerendipiaLoading(false);
    }
  };

  const sortedFeed = useMemo(() => {
    if (sortMode === "top") {
      return [...feed].sort((a, b) => {
        if (b.vote_count !== a.vote_count) {
          return b.vote_count - a.vote_count;
        }
        return new Date(b.published_at || 0) - new Date(a.published_at || 0);
      });
    }
    return feed;
  }, [feed, sortMode]);

  const handleRegister = async () => {
    setAuthError("");
    const res = await fetch(`${apiBase}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      setAuthError("No se pudo crear la cuenta");
      return;
    }
    const data = await res.json();
    localStorage.setItem("token", data.access_token);
    setToken(data.access_token);
  };

  const handleLogin = async () => {
    setAuthError("");
    const form = new URLSearchParams();
    form.append("username", email);
    form.append("password", password);
    const res = await fetch(`${apiBase}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form
    });
    if (!res.ok) {
      setAuthError("No se pudo iniciar sesion");
      return;
    }
    const data = await res.json();
    localStorage.setItem("token", data.access_token);
    setToken(data.access_token);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
  };

  const handleVote = async (audioId) => {
    if (!token) {
      setVoteError("Inicia sesion para votar");
      return;
    }
    setVoteError("");
    try {
      await fetchJson(`${apiBase}/votes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ audio_id: audioId })
      });
      await loadFeed(selectedTags);
    } catch {
      setVoteError("No se pudo votar");
    }
  };

  const handleSelectTrack = (item) => {
    setPlayerError("");
    setPlayerNotice("");
    setCurrentTrack(item);
    setAutoPlay(true);
  };

  const handleTagToggle = (tag) => {
    setSelectedTags((prev) => {
      if (prev.includes(tag)) {
        return prev.filter((item) => item !== tag);
      }
      return [...prev, tag];
    });
  };

  const clearTags = () => {
    setSelectedTags([]);
  };

  const handleTrackEnded = () => {
    const nextTrack = pickNextTrack(feed, currentTrack);
    if (nextTrack) {
      setCurrentTrack(nextTrack);
    }
  };

  const nextTrack = useMemo(
    () => pickNextTrack(feed, currentTrack),
    [feed, currentTrack]
  );

  const handleSkip = () => {
    if (!nextTrack) return;
    setCurrentTrack(nextTrack);
    setAutoPlay(true);
  };

  const loadStory = async (id) => {
    setStoryLoading(true);
    setStoryError("");
    try {
      const res = await fetch(`${apiBase}/feed/${id}`);
      if (!res.ok) {
        throw new Error("story failed");
      }
      const data = await res.json();
      setStory(data);
    } catch {
      setStory(null);
      setStoryError("No se pudo cargar la historia");
    } finally {
      setStoryLoading(false);
    }
  };

  const openStory = (id) => {
    setStoryId(id);
    updateStoryInUrl(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closeStory = () => {
    setStoryId(null);
    updateStoryInUrl(null);
  };

  const rightRail = (
    <>
      <div className="surface-glass">
        <h4 className="text-base">Sonando ahora</h4>
        <p className="mt-2 text-sm text-muted">
          {currentTrack ? getStoryTitle(currentTrack) : "Elegi una historia"}
        </p>
        {currentTrack && (
          <div className="mt-3 grid gap-1 text-xs text-muted">
            {currentTrack.tags && currentTrack.tags.length > 0 && (
              <span>Relacionado con: {currentTrack.tags.slice(0, 2).join(" · ")}</span>
            )}
            {nextTrack && (
              <span>
                Sigue:{" "}
                {truncateText(
                  getStoryTitle(nextTrack),
                  46
                )}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="surface-glass">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-base">Guia de temas</h4>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-icon"
              onClick={loadTags}
              aria-label="Actualizar etiquetas"
              title="Actualizar etiquetas"
            >
              ↻
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={clearTags}
              disabled={!selectedTags.length}
            >
              Limpiar
            </button>
          </div>
        </div>
        <p className="mt-2 text-sm text-muted">
          Elegi una etiqueta para orientar el flujo. Las historias siguen.
        </p>
        <div className="mt-3 text-xs text-muted">
          {tagLoading && <span>Cargando etiquetas...</span>}
          {tagError && (
            <span className="text-[#a24538]" role="alert">
              {tagError}
            </span>
          )}
          {!tagLoading && !tagError && tagOptions.length === 0 && (
            <span>Todavia no hay etiquetas.</span>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {tagOptions.map((tag) => (
            <button
              type="button"
              key={tag}
              className={`chip ${selectedTags.includes(tag) ? "chip-active" : "hover:bg-sand/40"}`}
              onClick={() => handleTagToggle(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
        {selectedTags.length > 0 && (
          <div className="mt-2 text-xs text-muted">
            Filtrando: {selectedTags.join(", ")}
          </div>
        )}
      </div>
    </>
  );

  const player = (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-sand/80 bg-white">
      <div className="mx-auto flex w-full flex-col gap-4 px-4 py-4 sm:px-6 lg:w-[80%] lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-1">
          <strong className="text-sm font-semibold">
            {currentTrack ? getStoryTitle(currentTrack) : "En pausa"}
          </strong>
          <span className="text-xs text-muted">
            {currentTrack ? "Al aire · comunidad" : "Elegi un audio"}
          </span>
          {sleepTimer > 0 && (
            <span className="text-xs text-muted">
              Temporizador: {sleepTimer}m
            </span>
          )}
          {currentTrack && nextTrack && (
            <span className="text-xs text-muted">
              Sigue:{" "}
              {truncateText(
                getStoryTitle(nextTrack),
                48
              )}
            </span>
          )}
          {playerError && (
            <span className="text-xs text-[#f3b0a3]" role="alert">
              {playerError}
            </span>
          )}
          {!playerError && playerNotice && (
            <span className="text-xs text-muted" role="status">
              {playerNotice}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {currentTrack && (
            <audio
              className="w-full sm:w-64"
              controls
              ref={audioRef}
              src={currentTrack.public_url}
              onEnded={handleTrackEnded}
              onPlay={() => {
                setAutoPlay(true);
                setPlayerNotice("");
                setPlayerError("");
              }}
              onError={() => {
                setAutoPlay(false);
                setPlayerError("Audio no disponible. Proba otro.");
              }}
            />
          )}
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full border border-sand/80 px-3 py-1 text-xs font-semibold text-ink transition hover:bg-sand/60 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleSkip}
            disabled={!nextTrack}
          >
            Saltar
          </button>
          <label className="flex items-center gap-2 text-xs text-muted">
            <span>Temporizador</span>
            <select
              className="w-auto rounded-full border border-sand/70 bg-white px-3 py-1 text-xs text-ink"
              value={sleepTimer}
              onChange={(event) => setSleepTimer(Number(event.target.value))}
              disabled={!currentTrack}
            >
              <option value={0}>Apagado</option>
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={45}>45 min</option>
            </select>
          </label>
        </div>
      </div>
    </div>
  );

  return (
    <Layout
      current="feed"
      token={token}
      onLogout={handleLogout}
      heroTitle="Radio de la comunidad"
      heroCopy="Confesiones, dilemas, anecdotas y mensajes cortos. Subi tu audio y sumalo a la radio."
      heroBadgeLabel="Ahora"
      heroBadgeValue="Audios en comunidad"
      rightRail={rightRail}
      player={player}
    >
      {!token && (
        <AuthPanel
          email={email}
          password={password}
          onEmailChange={(event) => setEmail(event.target.value)}
          onPasswordChange={(event) => setPassword(event.target.value)}
          onRegister={handleRegister}
          onLogin={handleLogin}
          error={authError}
        />
      )}
      {voteError && (
        <p className="mt-3 text-sm text-[#a24538]" role="alert">
          {voteError}
        </p>
      )}

      {storyId ? (
        <section className="surface">
          <button type="button" className="btn-ghost w-fit" onClick={closeStory}>
            Volver al inicio
          </button>
          {storyLoading && (
            <p className="mt-3 text-sm text-muted">Cargando historia...</p>
          )}
          {storyError && (
            <p className="mt-3 text-sm text-[#a24538]" role="alert">
              {storyError}
            </p>
          )}
          {!storyLoading && story && (
            <div className="mt-4 rounded-3xl border border-sand/60 bg-white p-5">
              <h3 className="text-xl">
                {story.title || story.summary || "Historia sin titulo"}
              </h3>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted">
                <span>
                  {story.published_at
                    ? new Date(story.published_at).toLocaleDateString()
                    : "Reciente"}
                </span>
                {story.tags && story.tags.length > 0 && (
                  <span>{story.tags.join(" · ")}</span>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => handleSelectTrack(story)}
                >
                  Escuchar esta historia
                </button>
              </div>
              {story.summary && (
                <p className="mt-3 text-sm text-muted">{story.summary}</p>
              )}
              <div
                className="mt-4 rounded-2xl border border-sand/60 bg-white p-4 text-sm text-ink"
                aria-live="polite"
              >
                <h4 className="text-base">Transcripcion completa</h4>
                <p className="mt-2 whitespace-pre-wrap">
                  {story.transcript || "Transcripcion en proceso."}
                </p>
              </div>
            </div>
          )}
        </section>
      ) : (
        <>
          <section className="surface">
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg">Historias recientes</h3>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center rounded-full border border-sand/70 bg-white p-1">
                  <button
                    type="button"
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      sortMode === "latest"
                        ? "bg-accent/80 text-ink"
                        : "text-muted hover:bg-sand/40"
                    }`}
                    onClick={() => setSortMode("latest")}
                  >
                    Recientes
                  </button>
                  <button
                    type="button"
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      sortMode === "top"
                        ? "bg-accent/80 text-ink"
                        : "text-muted hover:bg-sand/40"
                    }`}
                    onClick={() => setSortMode("top")}
                  >
                    Mas votadas
                  </button>
                </div>
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => loadFeed(selectedTags)}
                  aria-label="Actualizar historias"
                  title="Actualizar historias"
                >
                  ↻
                </button>
              </div>
            </div>
            {feedLoading && (
              <p className="mt-3 text-sm text-muted">Cargando historias...</p>
            )}
            {feedError && (
              <p className="mt-3 text-sm text-[#a24538]" role="alert">
                {feedError}
              </p>
            )}
            <div className="mt-4 grid gap-4">
              {sortedFeed.map((item) => (
                <article
                  key={item.id}
                  className="flex flex-col gap-4 rounded-3xl border border-sand/70 bg-white p-4 shadow-lift"
                >
                  <button
                    type="button"
                    className="group grid gap-4 text-left sm:grid-cols-[110px_1fr]"
                    onClick={() => openStory(item.id)}
                    aria-label={`Ver historia: ${getStoryTitle(item)}`}
                  >
                    <div className="cover-art h-28 sm:h-24 sm:w-24" />
                    <div>
                      <h4 className="text-base">
                        {truncateText(getStoryTitle(item), 64)}
                      </h4>
                      <p className="mt-2 text-sm text-muted">
                        {item.summary || "Esperando detalles"}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(item.tags || []).map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center rounded-full border border-sand/70 bg-white px-3 py-1 text-[11px] text-muted"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </button>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => handleSelectTrack(item)}
                    >
                      Escuchar
                    </button>
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() => handleVote(item.id)}
                    >
                      Me gusta {item.vote_count}
                    </button>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => openStory(item.id)}
                    >
                      Ver historia
                    </button>
                  </div>
                </article>
              ))}
            </div>
            {!feedLoading && feed.length === 0 && !feedError && (
              <p className="mt-4 text-sm text-muted">
                {selectedTags.length
                  ? "No hay historias con esas etiquetas."
                  : "Todavia no hay historias."}
              </p>
            )}
            <div className="mt-6">
              <a href="/upload/" className="btn-ink">
                Subi una historia
              </a>
            </div>
          </section>
          <section className="surface">
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-3">
                <span className="text-xs uppercase tracking-[0.3em] text-muted">
                  Contenido
                </span>
                <h3 className="text-xl">Audios que nacen de la comunidad</h3>
                <p className="text-sm text-muted">
                  Confesiones, dilemas, anecdotas, mensajes cortos, rarezas y escenas
                  cotidianas. La radio se arma con lo que cada persona comparte.
                </p>
                <p className="text-sm text-muted">
                  Subi un audio, se procesa en segundo plano y se suma al aire.
                  Tu biblioteca muestra el estado.
                </p>
                <div className="mt-4 grid gap-2 text-sm text-muted">
                  <strong className="text-ink">Como sumarte</strong>
                  <ol className="grid gap-1 pl-4">
                    <li>Subi o graba un audio.</li>
                    <li>Lo seguimos mientras avanza.</li>
                    <li>Cuando termina, aparece en la radio.</li>
                  </ol>
                </div>
              </div>
              <div className="grid gap-4">
                <div className="aspect-[4/3] w-full rounded-3xl border border-sand/80 bg-sand/40" />
                <div className="aspect-[16/9] w-full rounded-3xl border border-sand/80 bg-cream" />
                <p className="text-xs text-muted">
                  Imagenes de ejemplo: visuales simples, notas y portadas para
                  cada historia.
                </p>
              </div>
            </div>
          </section>
          <section className="surface">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg">Peor serendipia</h3>
                <p className="mt-1 text-sm text-muted">
                  Una seccion especial para audios con baja serendipia.
                </p>
              </div>
            </div>
            {lowSerendipiaLoading && (
              <p className="mt-3 text-sm text-muted">
                Cargando seccion...
              </p>
            )}
            {!lowSerendipiaLoading && lowSerendipiaError && (
              <p className="mt-3 text-sm text-[#a24538]" role="alert">
                {lowSerendipiaError}
              </p>
            )}
            {!lowSerendipiaLoading && !lowSerendipiaError && lowSerendipia.length > 0 ? (
              <div className="mt-4 grid gap-3">
                {lowSerendipia.map((item) => (
                  <div
                    key={`low-${item.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-sand/70 bg-white p-4 shadow-lift"
                  >
                    <div className="min-w-[200px] flex-1">
                      <strong className="text-sm">
                        {truncateText(getStoryTitle(item), 64)}
                      </strong>
                      <p className="mt-1 text-xs text-muted">
                        {item.summary || "Audio con baja serendipia"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => handleSelectTrack(item)}
                      >
                        Escuchar
                      </button>
                      <button
                        type="button"
                        className="btn-outline"
                        onClick={() => openStory(item.id)}
                      >
                        Ver historia
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              !lowSerendipiaLoading &&
              !lowSerendipiaError && (
                <p className="mt-3 text-sm text-muted">
                  Todavia no hay audios en esta seccion.
                </p>
              )
            )}
          </section>
          <section className="surface">
            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="aspect-[3/4] w-full rounded-3xl border border-sand/80 bg-sand/30" />
              <div className="space-y-3">
                <span className="text-xs uppercase tracking-[0.3em] text-muted">
                  Ritmo
                </span>
                <h3 className="text-xl">Radio sin cortes</h3>
                <p className="text-sm text-muted">
                  Elegi etiquetas para orientar el flujo y escucha sin interrupciones.
                  Abrir una historia no corta el audio.
                </p>
                <p className="text-sm text-muted">
                  La radio sigue mientras exploras nuevas voces de la comunidad.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted">
                  <span className="chip">Confesiones</span>
                  <span className="chip">Dilemas</span>
                  <span className="chip">Anecdotas</span>
                  <span className="chip">Mensajes cortos</span>
                  <span className="chip">Rarezas</span>
                  <span className="chip">Vida cotidiana</span>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </Layout>
  );
}

function getStoryTitle(item) {
  if (!item) return "Sin titulo";
  return item.title || item.summary || "Sin titulo";
}

function pickNextTrack(feed, currentTrack) {
  if (!feed.length) return null;
  if (!currentTrack) return feed[0];

  const currentIndex = feed.findIndex((item) => item.id === currentTrack.id);
  if (currentIndex === -1) return feed[0];

  const currentTags = new Set(
    (currentTrack.tags || []).map((tag) => String(tag).toLowerCase())
  );

  if (currentTags.size > 0) {
    for (let offset = 1; offset < feed.length; offset += 1) {
      const candidate = feed[(currentIndex + offset) % feed.length];
      const candidateTags = (candidate.tags || []).map((tag) =>
        String(tag).toLowerCase()
      );
      if (candidateTags.some((tag) => currentTags.has(tag))) {
        return candidate;
      }
    }
  }

  if (feed.length > 1) {
    return feed[(currentIndex + 1) % feed.length];
  }
  return null;
}

function parseTagsFromUrl() {
  if (typeof window === "undefined") return [];
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("tags") || params.get("tag") || "";
  return raw
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function updateTagsInUrl(tags) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (tags.length) {
    url.searchParams.set("tags", tags.join(","));
  } else {
    url.searchParams.delete("tags");
  }
  url.searchParams.delete("tag");
  window.history.replaceState({}, "", url.toString());
}

function parseStoryFromUrl() {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  return params.get("story") || "";
}

function updateStoryInUrl(storyId) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (storyId) {
    url.searchParams.set("story", storyId);
  } else {
    url.searchParams.delete("story");
  }
  window.history.pushState({}, "", url.toString());
}

function buildFeedUrl(tags) {
  if (!tags.length) return `${apiBase}/feed`;
  const params = new URLSearchParams();
  params.set("tags", tags.join(","));
  return `${apiBase}/feed?${params.toString()}`;
}

function truncateText(text, max) {
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}...`;
}

export default FeedPage;
