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
        <label className="text-xs text-muted">
          Correo
          <input type="email" value={email} onChange={onEmailChange} />
        </label>
        <label className="text-xs text-muted">
          Contrasena
          <input type="password" value={password} onChange={onPasswordChange} />
        </label>
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
        <p className="mt-3 text-sm text-[#a24538]" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

export default AuthPanel;
