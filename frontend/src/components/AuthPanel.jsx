function AuthPanel({
  email,
  password,
  onEmailChange,
  onPasswordChange,
  onRegister,
  onLogin,
  error
}) {
  return (
    <section className="surface">
      <h3 className="text-lg">Acceso</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="auth-email" className="block text-xs text-muted mb-1">
            Correo
          </label>
          <input
            id="auth-email"
            type="email"
            value={email}
            onChange={onEmailChange}
            aria-required="true"
            aria-invalid={!!error}
            aria-describedby={error ? "auth-error" : undefined}
          />
        </div>
        <div>
          <label htmlFor="auth-password" className="block text-xs text-muted mb-1">
            Contrasena
          </label>
          <input
            id="auth-password"
            type="password"
            value={password}
            onChange={onPasswordChange}
            aria-required="true"
            aria-invalid={!!error}
            aria-describedby={error ? "auth-error" : undefined}
          />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" className="btn-primary" onClick={onRegister}>
          Crear cuenta
        </button>
        <button type="button" className="btn-ink" onClick={onLogin}>
          Ingresar
        </button>
      </div>
      {error && (
        <p id="auth-error" className="mt-3 text-sm text-[#a24538]" role="alert" aria-live="assertive">
          {error}
        </p>
      )}
    </section>
  );
}

export default AuthPanel;
