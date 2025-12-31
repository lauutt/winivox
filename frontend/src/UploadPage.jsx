import { useEffect, useMemo, useRef, useState } from "react";
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

function UploadPage() {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [submissions, setSubmissions] = useState([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [submissionsError, setSubmissionsError] = useState("");
  const [uploadState, setUploadState] = useState({ status: "idle", message: "" });
  const [authChecked, setAuthChecked] = useState(false);
  const [polling, setPolling] = useState(false);
  const [activeSubmissionId, setActiveSubmissionId] = useState("");
  const [eventsById, setEventsById] = useState({});
  const [timelineOpen, setTimelineOpen] = useState({});
  const [eventsLoading, setEventsLoading] = useState({});
  const [eventsError, setEventsError] = useState({});
  const [recordingState, setRecordingState] = useState("idle");
  const [recordingError, setRecordingError] = useState("");
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedUrl, setRecordedUrl] = useState("");

  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const headers = useMemo(() => authHeaders(token), [token]);

  const refreshSubmissions = async () => {
    setSubmissionsLoading(true);
    setSubmissionsError("");
    try {
      const data = await fetchJson(`${apiBase}/submissions`, { headers });
      const list = data || [];
      setSubmissions(list);

      if (activeSubmissionId) {
        const active = list.find((item) => item.id === activeSubmissionId);
        if (active) {
          setUploadState({
            status: active.status.toLowerCase(),
            message: describeSubmission(active)
          });
        }
      }
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
    setUploadState({ status: "reprocessing", message: "Reprocessing audio" });
    try {
      await fetchJson(`${apiBase}/submissions/${submissionId}/reprocess`, {
        method: "POST",
        headers
      });
      setActiveSubmissionId(submissionId);
      setPolling(true);
      await refreshSubmissions();
    } catch {
      setUploadState({ status: "error", message: "Reprocess failed" });
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

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !token) return;
    await uploadFile(file);
    event.target.value = "";
  };

  const uploadFile = async (file) => {
    setUploadState({ status: "creating", message: "Creating submission" });
    logDev("upload start", file.name, file.type);

    try {
      const contentType = guessContentType(file);
      const res = await fetch(`${apiBase}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          filename: file.name,
          content_type: contentType,
          anonymization_mode: "SOFT"
        })
      });

      if (!res.ok) {
        setUploadState({ status: "error", message: "Submission failed" });
        return false;
      }

      const data = await res.json();
      setUploadState({ status: "uploading", message: "Uploading" });

      const uploadRes = await fetch(data.upload_url, {
        method: data.upload_method,
        headers: { "Content-Type": contentType },
        body: file
      });

      if (!uploadRes.ok) {
        setUploadState({ status: "error", message: "Upload failed" });
        return false;
      }

      setUploadState({ status: "finalizing", message: "Finalizing" });
      const markRes = await fetch(`${apiBase}/submissions/${data.id}/uploaded`, {
        method: "POST",
        headers
      });

      if (!markRes.ok) {
        setUploadState({ status: "error", message: "Finalize failed" });
        return false;
      }

      setActiveSubmissionId(data.id);
      setPolling(true);
      setUploadState({ status: "queued", message: "Queued for processing" });

      try {
        const list = await refreshSubmissions();
        const hasPending = list.some(
          (item) => !TERMINAL_STATUSES.has(item.status)
        );
        setPolling(hasPending);
      } catch {
        setSubmissions([]);
      }
      return true;
    } catch (error) {
      logDev("upload error", error);
      setUploadState({ status: "error", message: "Network error. Try again." });
      return false;
    }
  };

  const startRecording = async () => {
    setRecordingError("");
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setRecordingError("Browser does not support audio capture");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );

      chunksRef.current = [];
      mediaRecorderRef.current = recorder;
      mediaStreamRef.current = stream;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blobType = mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: blobType });
        const url = URL.createObjectURL(blob);
        setRecordedBlob(blob);
        setRecordedUrl(url);
        setRecordingState("ready");
        stopStream();
      };

      recorder.start();
      setRecordingState("recording");
      setRecordingTime(0);
      logDev("recording started", mimeType || "default");

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      logDev("recording error", error);
      setRecordingError("Microphone permission denied");
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current) return;
    clearInterval(timerRef.current);
    timerRef.current = null;
    setRecordingState("processing");
    mediaRecorderRef.current.stop();
  };

  const clearRecording = () => {
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
    }
    setRecordedBlob(null);
    setRecordedUrl("");
    setRecordingState("idle");
    setRecordingTime(0);
  };

  const uploadRecording = async () => {
    if (!recordedBlob) return;
    const file = blobToFile(recordedBlob);
    const ok = await uploadFile(file);
    if (ok) {
      clearRecording();
    }
  };

  const stopStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      stopStream();
      if (recordedUrl) {
        URL.revokeObjectURL(recordedUrl);
      }
    };
  }, [recordedUrl]);

  const rightRail = (
    <>
      <div className="rail-card">
        <h4>Upload steps</h4>
        <ol className="rail-list">
          <li>Direct upload to private storage</li>
          <li>Async processing pipeline</li>
          <li>LLM tags + summary</li>
          <li>Public anonymized copy</li>
        </ol>
      </div>
      <div className="rail-card">
        <h4>Privacy</h4>
        <p>Original audio stays private. Public feed uses anonymized copies.</p>
      </div>
    </>
  );

  return (
    <Layout
      current="upload"
      token={token}
      onLogout={handleLogout}
      heroTitle="Upload your story"
      heroCopy="Direct upload to private storage or record from your mic. We process asynchronously and publish an anonymized copy."
      heroBadgeLabel="Privacy"
      heroBadgeValue="Private originals"
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
        <section className="upload locked">
          <h3>Login required</h3>
          <p>Access your private uploads by signing in.</p>
          <div className="locked-actions">
            <a href="/">Back to feed</a>
          </div>
        </section>
      )}

      {token && (
        <section className="upload">
          <h3>Upload a story</h3>
          <p>
            Drag a file or record from your microphone. We will keep you posted
            as the pipeline processes it.
          </p>
          <label className="upload-drop">
            <input
              type="file"
              accept="audio/*,.opus,.ogg,.webm"
              onChange={handleUpload}
            />
            <span>Choose an audio file</span>
          </label>
          <div className="upload-hint">Supports .opus, .ogg, .webm, .wav, .mp3</div>

          <div className="recording">
            <div className="recording-header">
              <h4>Record with microphone</h4>
              <div className="recording-badge">
                <span>{recordingState}</span>
                <span>{formatTime(recordingTime)}</span>
              </div>
            </div>
            <div className="recording-controls">
              <button
                type="button"
                className="ghost"
                onClick={startRecording}
                disabled={recordingState === "recording"}
              >
                Start
              </button>
              <button
                type="button"
                className="ghost"
                onClick={stopRecording}
                disabled={recordingState !== "recording"}
              >
                Stop
              </button>
              <button
                type="button"
                onClick={uploadRecording}
                disabled={!recordedBlob}
              >
                Upload recording
              </button>
              {recordedBlob && (
                <button type="button" className="ghost" onClick={clearRecording}>
                  Clear
                </button>
              )}
            </div>
            {recordingError && <p className="error">{recordingError}</p>}
            {recordedUrl && (
              <audio className="recording-preview" controls src={recordedUrl} />
            )}
          </div>

          <div className="upload-status">
            <strong>Status:</strong> {uploadState.status}
            <span>{uploadState.message}</span>
          </div>

          <div className="submissions">
            <div className="submissions-header">
              <h4>My submissions</h4>
              <div className="submissions-actions">
                <button type="button" onClick={refreshSubmissions}>
                  Refresh
                </button>
                <a href="/">Go to feed</a>
              </div>
            </div>
            <ul>
              {submissions.map((item) => (
                <li key={item.id}>
                  <div className="submission-main">
                    <span className={`pill ${item.status.toLowerCase()}`}>
                      {item.status}
                    </span>
                    <span>
                      {item.summary || item.transcript_preview || "(processing)"}
                    </span>
                  </div>
                  <div className="submission-meta">
                    <span>{describeSubmission(item)}</span>
                    <span>Step {item.processing_step}/6</span>
                  </div>
                  <div className="submission-actions">
                    <button
                      type="button"
                      onClick={() => handleReprocess(item.id)}
                    >
                      Reprocess
                    </button>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => toggleTimeline(item.id)}
                    >
                      {timelineOpen[item.id] ? "Hide timeline" : "View timeline"}
                    </button>
                  </div>
                  {item.transcript_preview && (
                    <div className="transcript-preview">
                      Transcripcion: {truncateText(item.transcript_preview, 220)}
                    </div>
                  )}
                  {timelineOpen[item.id] && (
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
                          </div>
                        ))}
                      {!eventsLoading[item.id] &&
                        !eventsError[item.id] &&
                        (eventsById[item.id] || []).length === 0 && (
                          <span className="muted">No events yet.</span>
                        )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
            {submissionsLoading && (
              <p className="muted">Loading submissions...</p>
            )}
            {!submissionsLoading &&
              submissions.length === 0 &&
              !submissionsError && <p className="muted">No submissions yet.</p>}
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

function guessContentType(file) {
  if (file.type) return file.type;
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".opus")) return "audio/opus";
  if (lower.endsWith(".ogg")) return "audio/ogg";
  if (lower.endsWith(".webm")) return "audio/webm";
  return "audio/wav";
}

function pickMimeType() {
  if (!window.MediaRecorder) return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/ogg;codecs=opus",
    "audio/webm",
    "audio/ogg"
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

function blobToFile(blob) {
  const type = blob.type || "audio/webm";
  let extension = "webm";
  if (type.includes("ogg")) extension = "ogg";
  if (type.includes("opus")) extension = "opus";
  const name = `recording-${Date.now()}.${extension}`;
  return new File([blob], name, { type });
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function truncateText(text, max) {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}...`;
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

export default UploadPage;
