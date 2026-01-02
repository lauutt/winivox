import logoPng from "../img/logo_winivox.png";
import logoWebp from "../img/logo_winivox.webp";

const navItems = [
  { id: "feed", label: "Inicio", href: "/" },
  { id: "library", label: "Mi biblioteca", href: "/library/" },
  { id: "upload", label: "Subir audio", href: "/upload/" }
];

function Layout({
  current,
  token = "",
  onLogout = () => {},
  heroTitle,
  heroCopy,
  heroBadgeLabel,
  heroBadgeValue,
  children,
  rightRail,
  player
}) {
  return (
    <div className="relative">
      <div className="mx-auto flex min-h-screen w-full flex-col gap-6 px-5 pb-36 pt-6 sm:px-6 lg:w-[80%] lg:px-0 lg:grid lg:grid-cols-[240px_minmax(0,1fr)_280px] lg:items-start xl:grid-cols-[260px_minmax(0,1fr)_300px]">
        <aside className="surface-glass flex flex-col gap-4 lg:sticky lg:top-6 animate-fade-up">
          <div className="flex items-center gap-3">
            <picture className="relative h-12 w-12 overflow-hidden rounded-2xl bg-accent2/80 shadow-soft">
              <source srcSet={logoWebp} type="image/webp" />
              <img
                src={logoPng}
                alt="Logo de Winivox"
                className="h-full w-full object-cover"
              />
            </picture>
            <div>
              <h1 className="text-xl">Winivox</h1>
              <p className="text-xs text-muted">Radio de la comunidad</p>
            </div>
          </div>
          <nav className="flex flex-wrap gap-2 text-sm lg:flex-col">
            {navItems.map((item) => (
              <a
                key={item.id}
                href={item.href}
                className={`rounded-full px-3 py-2 font-medium transition ${
                  current === item.id
                    ? "bg-accent/80 text-ink shadow-soft"
                    : "text-muted hover:bg-sand/70 hover:text-ink"
                }`}
                aria-current={current === item.id ? "page" : undefined}
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="text-xs text-muted">
            {token ? (
              <button type="button" className="btn-ink w-full" onClick={onLogout}>
                Cerrar sesion
              </button>
            ) : (
              <span>Inicia sesion para subir</span>
            )}
          </div>
        </aside>

        <main className="flex min-w-0 flex-col gap-6 animate-fade-up animate-delay-100">
          <header className="rounded-3xl border border-sand/80 bg-white p-6 shadow-soft">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl sm:text-3xl">{heroTitle}</h2>
                <p className="mt-2 max-w-xl text-sm text-muted sm:text-base">
                  {heroCopy}
                </p>
              </div>
              <div className="surface-muted w-fit">
                <span className="block text-[10px] uppercase tracking-[0.3em] text-muted">
                  {heroBadgeLabel}
                </span>
                <strong className="text-base text-ink">{heroBadgeValue}</strong>
              </div>
            </div>
          </header>

          {children}

          <footer className="surface text-xs text-muted">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2 sm:max-w-sm">
                <strong className="text-sm text-ink">Winivox</strong>
                <p>
                  Demo de radio de la comunidad. Este sitio es un entorno de
                  prueba y su contenido es solo ilustrativo.
                </p>
                <p>
                  Al usar la plataforma aceptas nuestras condiciones basicas de
                  uso, privacidad y cookies.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-muted">
                <a href="/terms" className="underline decoration-sand/80">
                  Terminos y condiciones
                </a>
                <a href="/privacy" className="underline decoration-sand/80">
                  Politica de privacidad
                </a>
                <a href="/cookies" className="underline decoration-sand/80">
                  Politica de cookies
                </a>
                <a href="/legal" className="underline decoration-sand/80">
                  Aviso legal
                </a>
                <a href="/contact" className="underline decoration-sand/80">
                  Contacto
                </a>
              </div>
            </div>
            <div className="mt-4 border-t border-sand/70 pt-3 text-[11px] text-muted">
              (c) {new Date().getFullYear()} Winivox. Todos los derechos reservados.
            </div>
          </footer>
        </main>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-6 animate-fade-up animate-delay-200">
          {rightRail}
        </aside>
      </div>

      {player}
    </div>
  );
}

export default Layout;
