import { useCallback, useMemo, useState } from 'react';
import { apiBase, authHeaders } from '../lib/api.js';

/**
 * useAuth - Hook para gestionar autenticación de usuario
 *
 * @returns {Object} - Estado y funciones de autenticación
 * @property {string|null} token - JWT token del usuario
 * @property {string} email - Email ingresado en el formulario
 * @property {string} password - Password ingresado en el formulario
 * @property {string} authError - Mensaje de error de autenticación
 * @property {Object} headers - Headers con autorización para requests
 * @property {Function} setEmail - Actualizar email
 * @property {Function} setPassword - Actualizar password
 * @property {Function} handleRegister - Registrar nuevo usuario
 * @property {Function} handleLogin - Iniciar sesión
 * @property {Function} handleLogout - Cerrar sesión
 *
 * @example
 * const { token, email, password, authError, handleRegister, handleLogin, handleLogout, setEmail, setPassword, headers } = useAuth();
 *
 * // En el formulario
 * <input value={email} onChange={(e) => setEmail(e.target.value)} />
 * <button onClick={handleLogin}>Ingresar</button>
 */
export function useAuth() {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const headers = useMemo(() => authHeaders(token), [token]);

  const handleRegister = useCallback(async () => {
    setAuthError("");
    try {
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
    } catch (error) {
      setAuthError("Error de red al crear la cuenta");
    }
  }, [email, password]);

  const handleLogin = useCallback(async () => {
    setAuthError("");
    try {
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
    } catch (error) {
      setAuthError("Error de red al iniciar sesion");
    }
  }, [email, password]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("token");
    setToken(null);
  }, []);

  return {
    token,
    email,
    password,
    authError,
    headers,
    setEmail,
    setPassword,
    handleRegister,
    handleLogin,
    handleLogout
  };
}
