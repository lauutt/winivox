import { useCallback, useEffect, useMemo, useState } from "react";
import AuthPanel from "./components/AuthPanel.jsx";
import Layout from "./components/Layout.jsx";
import { useAuth } from "./hooks/useAuth.js";
import { apiBase, fetchJson, logDev } from "./lib/api.js";

const SOCIAL_FIELDS = [
  {
    key: "instagram",
    label: "Instagram",
    placeholder: "https://instagram.com/tuusuario"
  },
  {
    key: "tiktok",
    label: "TikTok",
    placeholder: "https://tiktok.com/@tuusuario"
  },
  {
    key: "x",
    label: "X (Twitter)",
    placeholder: "https://x.com/tuusuario"
  },
  {
    key: "youtube",
    label: "YouTube",
    placeholder: "https://youtube.com/@tuusuario"
  },
  {
    key: "website",
    label: "Sitio",
    placeholder: "https://tusitio.com"
  }
];

const emptySocialLinks = () =>
  SOCIAL_FIELDS.reduce((acc, field) => {
    acc[field.key] = "";
    return acc;
  }, {});

function ProfilePage() {
  const { token, email, password, authError, headers, setEmail, setPassword, handleRegister, handleLogin, handleLogout } = useAuth();

  const [authChecked, setAuthChecked] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [saveState, setSaveState] = useState({
    status: "idle",
    message: ""
  });
  const [photoState, setPhotoState] = useState({
    status: "idle",
    message: "",
    previewUrl: "",
    objectKey: ""
  });
  const [removePhoto, setRemovePhoto] = useState(false);
  const [profile, setProfile] = useState({
    bio: "",
    socialLinks: emptySocialLinks(),
    photoUrl: ""
  });

  const photoPreview = useMemo(() => {
    if (removePhoto) return "";
    return photoState.previewUrl || profile.photoUrl;
  }, [removePhoto, photoState.previewUrl, profile.photoUrl]);

  const completion = useMemo(() => {
    const hasPhoto = Boolean(photoPreview);
    const hasBio = Boolean(profile.bio.trim());
    const hasSocial = Object.values(profile.socialLinks || {}).some(
      (value) => value && value.trim()
    );
    const count = [hasPhoto, hasBio, hasSocial].filter(Boolean).length;
    return { hasPhoto, hasBio, hasSocial, count, total: 3 };
  }, [photoPreview, profile.bio, profile.socialLinks]);

  const activeSocial = useMemo(
    () =>
      SOCIAL_FIELDS.filter((field) => profile.socialLinks[field.key]?.trim()),
    [profile.socialLinks]
  );

  const loadProfile = useCallback(async () => {
    if (!token) return;
    setProfileLoading(true);
    setProfileError("");
    try {
      const data = await fetchJson(`${apiBase}/profile`, { headers });
      setProfile({
        bio: data.bio || "",
        socialLinks: { ...emptySocialLinks(), ...(data.social_links || {}) },
        photoUrl: data.profile_photo_url || ""
      });
    } catch (error) {
      logDev("profile load failed", error);
      setProfileError("No se pudo cargar tu perfil.");
    } finally {
      setProfileLoading(false);
    }
  }, [token, headers]);

  useEffect(() => {
    if (!token) {
      setAuthChecked(true);
      return;
    }

    fetchJson(`${apiBase}/auth/me`, { headers })
      .then(() => {
        setAuthChecked(true);
        return loadProfile();
      })
      .catch((error) => {
        if (error.status === 401) {
          handleLogout();
          setAuthChecked(true);
          return;
        }
        setAuthChecked(true);
        setProfileError("No se pudo verificar la sesion.");
      });
  }, [token, headers, loadProfile, handleLogout]);

  useEffect(() => {
    return () => {
      if (photoState.previewUrl && photoState.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(photoState.previewUrl);
      }
    };
  }, [photoState.previewUrl]);

  const handlePhotoSelect = useCallback(
    async (event) => {
      const file = event.target.files?.[0];
      if (!file || !token) return;

      if (photoState.previewUrl && photoState.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(photoState.previewUrl);
      }

      const previewUrl = URL.createObjectURL(file);
      setRemovePhoto(false);
      setPhotoState({
        status: "uploading",
        message: "Subiendo foto...",
        previewUrl,
        objectKey: ""
      });

      try {
        const res = await fetch(`${apiBase}/profile/photo`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify({
            filename: file.name,
            content_type: file.type || "image/jpeg"
          })
        });

        if (!res.ok) {
          const message = "No se pudo preparar la subida.";
          setPhotoState({
            status: "error",
            message,
            previewUrl,
            objectKey: ""
          });
          return;
        }

        const data = await res.json();
        const uploadRes = await fetch(data.upload_url, {
          method: "PUT",
          headers: { "Content-Type": file.type || "image/jpeg" },
          body: file
        });

        if (!uploadRes.ok) {
          const message = "No se pudo subir la foto.";
          setPhotoState({
            status: "error",
            message,
            previewUrl,
            objectKey: ""
          });
          return;
        }

        setPhotoState({
          status: "uploaded",
          message: "Foto lista para usar.",
          previewUrl,
          objectKey: data.object_key
        });
      } catch (error) {
        logDev("profile photo upload failed", error);
        setPhotoState({
          status: "error",
          message: "Error de red al subir la foto.",
          previewUrl,
          objectKey: ""
        });
      }
    },
    [token, headers, photoState.previewUrl]
  );

  const handleRemovePhoto = useCallback(() => {
    if (photoState.previewUrl && photoState.previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(photoState.previewUrl);
    }
    setPhotoState({ status: "idle", message: "", previewUrl: "", objectKey: "" });
    setRemovePhoto(true);
  }, [photoState.previewUrl]);

  const handleSave = useCallback(async () => {
    if (!token) return;
    setSaveState({ status: "saving", message: "Guardando..." });
    const cleanedLinks = SOCIAL_FIELDS.reduce((acc, field) => {
      const value = profile.socialLinks[field.key]?.trim();
      if (value) {
        acc[field.key] = value;
      }
      return acc;
    }, {});

    const payload = {
      bio: profile.bio.trim() || null,
      social_links: Object.keys(cleanedLinks).length ? cleanedLinks : null
    };

    if (photoState.objectKey) {
      payload.profile_photo_key = photoState.objectKey;
    }
    if (removePhoto) {
      payload.profile_photo_key = null;
    }

    try {
      const res = await fetch(`${apiBase}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        setSaveState({ status: "error", message: "No se pudo guardar." });
        return;
      }
      const data = await res.json();
      setProfile({
        bio: data.bio || "",
        socialLinks: { ...emptySocialLinks(), ...(data.social_links || {}) },
        photoUrl: data.profile_photo_url || ""
      });
      setPhotoState({ status: "idle", message: "", previewUrl: "", objectKey: "" });
      setRemovePhoto(false);
      setSaveState({ status: "success", message: "Listo. Perfil actualizado." });
    } catch (error) {
      logDev("profile save failed", error);
      setSaveState({ status: "error", message: "Error de red al guardar." });
    }
  }, [token, headers, profile, photoState.objectKey, removePhoto]);

  return (
    <Layout
      current="profile"
      token={token}
      onLogout={handleLogout}
      heroTitle="Tu perfil de voz"
      heroCopy="Personaliza tu presencia en la radio. Bio breve, redes opcionales y una foto que se vuelve la portada base de tus audios."
      heroBadgeLabel="Identidad"
      heroBadgeValue="Configuracion"
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
            Inicia sesion para editar tu perfil y portada base.
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
          {profileLoading && (
            <p className="text-sm text-muted">Cargando perfil...</p>
          )}
          {profileError && (
            <p className="text-sm text-[#a24538]" role="alert">
              {profileError}
            </p>
          )}
          {!profileLoading && !profileError && (
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="flex flex-col gap-6">
                <div className="surface-muted">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <span className="text-xs uppercase tracking-[0.3em] text-muted">
                        Checklist
                      </span>
                      <h4 className="mt-2 text-base">Dale forma a tu perfil</h4>
                      <p className="mt-1 text-xs text-muted">
                        Tres toques y listo: foto, bio y redes si queres.
                      </p>
                    </div>
                    <div className="badge">
                      {completion.count}/{completion.total} listo
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-muted">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          completion.hasPhoto ? "bg-emerald-500" : "bg-sand/70"
                        }`}
                        aria-hidden="true"
                      />
                      Foto de portada base
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          completion.hasBio ? "bg-emerald-500" : "bg-sand/70"
                        }`}
                        aria-hidden="true"
                      />
                      Bio corta y directa
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          completion.hasSocial ? "bg-emerald-500" : "bg-sand/70"
                        }`}
                        aria-hidden="true"
                      />
                      Redes que quieras mostrar
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-sand/70 bg-white p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="relative">
                      <div
                        className="cover-art h-32 w-32 rounded-3xl border border-sand/70 shadow-soft"
                        style={photoPreview ? { backgroundImage: `url(${photoPreview})` } : undefined}
                        aria-label="Vista previa de la foto de perfil"
                      />
                      <span className="badge absolute -bottom-2 left-3 text-[9px]">
                        Portada base
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-sm">Foto de perfil</strong>
                        <span className="chip text-[10px]">JPG o PNG</span>
                      </div>
                      <span className="text-xs text-muted">
                        Se muestra en cada audio si no subis una portada puntual.
                      </span>
                      <div className="flex flex-wrap gap-2">
                        <label className="btn-ghost text-xs cursor-pointer">
                          Elegir foto
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoSelect}
                            className="hidden"
                          />
                        </label>
                        {!removePhoto && (photoPreview || profile.photoUrl) && (
                          <button
                            type="button"
                            className="btn-ghost text-xs"
                            onClick={handleRemovePhoto}
                          >
                            Quitar
                          </button>
                        )}
                      </div>
                      {removePhoto && (
                        <span className="text-xs text-muted">
                          La foto se eliminara al guardar.
                        </span>
                      )}
                      {photoState.message && (
                        <span
                          className={`text-xs ${
                            photoState.status === "error"
                              ? "text-[#a24538]"
                              : photoState.status === "uploaded"
                                ? "text-emerald-600"
                                : "text-muted"
                          }`}
                        >
                          {photoState.message}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 rounded-2xl border border-dashed border-sand/70 bg-cream/60 p-3 text-xs text-muted">
                    Consejo: fotos claras y centradas se leen mejor en cards chicas.
                  </div>
                </div>

                <div className="grid gap-3 rounded-3xl border border-sand/70 bg-white p-4">
                  <label className="text-sm font-medium text-ink">
                    Bio breve
                  </label>
                  <textarea
                    value={profile.bio}
                    onChange={(event) =>
                      setProfile((prev) => ({ ...prev, bio: event.target.value }))
                    }
                    placeholder="Conta en una linea quien sos o que estas contando."
                    rows={4}
                  />
                  <p className="text-xs text-muted">
                    Maximo una idea clara. La voz ya hace el resto.
                  </p>
                </div>

                <div className="grid gap-3 rounded-3xl border border-sand/70 bg-white p-4">
                  <label className="text-sm font-medium text-ink">
                    Redes sociales
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {SOCIAL_FIELDS.map((field) => (
                      <div key={field.key} className="grid gap-2">
                        <span className="text-xs text-muted">{field.label}</span>
                        <input
                          type="url"
                          value={profile.socialLinks[field.key] || ""}
                          onChange={(event) =>
                            setProfile((prev) => ({
                              ...prev,
                              socialLinks: {
                                ...prev.socialLinks,
                                [field.key]: event.target.value
                              }
                            }))
                          }
                          placeholder={field.placeholder}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleSave}
                    disabled={saveState.status === "saving"}
                  >
                    Guardar cambios
                  </button>
                  {saveState.message && (
                    <span
                      className={`text-xs ${
                        saveState.status === "error"
                          ? "text-[#a24538]"
                          : saveState.status === "success"
                            ? "text-emerald-600"
                            : "text-muted"
                      }`}
                    >
                      {saveState.message}
                    </span>
                  )}
                </div>
              </div>

              <aside className="flex flex-col gap-4">
                <div className="surface-muted">
                  <span className="text-xs uppercase tracking-[0.3em] text-muted">
                    Preview
                  </span>
                  <div className="mt-3 rounded-3xl border border-sand/70 bg-white p-4 shadow-soft">
                    <div
                      className="cover-art h-32 w-full rounded-2xl"
                      style={photoPreview ? { backgroundImage: `url(${photoPreview})` } : undefined}
                    />
                    <div className="mt-3">
                      <strong className="text-sm">Tu proxima historia</strong>
                      <p className="mt-1 text-xs text-muted">
                        {profile.bio.trim()
                          ? profile.bio.trim()
                          : "Tu bio aparece aca, corta y al hueso."}
                      </p>
                      {activeSocial.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted">
                          {activeSocial.map((field) => (
                            <span key={field.key} className="chip">
                              {field.label}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-[11px] text-muted">
                          Sin redes publicas por ahora.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="surface-muted">
                  <h4 className="text-base">Como se ve en la radio</h4>
                  <p className="mt-2 text-sm text-muted">
                    Si subis una portada especifica en un audio, esa imagen pisa
                    la foto del perfil solo para ese caso.
                  </p>
                </div>
              </aside>
            </div>
          )}
        </section>
      )}
    </Layout>
  );
}

export default ProfilePage;
