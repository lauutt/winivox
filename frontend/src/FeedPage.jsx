import { useCallback, useEffect, useRef, useState } from "react";
import AuthPanel from "./components/AuthPanel.jsx";
import Layout from "./components/Layout.jsx";
import Player from "./components/Player.jsx";
import SkeletonCard from "./components/SkeletonCard.jsx";
import Toast from "./components/Toast.jsx";
import { useAuth } from "./hooks/useAuth.js";
import { useFeed } from "./hooks/useFeed.js";
import { usePlayer } from "./hooks/usePlayer.js";
import { useToast } from "./hooks/useToast.js";
import { apiBase } from "./lib/api.js";

function FeedPage() {
  // Custom hooks
  const { token, email, password, authError, headers, setEmail, setPassword, handleRegister, handleLogin, handleLogout } = useAuth();
  const {
    feed,
    feedLoading,
    feedError,
    sortedFeed,
    sortMode,
    setSortMode,
    loadFeed,
    tagOptions,
    tagLoading,
    tagError,
    selectedTags,
    setSelectedTags,
    loadTags,
    lowSerendipia,
    lowSerendipiaLoading,
    lowSerendipiaError,
    loadLowSerendipia
  } = useFeed();
  const {
    currentTrack,
    autoPlay,
    playerNotice,
    playerError,
    sleepTimer,
    playbackRate,
    nextTrack,
    audioRef,
    selectTrack,
    skipToNext,
    handleTrackEnded,
    setSleepTimer,
    setPlaybackRate,
    setAutoPlay,
    setPlayerNotice,
    setPlayerError
  } = usePlayer(feed);
  const { toast, showToast, hideToast } = useToast();

  // Story modal state
  const [storyId, setStoryId] = useState(() => parseStoryFromUrl());
  const [story, setStory] = useState(null);
  const [storyLoading, setStoryLoading] = useState(false);
  const [storyError, setStoryError] = useState("");
  const [playingId, setPlayingId] = useState("");
  const [applaudedIds, setApplaudedIds] = useState(() => loadApplause(token));

  // Refs
  const storyModalRef = useRef(null);

  const closeStory = useCallback(() => {
    setStoryId(null);
    updateStoryInUrl(null);
  }, []);

  // Load tags and low serendipia on mount
  useEffect(() => {
    loadTags();
    loadLowSerendipia();
  }, [loadTags, loadLowSerendipia]);

  useEffect(() => {
    setApplaudedIds(loadApplause(token));
  }, [token]);

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

  // Cerrar modal con Escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape" && story) {
        closeStory();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [story, closeStory]);

  // Mover focus al modal cuando se abre
  useEffect(() => {
    if (story && storyModalRef.current) {
      storyModalRef.current.focus();
    }
  }, [story]);

  // Player logic now comes from usePlayer hook
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setPlayingId(currentTrack?.id || "");
    const handlePause = () => setPlayingId("");
    const handleEnded = () => setPlayingId("");

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [audioRef, currentTrack?.id]);

  const togglePlay = useCallback((item) => {
    if (!item) return;
    if (currentTrack?.id === item.id && audioRef.current) {
      if (!audioRef.current.paused) {
        audioRef.current.pause();
        setAutoPlay(false);
        return;
      }
    }
    selectTrack(item);
  }, [currentTrack?.id, audioRef, selectTrack, setAutoPlay]);

  const handleVote = useCallback(async (audioId) => {
    if (!token) {
      showToast("Inicia sesion para votar", "info");
      return;
    }
    if (applaudedIds.includes(audioId)) {
      showToast("Ya aplaudiste esta historia", "info");
      return;
    }
    try {
      const res = await fetch(`${apiBase}/votes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ audio_id: audioId })
      });
      if (res.status === 409) {
        const nextIds = saveApplause(token, applaudedIds, audioId);
        setApplaudedIds(nextIds);
        showToast("Ya aplaudiste esta historia", "info");
        return;
      }
      if (!res.ok) {
        throw new Error("vote failed");
      }
      const nextIds = saveApplause(token, applaudedIds, audioId);
      setApplaudedIds(nextIds);
      showToast("¡Aplauso enviado!", "success");
      await loadFeed(selectedTags);
    } catch {
      showToast("No se pudo votar", "error");
    }
  }, [token, showToast, headers, selectedTags, loadFeed, applaudedIds]);

  const handleTagToggle = useCallback((tag) => {
    setSelectedTags((prev) => {
      if (prev.includes(tag)) {
        return prev.filter((item) => item !== tag);
      }
      return [...prev, tag];
    });
  }, []);

  const clearTags = useCallback(() => {
    setSelectedTags([]);
  }, []);

  const loadStory = useCallback(async (id) => {
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
  }, []);

  const openStory = useCallback((id) => {
    setStoryId(id);
    updateStoryInUrl(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

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
    <Player
      currentTrack={currentTrack}
      audioRef={audioRef}
      onTrackEnded={handleTrackEnded}
      onSkip={skipToNext}
      onAutoPlayChange={setAutoPlay}
      onNoticeChange={setPlayerNotice}
      onErrorChange={setPlayerError}
      playerNotice={playerNotice}
      playerError={playerError}
      nextTrack={nextTrack}
      sleepTimer={sleepTimer}
      onSleepTimerChange={setSleepTimer}
      playbackRate={playbackRate}
      onPlaybackRateChange={setPlaybackRate}
      getTitleFn={getStoryTitle}
      truncateFn={truncateText}
    />
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
      {/* ARIA live region para anunciar estados del feed */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {feedLoading && "Cargando historias"}
        {!feedLoading && feed.length > 0 && `${feed.length} historias cargadas`}
        {!feedLoading && feed.length === 0 && !feedError && "No hay historias disponibles"}
      </div>

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

      {storyId ? (
        <section
          ref={storyModalRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="story-title"
          className="surface"
        >
          <button type="button" className="btn-ghost w-fit" onClick={closeStory}>
            Volver al inicio
          </button>
          {storyLoading && (
            <p className="mt-3 text-sm text-muted">Cargando historia...</p>
          )}
          {storyError && (
            <div className="mt-3 surface border-red-400 bg-red-50/50" role="alert">
              <p className="text-sm text-red-700">{storyError}</p>
              <button
                className="btn-primary mt-3"
                onClick={() => loadStory(storyId)}
              >
                Reintentar
              </button>
            </div>
          )}
          {!storyLoading && story && (
            <div className="mt-4 rounded-3xl border border-sand/60 bg-white p-5">
              <div
                className="cover-art h-40 w-full rounded-2xl"
                style={getCoverStyle(story)}
              />
              <h3 id="story-title" className="mt-4 text-xl">
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
                {story.user_id && (
                  <a
                    href={buildProfileUrl(story.user_id)}
                    className="text-[11px] text-muted underline decoration-sand/70 transition hover:text-ink"
                  >
                    Perfil
                  </a>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => selectTrack(story)}
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
            {feedError && (
              <div className="mt-3 surface border-red-400 bg-red-50/50" role="alert">
                <p className="text-sm text-red-700">{feedError}</p>
                <button
                  className="btn-primary mt-3"
                  onClick={() => loadFeed(selectedTags)}
                >
                  Reintentar
                </button>
              </div>
            )}
            <div className="mt-4 grid gap-4">
              {feedLoading ? (
                <>
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                </>
              ) : (
                sortedFeed.map((item) => {
                  const isPlaying = playingId === item.id;
                  const applauded = applaudedIds.includes(item.id);
                  return (
                    <article
                      key={item.id}
                      className="flex flex-col gap-3 rounded-3xl border border-sand/70 bg-white p-4 shadow-lift"
                    >
                      <div className="grid gap-4 sm:grid-cols-[110px_1fr]">
                        <button
                          type="button"
                          className={`cover-art cover-control h-28 sm:h-24 sm:w-24 ${
                            isPlaying ? "is-playing" : ""
                          }`}
                          style={getCoverStyle(item)}
                          onClick={() => togglePlay(item)}
                          aria-pressed={isPlaying}
                          aria-label={
                            isPlaying
                              ? `Pausar ${getStoryTitle(item)}`
                              : `Reproducir ${getStoryTitle(item)}`
                          }
                        >
                          <span className="cover-mask" aria-hidden="true" />
                          <span className="cover-icon cover-icon-play" aria-hidden="true" />
                          <span className="cover-icon cover-icon-pause" aria-hidden="true" />
                        </button>
                        <div className="flex flex-col gap-2">
                          <button
                            type="button"
                            className="text-left"
                            onClick={() => openStory(item.id)}
                            aria-label={`Ver historia: ${getStoryTitle(item)}`}
                          >
                            <h4 className="text-base">
                              {truncateText(getStoryTitle(item), 64)}
                            </h4>
                          </button>
                          <p className="text-sm text-muted">
                            {item.summary || "Esperando detalles"}
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            {(item.tags || []).map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center rounded-full border border-sand/70 bg-white px-3 py-1 text-[11px] text-muted"
                              >
                                {tag}
                              </span>
                            ))}
                            {item.user_id && (
                              <a
                                href={buildProfileUrl(item.user_id)}
                                className="text-[11px] text-muted underline decoration-sand/70 transition hover:text-ink"
                              >
                                Perfil
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          className={`applause-btn ${
                            applauded ? "applause-btn--active" : ""
                          }`}
                          onClick={() => handleVote(item.id)}
                          disabled={applauded}
                          aria-label={`Aplaudir historia ${getStoryTitle(item)}`}
                          title={applauded ? "Aplauso enviado" : "Aplaudir"}
                        >
                          <span className="applause-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path
                                d="M5 12.5l2.2 7.2h9.4l2-6.5M8.3 12.1l1.6-6.1M12 12.1l1.2-6.5M15.8 12.1l-1-5.3M18.3 11.6l.7-2.6"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.4"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </span>
                          <span className="text-xs">{item.vote_count}</span>
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
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
                {lowSerendipia.map((item) => {
                  const isPlaying = playingId === item.id;
                  return (
                    <div
                      key={`low-${item.id}`}
                      className="flex flex-wrap items-center gap-3 rounded-3xl border border-sand/70 bg-white p-4 shadow-lift"
                    >
                      <button
                        type="button"
                        className={`cover-art cover-control h-16 w-16 ${
                          isPlaying ? "is-playing" : ""
                        }`}
                        style={getCoverStyle(item)}
                        onClick={() => togglePlay(item)}
                        aria-pressed={isPlaying}
                        aria-label={
                          isPlaying
                            ? `Pausar ${getStoryTitle(item)}`
                            : `Reproducir ${getStoryTitle(item)}`
                        }
                      >
                        <span className="cover-mask" aria-hidden="true" />
                        <span className="cover-icon cover-icon-play" aria-hidden="true" />
                        <span className="cover-icon cover-icon-pause" aria-hidden="true" />
                      </button>
                      <div className="min-w-[200px] flex-1">
                        <button
                          type="button"
                          className="text-left"
                          onClick={() => openStory(item.id)}
                          aria-label={`Ver historia: ${getStoryTitle(item)}`}
                        >
                          <strong className="text-sm">
                            {truncateText(getStoryTitle(item), 64)}
                          </strong>
                        </button>
                        <p className="mt-1 text-xs text-muted">
                          {item.summary || "Audio con baja serendipia"}
                        </p>
                        {item.user_id && (
                          <a
                            href={buildProfileUrl(item.user_id)}
                            className="mt-2 inline-flex text-[11px] text-muted underline decoration-sand/70 transition hover:text-ink"
                          >
                            Perfil
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
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

      {/* Toast notifications */}
      {toast && <Toast {...toast} onClose={hideToast} />}
    </Layout>
  );
}

function getStoryTitle(item) {
  if (!item) return "Sin titulo";
  return item.title || item.summary || "Sin titulo";
}

// Story modal helpers (specific to FeedPage)
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

// UI helpers
function truncateText(text, max) {
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}...`;
}

function getCoverStyle(item) {
  if (!item?.cover_url) return undefined;
  return { backgroundImage: `url(${item.cover_url})` };
}

function buildProfileUrl(userId) {
  if (!userId) return "#";
  const params = new URLSearchParams({ id: userId });
  return `/profile-public/?${params.toString()}`;
}

function loadApplause(token) {
  if (!token || typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(`winivox.applause.${token}`);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveApplause(token, current, audioId) {
  const next = current.includes(audioId) ? current : [...current, audioId];
  if (!token || typeof window === "undefined") return next;
  window.localStorage.setItem(`winivox.applause.${token}`, JSON.stringify(next));
  return next;
}

export default FeedPage;
