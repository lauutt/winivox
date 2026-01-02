import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AuthPanel from "./components/AuthPanel.jsx";
import Layout from "./components/Layout.jsx";
import { useAuth } from "./hooks/useAuth.js";
import { apiBase, fetchJson, logDev } from "./lib/api.js";

const STEP_LABELS = {
  0: "En cola",
  1: "Normalizado",
  2: "Transcripto",
  3: "Moderado",
  4: "Etiquetado",
  5: "Audio ajustado",
  6: "Publicado"
};

const TERMINAL_STATUSES = new Set(["APPROVED", "REJECTED", "QUARANTINED"]);

function LibraryPage() {
  // Custom hooks
  const { token, email, password, authError, headers, setEmail, setPassword, handleRegister, handleLogin, handleLogout } = useAuth();

  // Auth check (específico de LibraryPage)
  const [authChecked, setAuthChecked] = useState(false);

  // Submissions state
  const [submissions, setSubmissions] = useState([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [submissionsError, setSubmissionsError] = useState("");
  const [hasPending, setHasPending] = useState(false);
  const [liveState, setLiveState] = useState("idle");
  const [streamError, setStreamError] = useState("");
  const [pollingFallback, setPollingFallback] = useState(false);
  const [eventsById, setEventsById] = useState({});
  const [timelineOpen, setTimelineOpen] = useState({});
  const [eventsLoading, setEventsLoading] = useState({});
  const [eventsError, setEventsError] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);
  const [lastEventAt, setLastEventAt] = useState(null);
  const [healthStatus, setHealthStatus] = useState({
    loading: true,
    error: "",
    data: null
  });
  const [statusFilter, setStatusFilter] = useState("all");

  // Refs
  const refreshTimerRef = useRef(null);
  const streamRef = useRef(null);

  const refreshSubmissions = async () => {
    setSubmissionsLoading(true);
    setSubmissionsError("");
    try {
      const data = await fetchJson(`${apiBase}/submissions`, { headers });
      const list = data || [];
      setSubmissions(list);
      setHasPending(list.some((item) => !TERMINAL_STATUSES.has(item.status)));
      setLastUpdated(new Date());
      return list;
    } catch (error) {
      setSubmissions([]);
      setHasPending(false);
      setSubmissionsError("No se pudieron cargar tus audios.");
      throw error;
    } finally {
      setSubmissionsLoading(false);
    }
  };

  const scheduleRefresh = () => {
    if (refreshTimerRef.current) return;
    refreshTimerRef.current = setTimeout(() => {
      refreshTimerRef.current = null;
      refreshSubmissions().catch((error) => {
        logDev("refresh failed", error);
      });
    }, 600);
  };

  const handleReprocess = useCallback(async (submissionId) => {
    if (!token) return;
    try {
      await fetchJson(`${apiBase}/submissions/${submissionId}/reprocess`, {
        method: "POST",
        headers
      });
      scheduleRefresh();
    } catch {
      setSubmissionsError("No se pudo reprocesar. Proba de nuevo.");
    }
  }, [token, headers, scheduleRefresh]);

  const handleDelete = useCallback(async (submissionId) => {
    if (!token) return;
    const confirmed = window.confirm(
      "¿Querés borrar esta historia? Se elimina de tu biblioteca y del feed."
    );
    if (!confirmed) return;
    try {
      await fetchJson(`${apiBase}/submissions/${submissionId}`, {
        method: "DELETE",
        headers
      });
      await refreshSubmissions();
    } catch {
      setSubmissionsError("No se pudo borrar la historia. Proba de nuevo.");
    }
  }, [token, headers, refreshSubmissions]);

  const toggleTimeline = useCallback(async (submissionId) => {
    const isOpen = timelineOpen[submissionId];
    if (isOpen) {
      setTimelineOpen((prev) => ({ ...prev, [submissionId]: false }));
      return;
    }
    if (!eventsById[submissionId]) {
      setEventsLoading((prev) => ({ ...prev, [submissionId]: true }));
      setEventsError((prev) => ({ ...prev, [submissionId]: "" }));
      try {
        const data = await fetchJson(
          `${apiBase}/events?submission_id=${submissionId}`,
          { headers }
        );
        setEventsById((prev) => ({ ...prev, [submissionId]: data || [] }));
      } catch {
        setEventsById((prev) => ({ ...prev, [submissionId]: [] }));
        setEventsError((prev) => ({
          ...prev,
          [submissionId]: "No se pudieron cargar los eventos."
        }));
      } finally {
        setEventsLoading((prev) => ({ ...prev, [submissionId]: false }));
      }
    }
    setTimelineOpen((prev) => ({ ...prev, [submissionId]: true }));
  }, [timelineOpen, eventsById, headers]);

  useEffect(() => {
    if (!token) {
      setAuthChecked(true);
      return;
    }

    fetchJson(`${apiBase}/auth/me`, { headers })
      .then(() => {
        setAuthChecked(true);
        return refreshSubmissions();
      })
      .catch((error) => {
        if (error.status === 401) {
          localStorage.removeItem("token");
          setToken(null);
          setAuthChecked(true);
          return;
        }
        setSubmissions([]);
        setSubmissionsError("No se pudieron cargar tus audios.");
      });
  }, [token, headers]);

  const fetchHealth = async () => {
    setHealthStatus({ loading: true, error: "", data: null });
    try {
      const res = await fetch(`${apiBase}/health`);
      if (!res.ok) {
        throw new Error("health unavailable");
      }
      const data = await res.json();
      setHealthStatus({ loading: false, error: "", data });
    } catch (error) {
      setHealthStatus({
        loading: false,
        error: "Estado del sistema no disponible",
        data: null
      });
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  useEffect(() => {
    if (!pollingFallback || !token) return;

    const interval = setInterval(() => {
      refreshSubmissions().catch((error) => {
        logDev("polling failed", error);
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [pollingFallback, token, headers]);

  useEffect(() => {
    if (!token) return;

    const since = new Date().toISOString();
    const streamUrl = new URL(`${apiBase}/events/stream`);
    streamUrl.searchParams.set("token", token);
    streamUrl.searchParams.set("since", since);

    setLiveState("connecting");
    setStreamError("");
    const source = new EventSource(streamUrl.toString());
    streamRef.current = source;

    source.onopen = () => {
      setLiveState("live");
      setStreamError("");
      setPollingFallback(false);
    };

    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        setEventsById((prev) => {
          if (!payload?.submission_id || !prev[payload.submission_id]) {
            return prev;
          }
          const existing = prev[payload.submission_id];
          if (existing.some((item) => item.id === payload.id)) {
            return prev;
          }
          return {
            ...prev,
            [payload.submission_id]: [payload, ...existing]
          };
        });
        setLastEventAt(new Date());
        scheduleRefresh();
      } catch (error) {
        logDev("event parse failed", error);
      }
    };

    source.onerror = () => {
      setLiveState("error");
      setStreamError("Se corto la conexion en vivo. Pasamos a refresco automatico.");
      setPollingFallback(true);
    };

    return () => {
      source.close();
      streamRef.current = null;
      setLiveState("idle");
    };
  }, [token]);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.close();
      }
    };
  }, []);

  // Auth functions now come from useAuth hook

  const pending = submissions.filter(
    (item) => !TERMINAL_STATUSES.has(item.status)
  );
  const nextUp = pending[0];
  const filteredSubmissions = useMemo(() => {
    if (statusFilter === "all") return submissions;
    if (statusFilter === "processing") {
      return submissions.filter((item) => !TERMINAL_STATUSES.has(item.status));
    }
    return submissions.filter(
      (item) => item.status.toLowerCase() === statusFilter
    );
  }, [submissions, statusFilter]);
  const filters = [
    { id: "all", label: "Todo" },
    { id: "processing", label: "En proceso" },
    { id: "approved", label: "Publicado" },
    { id: "rejected", label: "Rechazado" },
    { id: "quarantined", label: "En revision" }
  ];
  const liveDotClass =
    liveState === "live"
      ? "bg-emerald-600 animate-pulse-soft"
      : liveState === "connecting"
        ? "bg-amber-500 animate-pulse"
        : pollingFallback
          ? "bg-amber-500"
          : "bg-sand/80";

  return (
    <Layout
      current="library"
      token={token}
      onLogout={handleLogout}
      heroTitle="Tu biblioteca en vivo"
      heroCopy="Aca vas a ver el estado de tus audios hasta que se suman a la radio."
      heroBadgeLabel="Estado"
      heroBadgeValue="En vivo"
    >
      {/* ARIA live region para anunciar actualizaciones */}
      {token && (
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {liveState === "live" && `Conexión en vivo establecida. ${submissions.length} audios en biblioteca.`}
          {liveState === "connecting" && "Conectando con el servidor"}
          {liveState === "error" && streamError && `Error de conexión: ${streamError}`}
          {lastUpdated && !submissionsLoading && `Biblioteca actualizada hace ${Math.floor((new Date() - lastUpdated) / 1000)} segundos`}
        </div>
      )}

      {!token && authChecked && (
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

      {!token && authChecked && (
        <section className="surface border-dashed border-sand/70 bg-white">
          <h3 className="text-lg">Necesitas iniciar sesion</h3>
          <p className="mt-2 text-sm text-muted">
            Inicia sesion para ver tus audios y su estado.
          </p>
          <div className="mt-4">
            <a href="/" className="btn-ink">
              Volver al inicio
            </a>
          </div>
        </section>
      )}

      {token && (
        <section className="surface">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-lg">Mi biblioteca</h3>
              <p className="mt-1 text-sm text-muted">
                Vista en vivo de tus audios. Se actualiza sola mientras avanza.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="btn-icon"
                onClick={refreshSubmissions}
                aria-label="Actualizar biblioteca"
                title="Actualizar biblioteca"
              >
                ↻
              </button>
              <div className="flex items-center gap-2 text-xs text-muted">
                <span className={`h-2 w-2 rounded-full ${liveDotClass}`} />
                <span>
                  {liveState === "live"
                    ? hasPending
                      ? "En vivo"
                      : "En espera"
                    : liveState === "connecting"
                      ? "Conectando"
                      : pollingFallback
                        ? "Refrescando"
                        : "En pausa"}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button
                key={filter.id}
                type="button"
                className={`rounded-full border border-sand/70 px-3 py-1 text-xs font-medium transition ${
                  statusFilter === filter.id
                    ? "bg-accent/80 text-ink"
                    : "bg-white text-muted hover:bg-sand/60"
                }`}
                onClick={() => setStatusFilter(filter.id)}
              >
                {filter.label}
              </button>
            ))}
          </div>
          {lastUpdated && (
            <div className="mt-2 text-xs text-muted">
              Actualizado {lastUpdated.toLocaleTimeString()}
            </div>
          )}
          {lastEventAt && (
            <div className="mt-1 text-xs text-muted">
              Ultimo evento {lastEventAt.toLocaleTimeString()}
            </div>
          )}
          {nextUp && (
            <div className="mt-3 text-xs text-muted">
              Siguiente:{" "}
              <strong className="text-ink">
                {truncateText(getSubmissionTitle(nextUp), 48)}
              </strong>{" "}
              · {STEP_LABELS[nextUp.processing_step] || "En cola"}
            </div>
          )}

          <div className="mt-4">
            <ul className="grid gap-3">
              {filteredSubmissions.map((item) => {
                const isProcessing = !TERMINAL_STATUSES.has(item.status);
                const progress = getProgress(item.processing_step);
                const hasHighPotential = item.high_potential === true;
                return (
                  <li
                    key={item.id}
                    className={`flex flex-col gap-3 rounded-3xl border border-sand/70 bg-white p-4 shadow-lift ${
                      isProcessing ? "animate-breathe" : ""
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={`h-2 w-2 rounded-full ${getStatusDotClass(
                          item.status
                        )}`}
                        aria-hidden="true"
                      />
                      <div
                        className="cover-art h-16 w-16 rounded-2xl border border-sand/70"
                        style={getCoverStyle(item)}
                        aria-label="Portada del audio"
                      />
                      <div className="flex min-w-[200px] flex-1 flex-col gap-1">
                        <strong className="text-sm">
                          {truncateText(getSubmissionTitle(item), 72)}
                        </strong>
                        <span className="text-xs text-muted">
                          {describeSubmission(item)}
                        </span>
                        {hasHighPotential && (
                          <span className="text-xs text-ink">
                            Este audio tiene un gran potencial.
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        className="btn-ghost text-xs"
                        onClick={() => toggleTimeline(item.id)}
                      >
                        {timelineOpen[item.id] ? "Ocultar detalle" : "Ver detalle"}
                      </button>
                    </div>
                    {isProcessing && (
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                        <span>
                          Paso: {STEP_LABELS[item.processing_step] || "En cola"}
                        </span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-sand/60">
                          <div
                            className="h-full rounded-full bg-accent/80"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                    <div className="text-xs text-muted">
                      Paso {item.processing_step}/6
                    </div>
                    {timelineOpen[item.id] && (
                      <div className="grid gap-3 border-t border-dashed border-sand/70 pt-3 text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <a href="/upload/" className="btn-ghost text-xs">
                            Subir otro
                          </a>
                          <button
                            type="button"
                            className="btn-icon"
                            onClick={() => handleReprocess(item.id)}
                            aria-label="Reprocesar audio"
                            title="Reprocesar audio"
                          >
                            ↻
                          </button>
                          <button
                            type="button"
                            className="btn-ghost text-xs text-[#a24538]"
                            onClick={() => handleDelete(item.id)}
                          >
                            Borrar
                          </button>
                        </div>
                        {item.status === "APPROVED" && (
                          <a href={`/?story=${item.id}`} className="btn-outline w-fit">
                            Ver historia completa
                          </a>
                        )}
                        {item.moderation_result &&
                          item.moderation_result !== "APPROVE" && (
                            <span className="text-xs text-muted">
                              Moderacion: {item.moderation_result}
                            </span>
                          )}
                        <div className="grid gap-2 text-xs text-muted">
                          {eventsLoading[item.id] && (
                            <span>Cargando eventos...</span>
                          )}
                          {!eventsLoading[item.id] && eventsError[item.id] && (
                            <span className="text-[#a24538]" role="alert">
                              {eventsError[item.id]}
                            </span>
                          )}
                          {!eventsLoading[item.id] &&
                            !eventsError[item.id] &&
                            (eventsById[item.id] || []).map((event) => (
                              <div
                                key={
                                  event.id || `${event.event_name}-${event.timestamp}`
                                }
                                className="flex items-start justify-between gap-3"
                              >
                                <div>
                                  <strong className="text-ink">
                                    {formatEventName(event.event_name)}
                                  </strong>
                                  {renderEventDetails(event)}
                                </div>
                                <span>{formatTimestamp(event.timestamp)}</span>
                              </div>
                            ))}
                          {!eventsLoading[item.id] &&
                            !eventsError[item.id] &&
                            (eventsById[item.id] || []).length === 0 && (
                              <span>Todavia no hay eventos.</span>
                            )}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            {submissionsLoading && (
              <p className="mt-3 text-sm text-muted">Cargando audios...</p>
            )}
            {!submissionsLoading &&
              filteredSubmissions.length === 0 &&
              !submissionsError && (
                <p className="mt-3 text-sm text-muted">
                  {statusFilter === "all"
                    ? "Todavia no hay audios."
                    : "No hay audios en este filtro."}{" "}
                  <a href="/upload/" className="underline">
                    Subi uno
                  </a>
                  .
                </p>
              )}
            {submissionsError && (
              <p className="mt-3 text-sm text-[#a24538]" role="alert">
                {submissionsError}
              </p>
            )}
          </div>
        </section>
      )}
    </Layout>
  );
}

function getSubmissionTitle(item) {
  if (!item) return "Sin titulo";
  return item.title || item.summary || "Sin titulo";
}

function describeSubmission(item) {
  if (item.status === "REJECTED") return "Rechazado por moderacion";
  if (item.status === "QUARANTINED") return "En revision";
  if (item.status === "APPROVED") return "Publicado";
  if (item.status === "CREATED") return "Listo para subir";
  if (item.status === "UPLOADED") return "En cola para procesar";
  if (item.status === "PROCESSING") {
    const label = STEP_LABELS[item.processing_step] || "Procesando";
    return `Procesando · ${label}`;
  }
  return item.status;
}

function truncateText(text, max) {
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}...`;
}

function getCoverStyle(item) {
  if (!item?.cover_url) return undefined;
  return { backgroundImage: `url(${item.cover_url})` };
}

function getProgress(step) {
  const safe = Math.max(0, Math.min(step, 6));
  const progress = Math.round((safe / 6) * 100);
  return Math.max(8, progress);
}

function formatTimestamp(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatEventName(name) {
  if (!name) return "Evento";
  const map = {
    "audio.uploaded": "Subido",
    "audio.normalized": "Normalizado",
    "audio.transcribed": "Transcripto",
    "audio.moderated": "Moderado",
    "audio.tagged": "Etiquetado",
    "audio.anonymized": "Audio ajustado",
    "audio.published": "Publicado",
    "audio.rejected": "Rechazado",
    "audio.quarantined": "En revision",
    "audio.reprocess_requested": "Reproceso pedido"
  };
  if (map[name]) return map[name];
  const clean = name.replace("audio.", "").replace(/_/g, " ");
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function renderEventDetails(event) {
  if (!event?.payload) return null;
  if (event.event_name === "audio.moderated") {
    const result = formatModerationResult(event.payload.result);
    const flagged = event.payload.flagged;
    const categories = event.payload.categories || {};
    const flaggedCategories = Object.keys(categories).filter(
      (key) => categories[key]
    );
    const detail = flaggedCategories.length
      ? `Marcado: ${flaggedCategories.join(", ")}`
      : flagged
        ? "Marcado"
        : "";
    return (
      <em className="mt-1 block text-[11px] text-muted">
        {result}
        {detail ? ` · ${detail}` : ""}
      </em>
    );
  }
  if (event.event_name === "audio.rejected") {
    return <em className="mt-1 block text-[11px] text-muted">Rechazado</em>;
  }
  if (event.event_name === "audio.quarantined") {
    return <em className="mt-1 block text-[11px] text-muted">En revision</em>;
  }
  return null;
}

function formatModerationResult(result) {
  if (!result) return "DESCONOCIDO";
  const map = {
    APPROVE: "Aprobado",
    REJECT: "Rechazado",
    QUARANTINE: "En revision"
  };
  return map[result] || result;
}

function getStatusDotClass(status) {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "APPROVED") return "bg-emerald-600";
  if (normalized === "REJECTED") return "bg-[#a24538]";
  if (normalized === "QUARANTINED") return "bg-amber-500";
  if (normalized === "PROCESSING") return "bg-slate-400";
  if (normalized === "UPLOADED") return "bg-slate-400";
  if (normalized === "CREATED") return "bg-slate-400";
  return "bg-ink";
}

export default LibraryPage;
