import { useEffect, useMemo, useState } from "react";
import AuthPanel from "./components/AuthPanel.jsx";
import Layout from "./components/Layout.jsx";
import { apiBase, authHeaders, fetchJson, logDev } from "./lib/api.js";

const STEP_LABELS = {
  0: "Queued",
  1: "Normalized",
  2: "Transcribed",
  3: "Moderated",
  4: "Tagged",
  5: "Anonymized",
  6: "Published"
};

const TERMINAL_STATUSES = new Set(["APPROVED", "REJECTED", "QUARANTINED"]);

function LibraryPage() {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authChecked, setAuthChecked] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [submissionsError, setSubmissionsError] = useState("");
  const [polling, setPolling] = useState(false);
  const [eventsById, setEventsById] = useState({});
  const [timelineOpen, setTimelineOpen] = useState({});
  const [eventsLoading, setEventsLoading] = useState({});
  const [eventsError, setEventsError] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);
  const [healthStatus, setHealthStatus] = useState({
    loading: true,
    error: "",
    data: null
  });
  const [statusFilter, setStatusFilter] = useState("all");

  const headers = useMemo(() => authHeaders(token), [token]);

  const refreshSubmissions = async () => {
    setSubmissionsLoading(true);
    setSubmissionsError("");
    try {
      const data = await fetchJson(`${apiBase}/submissions`, { headers });
      const list = data || [];
      setSubmissions(list);
      setLastUpdated(new Date());
      return list;
    } catch (error) {
      setSubmissions([]);
      setSubmissionsError("Unable to load submissions. Check connection.");
      throw error;
    } finally {
      setSubmissionsLoading(false);
    }
  };

  const handleReprocess = async (submissionId) => {
    if (!token) return;
    try {
      await fetchJson(`${apiBase}/submissions/${submissionId}/reprocess`, {
        method: "POST",
        headers
      });
      setPolling(true);
      await refreshSubmissions();
    } catch {
      setSubmissionsError("Reprocess failed. Try again.");
    }
  };

  const toggleTimeline = async (submissionId) => {
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
          [submissionId]: "Unable to load events."
        }));
      } finally {
        setEventsLoading((prev) => ({ ...prev, [submissionId]: false }));
      }
    }
    setTimelineOpen((prev) => ({ ...prev, [submissionId]: true }));
  };

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
      .then((list) => {
        const hasPending = list.some((item) => !TERMINAL_STATUSES.has(item.status));
        setPolling(hasPending);
      })
      .catch((error) => {
        if (error.status === 401) {
          localStorage.removeItem("token");
          setToken(null);
          setAuthChecked(true);
          return;
        }
        setSubmissions([]);
        setSubmissionsError("Unable to load submissions.");
      });
  }, [token, headers]);

  const fetchHealth = async () => {
    setHealthStatus({ loading: true, error: "", data: null });
    try {
      const res = await fetch(`${apiBase}/health`);
      if (!res.ok) {
        throw new Error("Health unavailable");
      }
      const data = await res.json();
      setHealthStatus({ loading: false, error: "", data });
    } catch (error) {
      setHealthStatus({
        loading: false,
        error: "System status unavailable",
        data: null
      });
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  useEffect(() => {
    if (!polling || !token) return;

    const interval = setInterval(() => {
      refreshSubmissions()
        .then((list) => {
          const hasPending = list.some(
            (item) => !TERMINAL_STATUSES.has(item.status)
          );
          if (!hasPending) {
            setPolling(false);
          }
        })
        .catch((error) => {
          logDev("polling failed", error);
        });
    }, 4000);

    return () => clearInterval(interval);
  }, [polling, token, headers]);

  const handleRegister = async () => {
    setAuthError("");
    const res = await fetch(`${apiBase}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      setAuthError("Registration failed");
      return;
    }
    const data = await res.json();
    localStorage.setItem("token", data.access_token);
    setToken(data.access_token);
    setAuthChecked(false);
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
      setAuthError("Login failed");
      return;
    }
    const data = await res.json();
    localStorage.setItem("token", data.access_token);
    setToken(data.access_token);
    setAuthChecked(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
  };

  const rightRail = (
    <>
      <div className="rail-card">
        <h4>Tape path</h4>
        <ol className="rail-list">
          <li>Normalize + transcribe</li>
          <li>Moderate + tag</li>
          <li>Anonymize + publish</li>
        </ol>
      </div>
      <div className="rail-card">
        <h4>Live updates</h4>
        <p>We auto-refresh while something is processing.</p>
      </div>
      <div className="rail-card">
        <h4>System status</h4>
        {healthStatus.loading && <span className="muted">Checking...</span>}
        {!healthStatus.loading && healthStatus.error && (
          <span className="error">{healthStatus.error}</span>
        )}
        {!healthStatus.loading && healthStatus.data && (
          <div className="health-list">
            <div className="health-item">
              <span
                className={`health-dot ${
                  healthStatus.data.db_ready ? "ok" : "down"
                }`}
              />
              <span>Database</span>
            </div>
            <div className="health-item">
              <span
                className={`health-dot ${
                  healthStatus.data.storage_ready ? "ok" : "down"
                }`}
              />
              <span>Storage</span>
            </div>
            <div className="health-item">
              <span
                className={`health-dot ${
                  healthStatus.data.queue_ready ? "ok" : "down"
                }`}
              />
              <span>Queue</span>
            </div>
            <div className="health-item">
              <span
                className={`health-dot ${
                  healthStatus.data.llm_ready ? "ok" : "warn"
                }`}
              />
              <span>LLM</span>
            </div>
          </div>
        )}
        <button
          type="button"
          className="ghost"
          onClick={fetchHealth}
          disabled={healthStatus.loading}
        >
          Refresh status
        </button>
      </div>
    </>
  );

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
    { id: "all", label: "All" },
    { id: "processing", label: "Processing" },
    { id: "approved", label: "Approved" },
    { id: "rejected", label: "Rejected" },
    { id: "quarantined", label: "Quarantined" }
  ];

  return (
    <Layout
      current="library"
      token={token}
      onLogout={handleLogout}
      heroTitle="Your library, softly alive"
      heroCopy="Watch the tape travel through the pipeline. When it is ready, it joins the stream."
      heroBadgeLabel="Signal"
      heroBadgeValue="Comfort listening"
      rightRail={rightRail}
    >
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
        <section className="library locked">
          <h3>Login required</h3>
          <p>Sign in to see your recordings and their status.</p>
          <div className="locked-actions">
            <a href="/">Back to feed</a>
          </div>
        </section>
      )}

      {token && (
        <section className="library">
          <div className="library-header">
            <div>
              <h3>My library</h3>
              <p className="library-copy">
                Live view of your uploads. We update this list as the pipeline
                moves.
              </p>
            </div>
            <div className="library-actions">
              <button type="button" onClick={refreshSubmissions}>
                Refresh
              </button>
              <div className="live-indicator">
                <span className={`live-dot ${polling ? "on" : "paused"}`} />
                <span>{polling ? "Live" : "Paused"}</span>
              </div>
            </div>
          </div>
          <div className="library-filters">
            {filters.map((filter) => (
              <button
                key={filter.id}
                type="button"
                className={statusFilter === filter.id ? "active" : ""}
                onClick={() => setStatusFilter(filter.id)}
              >
                {filter.label}
              </button>
            ))}
          </div>
          {lastUpdated && (
            <div className="library-updated">
              Updated {lastUpdated.toLocaleTimeString()}
            </div>
          )}
          {nextUp && (
            <div className="library-next">
              Up next:{" "}
              <strong>
                {truncateText(
                  nextUp.summary || nextUp.transcript_preview || "Untitled",
                  48
                )}
              </strong>{" "}
              · {STEP_LABELS[nextUp.processing_step] || "Queued"}
            </div>
          )}

          <div className="submissions">
            <ul>
              {filteredSubmissions.map((item) => {
                const isProcessing = !TERMINAL_STATUSES.has(item.status);
                const progress = getProgress(item.processing_step);
                return (
                  <li
                    key={item.id}
                    className={`submission-item ${
                      isProcessing ? "is-processing" : ""
                    }`}
                  >
                    <div className="submission-main">
                      <span
                        className={`status-dot ${item.status.toLowerCase()}`}
                        aria-hidden="true"
                      />
                      <div className="submission-title">
                        <strong>
                          {truncateText(
                            item.summary || item.transcript_preview || "Untitled",
                            72
                          )}
                        </strong>
                        <span className="submission-status">
                          {describeSubmission(item)}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => toggleTimeline(item.id)}
                      >
                        {timelineOpen[item.id] ? "Hide details" : "Details"}
                      </button>
                    </div>
                    {isProcessing && (
                      <div className="processing-row">
                        <span>
                          Current: {STEP_LABELS[item.processing_step] || "Queued"}
                        </span>
                        <div className="progress-track">
                          <div
                            className="progress-bar"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                    <div className="submission-meta">
                      <span>Step {item.processing_step}/6</span>
                      {item.moderation_result &&
                        item.moderation_result !== "APPROVE" && (
                          <span>Moderation: {item.moderation_result}</span>
                        )}
                    </div>
                    {timelineOpen[item.id] && (
                      <div className="submission-details">
                        <div className="submission-actions">
                          <button
                            type="button"
                            className="ghost"
                            onClick={() => handleReprocess(item.id)}
                          >
                            Reprocess
                          </button>
                          <a href="/upload/">Upload another</a>
                        </div>
                        {item.transcript_preview && (
                          <div className="transcript-preview">
                            Transcripcion:{" "}
                            {truncateText(item.transcript_preview, 220)}
                          </div>
                        )}
                        <div className="timeline">
                          {eventsLoading[item.id] && (
                            <span className="muted">Loading events...</span>
                          )}
                          {!eventsLoading[item.id] && eventsError[item.id] && (
                            <span className="error">{eventsError[item.id]}</span>
                          )}
                          {!eventsLoading[item.id] &&
                            !eventsError[item.id] &&
                            (eventsById[item.id] || []).map((event) => (
                              <div key={`${event.event_name}-${event.timestamp}`}>
                                <strong>{formatEventName(event.event_name)}</strong>
                                <span>{formatTimestamp(event.timestamp)}</span>
                                {renderEventDetails(event)}
                              </div>
                            ))}
                          {!eventsLoading[item.id] &&
                            !eventsError[item.id] &&
                            (eventsById[item.id] || []).length === 0 && (
                              <span className="muted">No events yet.</span>
                            )}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            {submissionsLoading && (
              <p className="muted">Loading submissions...</p>
            )}
            {!submissionsLoading &&
              filteredSubmissions.length === 0 &&
              !submissionsError && (
                <p className="muted">
                  {statusFilter === "all"
                    ? "No submissions yet."
                    : "No submissions in this view."}{" "}
                  <a href="/upload/">Upload one</a>.
                </p>
              )}
            {submissionsError && <p className="error">{submissionsError}</p>}
          </div>
        </section>
      )}
    </Layout>
  );
}

function describeSubmission(item) {
  if (item.status === "REJECTED") return "Rejected by moderation";
  if (item.status === "QUARANTINED") return "Quarantined for review";
  if (item.status === "APPROVED") return "Published";
  if (item.status === "UPLOADED") return "Queued for processing";
  if (item.status === "PROCESSING") {
    const label = STEP_LABELS[item.processing_step] || "Processing";
    return `Processing · ${label}`;
  }
  return item.status;
}

function truncateText(text, max) {
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}...`;
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
  if (!name) return "Event";
  const clean = name.replace("audio.", "").replace(/_/g, " ");
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function renderEventDetails(event) {
  if (!event?.payload) return null;
  if (event.event_name === "audio.moderated") {
    const result = event.payload.result || "UNKNOWN";
    const flagged = event.payload.flagged;
    const categories = event.payload.categories || {};
    const flaggedCategories = Object.keys(categories).filter(
      (key) => categories[key]
    );
    const detail = flaggedCategories.length
      ? `Flagged: ${flaggedCategories.join(", ")}`
      : flagged
        ? "Flagged"
        : "";
    return (
      <em className="event-detail">
        {result}
        {detail ? ` · ${detail}` : ""}
      </em>
    );
  }
  if (event.event_name === "audio.rejected") {
    return <em className="event-detail">Rejected</em>;
  }
  if (event.event_name === "audio.quarantined") {
    return <em className="event-detail">Quarantined</em>;
  }
  return null;
}

export default LibraryPage;
