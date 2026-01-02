# Arquitectura Frontend - Winivox

Documentación de la arquitectura del frontend de Winivox, una plataforma de radio comunitaria anónima.

## Stack Tecnológico

- **React 19.2.3**: Biblioteca principal de UI
- **Vite 5.4.6**: Build tool y dev server
- **TailwindCSS 3.4.10**: Utility-first CSS framework
- **Sin TypeScript**: Decisión de diseño para mantener simplicidad
- **Vitest 1.6.0**: Tests unitarios
- **Playwright 1.57.0**: Tests E2E y accesibilidad

## Estructura de Archivos

```
frontend/
├── src/
│   ├── components/        # Componentes reutilizables
│   │   ├── AuthPanel.jsx
│   │   ├── Layout.jsx
│   │   ├── Player.jsx
│   │   ├── SkeletonCard.jsx
│   │   └── Toast.jsx
│   ├── hooks/             # Custom hooks
│   │   ├── useAuth.js
│   │   ├── useFeed.js
│   │   ├── usePlayer.js
│   │   └── useToast.js
│   ├── lib/               # Utilidades
│   │   └── api.js
│   ├── styles.css         # Estilos globales y variables CSS
│   ├── FeedPage.jsx       # Página principal (feed de historias)
│   ├── UploadPage.jsx     # Página de subida de audios
│   ├── LibraryPage.jsx    # Página de biblioteca del usuario
│   └── feed.jsx           # Entry point del feed
├── e2e/                   # Tests End-to-End con Playwright
│   ├── auth.spec.js
│   ├── feed.spec.js
│   ├── upload.spec.js
│   ├── library.spec.js
│   └── a11y.spec.js
├── tests/                 # Tests unitarios con Vitest
│   ├── feed.test.jsx
│   ├── upload.test.jsx
│   └── library.test.jsx
└── playwright.config.js
```

## Arquitectura de Componentes

### Separación de Responsabilidades

La arquitectura sigue el principio de **separación entre lógica y presentación**:

- **Custom Hooks**: Encapsulan toda la lógica de negocio y estado
- **Componentes**: Se enfocan exclusivamente en la presentación UI

### Custom Hooks

#### `useAuth()`

Gestiona autenticación de usuario.

**Exports:**
- `token`, `email`, `password`, `authError`
- `headers` (memoizado con token)
- `handleRegister()`, `handleLogin()`, `handleLogout()`
- `setEmail()`, `setPassword()`

**Ejemplo:**
```javascript
const { token, handleLogin, headers } = useAuth();
```

#### `useFeed()`

Gestiona el feed de historias, tags y serendipia.

**Exports:**
- `feed`, `feedLoading`, `feedError`
- `sortedFeed` (computado), `sortMode`, `setSortMode()`
- `tagOptions`, `selectedTags`, `setSelectedTags()`
- `lowSerendipia`, `loadLowSerendipia()`
- `loadFeed()`, `loadTags()`

**Características:**
- Sincronización automática de tags con URL
- Ordenamiento reactivo (latest/top)
- Carga de contenido de baja serendipia

**Ejemplo:**
```javascript
const { sortedFeed, selectedTags, setSelectedTags } = useFeed();
```

#### `usePlayer(feed)`

Gestiona el reproductor de audio.

**Exports:**
- `currentTrack`, `autoPlay`, `nextTrack`
- `playerNotice`, `playerError`
- `sleepTimer`, `playbackRate`, `volume`
- `audioRef` (ref al elemento audio)
- `selectTrack()`, `skipToNext()`, `handleTrackEnded()`
- `setSleepTimer()`, `setPlaybackRate()`, `setVolume()`

**Características:**
- Auto-play con manejo de bloqueos del navegador
- Sleep timer con cleanup automático
- Selección inteligente de siguiente track por tags compartidos
- Sincronización de playbackRate y volume con elemento audio

**Ejemplo:**
```javascript
const { currentTrack, selectTrack, playbackRate, setPlaybackRate } = usePlayer(feed);
```

#### `useToast()`

Gestiona notificaciones toast.

**Exports:**
- `toast` (objeto con message y type)
- `showToast(message, type)`
- `hideToast()`

**Ejemplo:**
```javascript
const { toast, showToast, hideToast } = useToast();

showToast('¡Operación exitosa!', 'success');

{toast && <Toast {...toast} onClose={hideToast} />}
```

### Componentes

#### `<Player />`

Reproductor de audio fijo en la parte inferior.

