import logoPng from "../img/logo_winivox.png";
import logoWebp from "../img/logo_winivox.webp";

const navItems = [
  { id: "feed", label: "Feed", href: "/" },
  { id: "upload", label: "Upload", href: "/upload/" }
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
    <div className="page">
      <aside className="sidebar">
        <div className="brand">
          <picture className="brand-logo">
            <source srcSet={logoWebp} type="image/webp" />
            <img src={logoPng} alt="Winivox logo" />
          </picture>
          <div>
            <h1>Winivox</h1>
            <p>Anonymous audio stories</p>
          </div>
        </div>
        <nav>
          {navItems.map((item) => (
            <a
              key={item.id}
              href={item.href}
              className={current === item.id ? "active" : ""}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="sidebar-footer">
          {token ? (
            <button type="button" onClick={onLogout}>
              Log out
            </button>
          ) : (
            <span>Login to upload</span>
          )}
        </div>
      </aside>

      <main className="content">
        <header className="hero">
          <div>
            <h2>{heroTitle}</h2>
            <p>{heroCopy}</p>
          </div>
          <div className="hero-card">
            <span>{heroBadgeLabel}</span>
            <strong>{heroBadgeValue}</strong>
          </div>
        </header>

        {children}
      </main>

      <aside className="right-rail">{rightRail}</aside>

      {player}
    </div>
  );
}

export default Layout;
