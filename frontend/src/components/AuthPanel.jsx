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
    <section className="auth">
      <h3>Access</h3>
      <div className="auth-grid">
        <label>
          Email
          <input type="email" value={email} onChange={onEmailChange} />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={onPasswordChange} />
        </label>
        <div className="auth-actions">
          <button type="button" onClick={onRegister}>
            Register
          </button>
          <button type="button" onClick={onLogin}>
            Login
          </button>
        </div>
      </div>
      {error && <p className="error">{error}</p>}
    </section>
  );
}

export default AuthPanel;