**Props:**
- `currentTrack`, `audioRef`, `nextTrack`
- `onTrackEnded`, `onSkip`
- `playerNotice`, `playerError`
- `sleepTimer`, `onSleepTimerChange`
- `playbackRate`, `onPlaybackRateChange`
- `volume`, `onVolumeChange`
- `getTitleFn`, `truncateFn` (helpers opcionales)

**Optimización:** Memoizado con `React.memo`

#### `<Toast />`

Notificación temporal con auto-close.

**Props:**
- `message` (string)
- `type` ('success' | 'error' | 'info')
- `onClose` (callback)

**Comportamiento:**
- Auto-close después de 3 segundos
- Atributos ARIA para lectores de pantalla

**Optimización:** Memoizado con `React.memo`

#### `<SkeletonCard />`

Placeholder visual durante carga.

**Props:** Ninguno (componente puro)

**Optimización:** Memoizado con `React.memo`

#### `<AuthPanel />`

Panel de autenticación con login/registro.

**Props:**
- `email`, `password`, `error`
- `onEmailChange`, `onPasswordChange`
- `onRegister`, `onLogin`

**Accesibilidad:**
- Labels explícitos con `htmlFor`/`id`
- Atributos ARIA (`aria-required`, `aria-invalid`, `aria-describedby`)

#### `<Layout />`

Layout principal con navegación y skip link.

**Props:**
- `current` ('feed' | 'upload' | 'library')
- `token`, `onLogout`
- `rightRail` (contenido del sidebar derecho)
- `player` (componente Player)
- `children` (contenido principal)

**Accesibilidad:**
- Skip link al contenido principal
- Padding bottom para evitar superposición con player

## Optimizaciones de Performance

### React.memo

Componentes memoizados para prevenir re-renders innecesarios:
- `<Player />`, `<Toast />`, `<SkeletonCard />`

### useCallback

Callbacks estables en todos los componentes principales:
- FeedPage: 5+ callbacks
- UploadPage: 10+ callbacks
- LibraryPage: 2+ callbacks

**Beneficios:**
- Reducción de re-renders en child components
- Dependencias más estables en useEffect
- Mejor performance general

### useMemo

Cálculos computados memoizados:
- `nextTrack` en usePlayer (basado en tags compartidos)
- `sortedFeed` en useFeed (ordenamiento reactivo)
- `headers` en useAuth (con token)
- `filteredSubmissions` en LibraryPage

## Gestión de Estado

### Local State (useState)

Se usa para estado local de componentes:
- Formularios (email, password)
- UI temporal (modales, loading states)

### Lifting State Up

Estado compartido vive en custom hooks:
- `useAuth`: estado de autenticación global
- `useFeed`: estado del feed compartido
- `usePlayer`: estado del reproductor compartido

### URL como Estado

Tags seleccionados se sincronizan con URL:
```javascript
// useFeed sincroniza automáticamente
const { selectedTags } = useFeed();
// URL: /?tags=Confesiones,Dilemas
```

## Patrones de Diseño

### Container/Presenter Pattern

**Containers (Pages):**
- FeedPage, UploadPage, LibraryPage
- Contienen hooks para lógica
- Pasan props a componentes presentacionales

**Presenters (Components):**
- Player, Toast, SkeletonCard, AuthPanel
- Solo reciben props
- No contienen lógica de negocio

### Render Props

Algunas funciones se pasan como props para permitir personalización:
```javascript
<Player
  getTitleFn={getStoryTitle}
  truncateFn={truncateText}
/>
```

### Compound Components

Layout actúa como compound component:
```javascript
<Layout rightRail={...} player={...}>
  {/* children */}
</Layout>
```

## Comunicación con Backend

### API Client

Archivo `lib/api.js` contiene:
- `apiBase`: URL base del API
- `fetchJson()`: Wrapper de fetch con manejo de JSON
- `authHeaders(token)`: Headers con autorización
- `logDev()`: Logs condicionales en desarrollo

### Manejo de Errores

**Try/Catch con User Feedback:**
```javascript
try {
  await fetchJson(...);
  showToast('¡Éxito!', 'success');
} catch {
  showToast('Error al cargar', 'error');
}
```

**Error Boundaries:** No implementados (React 19 recomienda usar error.jsx en frameworks)

### Server-Sent Events (SSE)

LibraryPage usa SSE para updates en tiempo real:
```javascript
const eventSource = new EventSource(`${apiBase}/events/stream?token=${token}`);

eventSource.onmessage = (e) => {
  const event = JSON.parse(e.data);
  // Actualizar submissions
};
```

## Accesibilidad (WCAG 2.1 AA)

### Cumplimiento Validado

- **Auditoría automática:** 0 violaciones con axe-core
- **Tests E2E:** Suite completa de tests de accesibilidad

