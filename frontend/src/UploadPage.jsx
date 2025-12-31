import { useEffect, useMemo, useRef, useState } from "react";
import AuthPanel from "./components/AuthPanel.jsx";
import Layout from "./components/Layout.jsx";
import { apiBase, authHeaders, fetchJson, logDev } from "./lib/api.js";

function UploadPage() {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [uploadState, setUploadState] = useState({ status: "idle", message: "" });
  const [authChecked, setAuthChecked] = useState(false);
  const [anonymizationMode, setAnonymizationMode] = useState("SOFT");
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

  useEffect(() => {
    if (!token) {
      setAuthChecked(true);
      return;
    }

    fetchJson(`${apiBase}/auth/me`, { headers })
      .then(() => {
        setAuthChecked(true);
      })
      .catch((error) => {
        if (error.status === 401) {
          localStorage.removeItem("token");
          setToken(null);
          setAuthChecked(true);
          return;
        }
        setAuthChecked(true);
      });
  }, [token, headers]);

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
          anonymization_mode: anonymizationMode
        })
      });

      if (!res.ok) {
        const detail = await readErrorMessage(res, "Submission failed");
        setUploadState({ status: "error", message: detail });
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
        const detail = await readErrorMessage(
          uploadRes,
          `Upload failed (${uploadRes.status})`
        );
        setUploadState({ status: "error", message: detail });
        return false;
      }

      setUploadState({ status: "finalizing", message: "Finalizing" });
      const markRes = await fetch(`${apiBase}/submissions/${data.id}/uploaded`, {
        method: "POST",
        headers
      });

      if (!markRes.ok) {
        const detail = await readErrorMessage(markRes, "Finalize failed");
        setUploadState({ status: "error", message: detail });
        return false;
      }

      setUploadState({
        status: "queued",
        message: "Queued for processing. Track it in your Library."
      });
      return true;
    } catch (error) {
      logDev("upload error", error);
      const message =
        error instanceof Error
          ? `Network error: ${error.message}`
          : "Network error. Try again.";
      setUploadState({ status: "error", message });
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
        <h4>Next stop</h4>
        <p>Follow progress in your Library once the upload is queued.</p>
      </div>
    </>
  );

  return (
    <Layout
      current="upload"
      token={token}
      onLogout={handleLogout}
      heroTitle="Leave a quiet story"
      heroCopy="Drop a file or record a voice note. We shape it gently and keep the original private."
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
            Drag a file or record from your microphone. Track progress in your
            Library once it is queued.
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
          <div className="upload-options">
            <label>
              Voice anonymization
              <select
                value={anonymizationMode}
                onChange={(event) => setAnonymizationMode(event.target.value)}
              >
                <option value="OFF">Off</option>
                <option value="SOFT">Soft</option>
                <option value="MEDIUM">Medium</option>
                <option value="STRONG">Strong</option>
              </select>
            </label>
            <p className="muted">
              Higher levels shift the voice further while keeping the story
              clear.
            </p>
          </div>

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
          <div className="upload-cta">
            <a href="/library/">Go to your library</a>
            <span className="muted">
              Follow processing in real time once the upload is queued.
            </span>
          </div>
        </section>
      )}
    </Layout>
  );
}

async function readErrorMessage(response, fallback) {
  try {
    const data = await response.clone().json();
    if (data?.detail) return data.detail;
  } catch {
    // ignore json parsing failures
  }
  try {
    const text = await response.text();
    if (text) return text.slice(0, 160);
  } catch {
    // ignore body read failures
  }
  return fallback;
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

export default UploadPage;
