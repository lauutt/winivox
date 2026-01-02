import { useEffect, useMemo, useState } from "react";
import Layout from "./components/Layout.jsx";
import { useAuth } from "./hooks/useAuth.js";
import { apiBase } from "./lib/api.js";

const SOCIAL_LABELS = {
  instagram: "Instagram",
  tiktok: "TikTok",
  x: "X (Twitter)",
  youtube: "YouTube",
  website: "Sitio"
};

function PublicProfilePage() {
  const { token, handleLogout } = useAuth();
  const [profileId] = useState(() => readProfileId());
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState({ loading: true, error: "" });

  useEffect(() => {
    if (!profileId) {
      setStatus({ loading: false, error: "Perfil no encontrado." });
      return;
    }
    setStatus({ loading: true, error: "" });
    fetch(`${apiBase}/profile/public/${profileId}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error("profile failed");
        }
        return res.json();
      })
      .then((data) => {
        setProfile(data);
        setStatus({ loading: false, error: "" });
      })
      .catch(() => {
        setProfile(null);
        setStatus({ loading: false, error: "No se pudo cargar el perfil." });
      });
  }, [profileId]);

  const socialLinks = useMemo(() => {
    const links = profile?.social_links || {};
    return Object.entries(links).filter(([, value]) => value);
  }, [profile]);

  return (
    <Layout
      current="profile"
      token={token}
      onLogout={handleLogout}
      heroTitle="Perfil publico"
      heroCopy="Conoce a la persona detras de esta historia. Una foto, una bio corta y sus redes."
      heroBadgeLabel="Perfil"
      heroBadgeValue="Publico"
    >
      <section className="surface">
        {status.loading && (
          <p className="text-sm text-muted">Cargando perfil...</p>
        )}
        {!status.loading && status.error && (
          <p className="text-sm text-[#a24538]" role="alert">
            {status.error}
          </p>
        )}
        {!status.loading && !status.error && profile && (
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="flex flex-col gap-4">
              <div
                className="cover-art h-56 w-full rounded-3xl border border-sand/70 shadow-soft"
                style={
                  profile.profile_photo_url
                    ? { backgroundImage: `url(${profile.profile_photo_url})` }
                    : undefined
                }
                aria-label="Foto del perfil"
              />
              <div className="surface-muted">
                <span className="text-xs uppercase tracking-[0.3em] text-muted">
                  Bio
                </span>
                <p className="mt-2 text-sm text-ink">
                  {profile.bio || "Sin bio por ahora."}
                </p>
              </div>
              <a href="/" className="btn-ink w-fit">
                Volver al feed
              </a>
            </div>
            <div className="flex flex-col gap-4">
              <div className="surface-muted">
                <span className="text-xs uppercase tracking-[0.3em] text-muted">
                  Redes
                </span>
                {socialLinks.length === 0 ? (
                  <p className="mt-2 text-sm text-muted">
                    Esta persona no compartio redes por ahora.
                  </p>
                ) : (
                  <div className="mt-3 grid gap-2 text-sm">
                    {socialLinks.map(([key, value]) => (
                      <a
                        key={key}
                        href={value}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-2xl border border-sand/70 bg-white px-3 py-2 text-sm text-ink transition hover:bg-sand/40"
                      >
                        {SOCIAL_LABELS[key] || key}
                      </a>
                    ))}
                  </div>
                )}
              </div>
              <div className="surface-muted">
                <h4 className="text-base">Portadas de historias</h4>
                <p className="mt-2 text-sm text-muted">
                  Cuando no hay una portada especifica, se usa esta foto.
                </p>
              </div>
            </div>
          </div>
        )}
      </section>
    </Layout>
  );
}

function readProfileId() {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  return params.get("id") || "";
}

export default PublicProfilePage;