### Implementación

**Labels Explícitos:**
```javascript
<label htmlFor="auth-email">Correo</label>
<input id="auth-email" type="email" ... />
```

**ARIA Attributes:**
- Live regions para contenido dinámico
- Progress bars con `aria-valuenow`/`min`/`max`
- Modales con `role="dialog"` y `aria-modal`
- Toasts con `role="status"` y `aria-live="polite"`

**Focus Management:**
- Skip link visible al tabular
- Focus automático en modales
- Outline mejorado en `:focus-visible`

**Navegación por Teclado:**
- Todos los elementos interactivos accesibles con Tab
- Escape cierra modales
- Enter activa skip link

**Contraste de Color:**
- Ratio 5.5:1 en textos muted (cumple WCAG AA)
- Validado con axe-core

**Reduced Motion:**
```css
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; }
}
```

## Testing

### Tests Unitarios (Vitest)

- Smoke tests básicos en feed, upload, library
- Enfoque en funcionalidad crítica

### Tests E2E (Playwright)

60+ tests en 5 archivos:
- `auth.spec.js`: Autenticación (8 tests)
- `feed.spec.js`: Feed de historias (14 tests)
- `upload.spec.js`: Subida de audios (10 tests)
- `library.spec.js`: Biblioteca de usuario (12 tests)
- `a11y.spec.js`: Accesibilidad WCAG (20+ tests)

**Configuración multi-browser:**
- Chromium, Firefox, WebKit
- Mobile Chrome (Pixel 5)
- Mobile Safari (iPhone 12)

**Scripts:**
```bash
npm run test:e2e          # Ejecutar todos
npm run test:e2e:ui       # Modo interactivo
npm run test:e2e:headed   # Ver navegador
npm run test:e2e:debug    # Debugging
npm run test:e2e:report   # Reporte HTML
```

## Mejores Prácticas

### 1. Evitar Sobre-Ingeniería

✅ **Hacer:**
- Soluciones simples y directas
- Abstracciones solo cuando se reutiliza 3+ veces

❌ **Evitar:**
- Feature flags innecesarios
- Abstracciones prematuras
- Helpers para operaciones únicas

### 2. Componentes Pequeños

- FeedPage reducido de 870 → 656 líneas (24%)
- Extraer lógica a hooks personalizados
- Extraer UI repetitiva a componentes

### 3. Performance

- Memoizar componentes costosos
- useCallback para funciones pasadas como props
- useMemo para cálculos computados
- Virtualización solo si >50 items (no necesaria actualmente)

### 4. Accesibilidad First

- Labels explícitos en todos los inputs
- ARIA attributes donde sea necesario
- Skip links para navegación por teclado
- Validación continua con axe-core

### 5. Error Handling

- Try/catch en todas las operaciones async
- User feedback con toasts
- Botones de "Reintentar" en errores
- Estados de error claros

## Flujos Principales

### 1. Reproducción de Audio

```
Usuario click "Escuchar"
  → selectTrack(item) en usePlayer
    → setCurrentTrack(item)
    → setAutoPlay(true)
  → useEffect detecta cambio
    → audioRef.current.play()
  → Player renderiza con nuevos controles
  → Usuario ajusta velocidad/volumen
    → setPlaybackRate() / setVolume()
    → useEffect sincroniza con audio element
```

### 2. Filtrado por Tags

```
Usuario click en tag
  → setSelectedTags([...prev, tag]) en useFeed
  → useEffect detecta cambio en selectedTags
    → updateTagsInUrl(selectedTags)
    → loadFeed(selectedTags)
  → Feed se actualiza con contenido filtrado
```

### 3. Upload de Audio

```
Usuario selecciona archivo
  → handleFileSelect()
    → uploadFileToMinio(file)
      → POST /submissions (crear)
      → PUT MinIO URL (upload con progress)
      → setStep(2) (paso de configuración)
Usuario configura (anon mode, descripción, tags)
  → confirmUpload()
    → POST /submissions/:id/uploaded
    → Redirect a /library/
```

## Próximos Pasos

### Potenciales Mejoras Futuras

1. **Virtualización**: Si users superan 50-100 submissions
2. **Service Worker**: Para offline support
3. **PWA**: Instalable como app
4. **Lazy Loading**: Code splitting por ruta
5. **State Management**: Context API si el estado crece
6. **Forms Library**: React Hook Form si forms se complejizan

### Mantenimiento

- Actualizar dependencies regularmente
- Ejecutar tests E2E en CI/CD
- Revisar axe-core en cada release
- Monitorear bundle size
