import { useEffect, useMemo, useRef, useState } from "react";
import AuthPanel from "./components/AuthPanel.jsx";
import Layout from "./components/Layout.jsx";
import { apiBase, authHeaders, fetchJson, logDev } from "./lib/api.js";

function UploadPage() {
  // Estados de autenticación
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authChecked, setAuthChecked] = useState(false);

  // Estados del nuevo flujo de upload (2 pasos)
  const [step, setStep] = useState(1); // 1: seleccionar, 2: configurar
  const [submissionId, setSubmissionId] = useState(null);
  const [uploadProgress, setUploadProgress] = useState({
    status: "idle", // idle | uploading | uploaded | error
    message: "",
  });
  const [formData, setFormData] = useState({
    anonymizationMode: "SOFT",
    description: "",
    tagsSuggested: "",
  });

  // Estados de grabación (mantener funcionalidad existente)
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

  // Verificar autenticación
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

  // Handlers de autenticación
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
      setAuthError("No se pudo iniciar sesion");
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

  // Handler para file input
  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !token) return;
    await uploadFileToMinio(file);
    event.target.value = "";
  };

  // PASO 1: Upload inmediato a MinIO
  const uploadFileToMinio = async (file) => {
    setUploadProgress({ status: "uploading", message: "Subiendo..." });
    logDev("upload start", file.name, file.type);

    try {
      const contentType = guessContentType(file);

      // 1. Crear submission (sin anonymization_mode)
      const createRes = await fetch(`${apiBase}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          filename: file.name,
          content_type: contentType,
        }),
      });

      if (!createRes.ok) {
        const detail = await readErrorMessage(createRes, "No se pudo preparar la subida");
        setUploadProgress({ status: "error", message: detail });
        return;
      }

      const data = await createRes.json();
      setSubmissionId(data.id);

      // 2. Upload a MinIO
      const uploadRes = await fetch(data.upload_url, {
        method: data.upload_method,
        headers: { "Content-Type": contentType },
        body: file,
      });

      if (!uploadRes.ok) {
        const detail = await readErrorMessage(
          uploadRes,
          `Fallo la subida (${uploadRes.status})`
        );
        setUploadProgress({ status: "error", message: detail });
        return;
      }

      // 3. Avanzar a paso 2
      setUploadProgress({ status: "uploaded", message: "Archivo subido" });
      setStep(2);
      logDev("upload complete, advancing to step 2");
    } catch (error) {
      logDev("upload error", error);
      const message =
        error instanceof Error
          ? `Error de red: ${error.message}`
          : "Error de red. Proba de nuevo.";
      setUploadProgress({ status: "error", message });
    }
  };

  // PASO 2: Confirmar configuración y procesar
  const confirmUpload = async () => {
    if (!submissionId) return;

    try {
      // Parsear tags (separados por coma)
      const tags = formData.tagsSuggested
        ? formData.tagsSuggested.split(",").map((t) => t.trim()).filter(Boolean)
        : null;

      // POST /submissions/{id}/uploaded con configuración
      const res = await fetch(`${apiBase}/submissions/${submissionId}/uploaded`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          anonymization_mode: formData.anonymizationMode,
          description: formData.description || null,
          tags_suggested: tags,
        }),
      });

      if (!res.ok) {
        const detail = await readErrorMessage(res, "No se pudo confirmar");
        alert(`Error: ${detail}`);
        return;
      }

      logDev("upload confirmed, redirecting to library");
      // Redirect a library
      window.location.href = "/library/";
    } catch (error) {
      logDev("confirm error", error);
      alert(`Error: ${error.message}`);
    }
  };

  // Cancelar y volver al paso 1
  const cancelUpload = async () => {
    if (submissionId) {
      try {
        await fetch(`${apiBase}/submissions/${submissionId}`, {
          method: "DELETE",
          headers,
        });
        logDev("submission cancelled", submissionId);
      } catch (error) {
        logDev("cancel error", error);
      }
    }
    resetUpload();
  };

  // Resetear todo
  const resetUpload = () => {
    setStep(1);
    setSubmissionId(null);
    setUploadProgress({ status: "idle", message: "" });
    setFormData({
      anonymizationMode: "SOFT",
      description: "",
      tagsSuggested: "",
    });
    // Limpiar grabación si existe
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
      setRecordedUrl("");
      setRecordedBlob(null);
      setRecordingState("idle");
    }
  };

  // === Funciones de grabación (mantener funcionalidad existente) ===

  const startRecording = async () => {
    setRecordingError("");
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setRecordingError("Tu navegador no soporta grabacion de audio");
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
      setRecordingError("Permiso de microfono denegado");
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
    await uploadFileToMinio(file);
    // No limpiar la grabación aquí; se limpia en resetUpload si el usuario cancela
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

  // === UI ===

  const rightRail = (
    <>
      <div className="surface-glass">
        <h4 className="text-base">Guia rapida</h4>
        <ol className="mt-3 grid gap-2 pl-4 text-sm text-muted">
          <li>Graba o subi tu audio</li>
          <li>Agrega detalles opcionales</li>
          <li>Se suma a la radio al terminar</li>
        </ol>
      </div>
      <div className="surface-glass">
        <h4 className="text-base">Ideas rapidas</h4>
        <ul className="mt-3 grid gap-2 text-sm text-muted">
          <li>Confesiones y dilemas</li>
          <li>Mensajes cortos y aliento</li>
          <li>Anecdotas y rarezas cotidianas</li>
        </ul>
      </div>
    </>
  );

  return (
    <Layout
      current="upload"
      token={token}
      onLogout={handleLogout}
      heroTitle="Sumalo a la radio"
      heroCopy="Graba o subi un audio. Confesiones, dilemas, anecdotas o mensajes cortos: todo suma a la radio de la comunidad."
      heroBadgeLabel="Destino"
      heroBadgeValue="Radio de la comunidad"
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
        <section className="surface border-dashed border-sand/70 bg-white">
          <h3 className="text-lg">Necesitas iniciar sesion</h3>
          <p className="mt-2 text-sm text-muted">
            Para ver tus audios privados, inicia sesion.
          </p>
          <div className="mt-4">
            <a href="/" className="btn-ink">
              Volver al inicio
            </a>
          </div>
        </section>
      )}

      {token && step === 1 && (
        <section className="surface">
          <div className="flex flex-col gap-6">
            <div>
              <span className="text-xs uppercase tracking-[0.3em] text-muted">
                Paso 1
              </span>
              <h3 className="mt-2 text-lg">Subir o grabar audio</h3>
              <p className="mt-2 text-sm text-muted">
                Elegi un archivo o graba directo desde el microfono. El archivo se sube
                automaticamente y despues completas los detalles.
              </p>
            </div>

            {/* Área de carga de archivo */}
            <label className="group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-sand/70 bg-white p-12 text-sm text-muted transition hover:border-accent/60 hover:bg-sand/60">
              <input
                type="file"
                accept="audio/*,.opus,.ogg,.webm"
                onChange={handleFileSelect}
                className="hidden"
              />
              <span className="text-lg font-medium text-ink">
                Arrastra un archivo aca o hace click para elegir
              </span>
              <span className="text-xs text-muted">
                Formatos: .opus, .ogg, .webm, .wav, .mp3
              </span>
            </label>

            {/* Panel de grabación */}
            <div className="rounded-3xl border border-sand/60 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-base">O grabar con microfono</h4>
                <div className="flex items-center gap-3 text-xs text-muted">
                  <span>{formatRecordingState(recordingState)}</span>
                  <span className="radio-track">{formatTime(recordingTime)}</span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={startRecording}
                  disabled={recordingState === "recording"}
                >
                  Empezar
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={stopRecording}
                  disabled={recordingState !== "recording"}
                >
                  Detener
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={uploadRecording}
                  disabled={!recordedBlob}
                >
                  Subir grabacion
                </button>
                {recordedBlob && (
                  <button type="button" className="btn-ghost" onClick={clearRecording}>
                    Borrar
                  </button>
                )}
              </div>
              {recordingError && (
                <p className="mt-3 text-sm text-[#a24538]" role="alert">
                  {recordingError}
                </p>
              )}
              {recordedUrl && (
                <audio className="mt-3 w-full" controls src={recordedUrl} />
              )}
            </div>

            {/* Mostrar errores de upload */}
            {uploadProgress.status === "error" && (
              <div className="rounded-3xl border border-[#a24538]/40 bg-[#a24538]/5 p-4" role="alert">
                <p className="text-sm text-[#a24538]">{uploadProgress.message}</p>
              </div>
            )}

            {/* Mostrar progreso de upload */}
            {uploadProgress.status === "uploading" && (
              <div className="rounded-3xl border border-accent/40 bg-accent/5 p-4" role="status">
                <p className="text-sm text-ink">Subiendo archivo...</p>
              </div>
            )}
          </div>
        </section>
      )}

      {token && step === 2 && (
        <section className="surface">
          <div className="flex flex-col gap-6">
            <div>
              <span className="text-xs uppercase tracking-[0.3em] text-muted">
                Paso 2
              </span>
              <h3 className="mt-2 text-lg">Detalles y confirmacion</h3>
              <p className="mt-2 text-sm text-muted">
                El archivo ya esta subido. Ahora agrega detalles opcionales antes de sumar a la
                radio.
              </p>
            </div>

            {uploadProgress.status === "uploaded" && (
              <div className="rounded-3xl border border-green-500/40 bg-green-500/5 p-4">
                <p className="text-sm text-green-700">✓ Archivo subido correctamente</p>
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); confirmUpload(); }} className="flex flex-col gap-6">
              {/* Ajuste de audio */}
              <div className="grid gap-3 rounded-3xl border border-sand/70 bg-white p-4">
                <label className="text-sm font-medium text-ink">
                  Estilo de audio
                </label>
                <select
                  value={formData.anonymizationMode}
                  onChange={(e) =>
                    setFormData({ ...formData, anonymizationMode: e.target.value })
                  }
                  className="rounded-2xl border border-sand/70 bg-white px-3 py-2 text-sm"
                >
                  <option value="OFF">Natural</option>
                  <option value="SOFT">Suave (recomendado)</option>
                  <option value="MEDIUM">Intermedio</option>
                  <option value="STRONG">Fuerte</option>
                </select>
                <p className="text-xs text-muted">
                  Mas fuerte = sonido mas intervenido
                </p>
              </div>

              {/* Descripción */}
              <div className="grid gap-3 rounded-3xl border border-sand/70 bg-white p-4">
                <label className="text-sm font-medium text-ink">
                  Descripcion o contexto (opcional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Ej: dilema laboral, confesiones, mensaje corto"
                  rows={4}
                  className="rounded-2xl border border-sand/70 bg-white px-3 py-2 text-sm"
                />
                <p className="text-xs text-muted">
                  Esto ayuda a generar un mejor resumen automatico
                </p>
              </div>

              {/* Tags sugeridos */}
              <div className="grid gap-3 rounded-3xl border border-sand/70 bg-white p-4">
                <label className="text-sm font-medium text-ink">
                  Etiquetas sugeridas (opcional)
                </label>
                <input
                  type="text"
                  value={formData.tagsSuggested}
                  onChange={(e) =>
                    setFormData({ ...formData, tagsSuggested: e.target.value })
                  }
                  placeholder="confesiones, barrio, rarezas (separados por coma)"
                  className="rounded-2xl border border-sand/70 bg-white px-3 py-2 text-sm"
                />
                <p className="text-xs text-muted">
                  Sugeri categorias que te parezcan apropiadas
                </p>
              </div>

              {/* Botones */}
              <div className="flex flex-wrap gap-3">
                <button type="submit" className="btn-primary">
                  Confirmar y sumar
                </button>
                <button
                  type="button"
                  onClick={cancelUpload}
                  className="btn-ghost"
                >
                  Cancelar
                </button>
              </div>
            </form>

            <div className="rounded-3xl border border-sand/70 bg-white p-4 text-xs text-muted">
              <p>
                Al confirmar, tu audio se procesa en segundo plano y se suma a la radio cuando termina.
              </p>
            </div>
          </div>
        </section>
      )}
    </Layout>
  );
}

// === Helper functions (mantener todas las existentes) ===

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

function formatRecordingState(state) {
  switch (state) {
    case "recording":
      return "Grabando";
    case "processing":
      return "Procesando";
    case "ready":
      return "Lista para subir";
    default:
      return "Listo para grabar";
  }
}

export default UploadPage;
