# Winivox — Audio Stories Platform

Prueba de concepto privada de una plataforma de **historias en audio anónimas**, curadas por IA,
con experiencia de consumo tipo "radio comunitaria".

Este repo contiene una demo funcional end-to-end:
- Autenticación (registro/login)
- Upload de audio (archivo o grabación desde micrófono)
- Procesamiento asíncrono con pipeline completo
- Moderación automática con IA
- Publicación con tags y summary generados por IA
- Reproducción continua con encadenamiento inteligente
- Actualizaciones en tiempo real (SSE)

El foco es **validar concepto y experiencia**, no completar el producto final.

---

## Objetivo del PoC

Demostrar:
1. Que la gente puede subir audios fácilmente.
2. Que el sistema procesa audios sin bloquear al usuario.
3. Que el audio publicado suena bien y es anónimo.
4. Que la experiencia de escucha es simple y continua.

---

## Stack Tecnológico

### Backend
- **FastAPI 0.115.12** - API REST
- **PostgreSQL** - Base de datos relacional
- **Redis** - Queue para procesamiento asíncrono
- **MinIO** - Storage S3-compatible para archivos de audio

### Worker
- **RQ (Redis Queue)** - Processing jobs
- **FFmpeg** - Manipulación de audio (normalización, pitch shifting)
- **OpenAI API** - Transcripción (Whisper), moderación, y generación de metadata (GPT-4)

### Frontend
- **React 19.2.3** - UI library (sin TypeScript por diseño)
- **Vite 5.4.6** - Build tool y dev server
- **TailwindCSS 3.4.10** - Utility-first CSS
- **Playwright 1.57.0** - Testing E2E

---

## Qué incluye
- ✅ Backend FastAPI con endpoints REST completos
- ✅ Worker asíncrono (Redis queue) con pipeline de 6 pasos
- ✅ Frontend React multi-page (feed, upload, library)
- ✅ Storage S3-compatible (MinIO) con presigned URLs
- ✅ Pitch shifting real para anonimizar voz (3 niveles)
- ✅ Moderación automática vía OpenAI (rechaza contenido inapropiado)
- ✅ Transcripción con OpenAI Whisper
- ✅ Generación de título, summary y tags con GPT-4
- ✅ Reproductor de audio con controles avanzados (playback rate, sleep timer)
- ✅ Sistema de votación (+1)
- ✅ Filtrado por tags
- ✅ Actualizaciones en tiempo real con SSE
- ✅ Timeline de eventos para observabilidad
- ✅ Tests E2E con Playwright (60+ tests)
- ✅ Accesibilidad WCAG 2.1 AA completa

---

## Qué NO incluye (a propósito)
- Búsqueda avanzada (full-text search)
- Recomendaciones complejas (ML-based)
- Admin UI completa
- HLS / streaming adaptativo
- Mobile app nativa
- CDN / edge caching
- Analytics avanzados

---

## Filosofía del repo

- **Funcionar primero**
- **Escalar después**
- **Nada que no se pueda reemplazar**

Este repo es una base limpia para evolucionar a MVP sin reescribir todo.

---

## Setup Rápido

### Requisitos previos
- Docker + Docker Compose
- Node.js 18+ (para frontend)
- Python 3.11+ (para backend/worker)
- FFmpeg (instalado en el sistema)

### 1. Clonar el repo

```bash
git clone <repo-url>
cd winivox
```

### 2. Configurar variables de entorno

**Backend:**
```bash
cp backend/.env.example backend/.env
# Editar backend/.env y agregar:
# - OPENAI_API_KEY (obligatorio para transcripción y moderación)
# - SECRET_KEY (generar con: openssl rand -hex 32)
```

**Worker:**
```bash
cp worker/.env.example worker/.env
# Editar worker/.env y agregar:
# - OPENAI_API_KEY (mismo que backend)
```

**Frontend:**
```bash
cp frontend/.env.example frontend/.env
# Por defecto usa VITE_API_BASE=http://localhost:8000
```

### 3. Levantar infraestructura

```bash
docker-compose up -d postgres redis minio
```

Espera ~10 segundos para que MinIO inicialice el bucket.

### 4. Instalar dependencias

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate
pip install -r requirements.txt
```

**Worker:**
```bash
cd worker
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate
pip install -r requirements.txt
```

**Frontend:**
```bash
cd frontend
npm install
```

### 5. Ejecutar la aplicación

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload
```

**Terminal 2 - Worker:**
```bash
cd worker
source venv/bin/activate
python -m worker
```

**Terminal 3 - Frontend:**
```bash
cd frontend
npm run dev
```

**Acceder a la aplicación:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- MinIO Console: http://localhost:9001 (minioadmin / minioadmin)

---

## Testing

### Tests Unitarios

**Frontend (Vitest):**
```bash
cd frontend
npm run test          # Ejecutar todos los tests
npm run test:watch    # Modo watch
npm run test:ui       # Interfaz visual
```

**Backend (pytest):**
```bash
cd backend
pytest                # Ejecutar todos los tests
pytest -v             # Modo verbose
pytest tests/test_feed.py  # Test específico
```

**Worker (pytest):**
```bash
cd worker
pytest                # Ejecutar todos los tests
pytest -v             # Modo verbose
```

### Tests E2E (Playwright)

Los tests E2E requieren que la aplicación esté corriendo localmente (backend, worker y frontend).

```bash
cd frontend

# Primera vez: instalar navegadores
npx playwright install

# Ejecutar todos los tests E2E
npm run test:e2e

# Modo interactivo (UI de Playwright)
npm run test:e2e:ui

# Ver navegador durante ejecución
npm run test:e2e:headed

# Modo debugging
npm run test:e2e:debug

# Ver reporte HTML
npm run test:e2e:report

# Ejecutar test específico
npx playwright test e2e/feed.spec.js
```

**Suite de tests E2E:**
- `e2e/auth.spec.js` - Autenticación (8 tests)
- `e2e/feed.spec.js` - Feed y reproducción (14 tests)
- `e2e/upload.spec.js` - Upload de audio (10 tests)
- `e2e/library.spec.js` - Library y SSE (12 tests)
- `e2e/a11y.spec.js` - Accesibilidad WCAG 2.1 AA (20+ tests)

**Total: 60+ tests E2E** validando todos los flujos críticos y accesibilidad completa.

---

## Validación E2E Completa

Para validar el flujo completo end-to-end:

```bash
./scripts/verify-e2e.sh
```

Este script:
1. Valida que todos los servicios estén corriendo
2. Crea un usuario de prueba
3. Sube un audio de prueba
4. Verifica el procesamiento completo
5. Valida que aparezca en el feed

---

## Arquitectura

### Pipeline de Procesamiento

Cuando un usuario sube un audio, pasa por 6 pasos:

1. **CREATED** - Submission creado en DB
2. **UPLOADED** - Archivo subido a MinIO
3. **PROCESSING** - Worker procesa el audio:
   - Normalización de audio
   - Pitch shifting (anonimización)
   - Transcripción con Whisper
   - Moderación de contenido
   - Generación de metadata (título, summary, tags) con GPT-4
4. **APPROVED** - Audio aprobado y publicado en feed
5. **REJECTED** - Audio rechazado por moderación (puede reprocesarse)
6. **QUARANTINED** - Audio en cuarentena por errores técnicos

### Servicios

```
┌─────────────┐
│   Frontend  │ (React + Vite)
│  :5173      │
└──────┬──────┘
       │
       ↓
┌─────────────┐     ┌─────────────┐
│   Backend   │────→│   MinIO     │ (Storage)
│  FastAPI    │     │   :9000     │
│  :8000      │     └─────────────┘
└──────┬──────┘
       │
       ↓
┌─────────────┐     ┌─────────────┐
│   Redis     │←────│   Worker    │ (RQ)
│   :6379     │     │   Python    │
└─────────────┘     └─────────────┘
       ↑
       │
┌─────────────┐
│  PostgreSQL │
│   :5432     │
└─────────────┘
```

Para más detalles, ver:
- [docs/architecture.md](docs/architecture.md) - Arquitectura general
- [docs/frontend-architecture.md](docs/frontend-architecture.md) - Arquitectura frontend
- [docs/pipeline.md](docs/pipeline.md) - Pipeline de procesamiento
- [docs/data-model.md](docs/data-model.md) - Modelo de datos

---

## Documentación

- **Setup y Desarrollo:**
  - [docs/dev-setup.md](docs/dev-setup.md) - Guía detallada de setup
  - [docs/troubleshooting.md](docs/troubleshooting.md) - Solución de problemas comunes

- **Arquitectura:**
  - [docs/architecture.md](docs/architecture.md) - Arquitectura general del sistema
  - [docs/frontend-architecture.md](docs/frontend-architecture.md) - Arquitectura frontend (hooks, componentes, patterns)
  - [docs/data-model.md](docs/data-model.md) - Modelo de datos y schemas
  - [docs/pipeline.md](docs/pipeline.md) - Pipeline de procesamiento detallado

- **Features:**
  - [docs/events.md](docs/events.md) - Sistema de eventos y SSE
  - [docs/llm-prompts.md](docs/llm-prompts.md) - Prompts de OpenAI

- **Testing:**
  - [docs/testing-guide.md](docs/testing-guide.md) - Guía completa de testing (unitario + E2E)

- **Meta:**
  - [docs/docs-owner.md](docs/docs-owner.md) - Estado real del código y endpoints
  - [docs/changes-log.md](docs/changes-log.md) - Log de cambios realizados
  - [docs/vision.md](docs/vision.md) - Visión del producto

---

## Accesibilidad (WCAG 2.1 AA)

El proyecto cumple con WCAG 2.1 AA:

✅ **Navegación por teclado completa**
- Skip link al contenido principal
- Focus management en modales
- Escape key para cerrar modales
- Tab navigation en todos los elementos interactivos

✅ **ARIA completo**
- Labels explícitos en todos los formularios
- Live regions para contenido dinámico
- Progress bars con aria-valuenow/min/max
- Modales con role="dialog" y aria-modal
- Toasts con role="status" y aria-live

✅ **Contraste de color**
- Ratio >= 4.5:1 en todo el texto
- Focus visible con outline de 3px

✅ **Responsive y Mobile**
- Diseño adaptable desde 320px
- Touch targets >= 44x44px
- Viewports mobile testeados (Pixel 5, iPhone 12)

**Validación:** Todos los tests de `e2e/a11y.spec.js` pasan sin violaciones.

---

## Troubleshooting

### Error: "Connection refused" en Backend

```bash
# Verificar que PostgreSQL y Redis estén corriendo
docker-compose ps

# Si no están corriendo:
docker-compose up -d postgres redis minio
```

### Error: "OPENAI_API_KEY not found"

```bash
# Agregar API key en backend/.env y worker/.env
echo "OPENAI_API_KEY=sk-..." >> backend/.env
echo "OPENAI_API_KEY=sk-..." >> worker/.env

# Reiniciar backend y worker
```

### Error: "MinIO bucket not found"

```bash
# Recrear bucket manualmente
docker-compose exec minio mc mb /data/audio-submissions
docker-compose exec minio mc anonymous set download /data/audio-submissions
```

### Tests E2E fallan con "Failed to connect"

```bash
# Asegurar que backend, worker y frontend estén corriendo:
# Terminal 1: cd backend && uvicorn app.main:app --reload
# Terminal 2: cd worker && python -m worker
# Terminal 3: cd frontend && npm run dev

# Luego ejecutar tests:
cd frontend && npm run test:e2e
```

Para más detalles: [docs/troubleshooting.md](docs/troubleshooting.md)

---

## Contribuir

Este es un PoC privado. Si vas a hacer cambios:

1. **Leer documentación:**
   - [CLAUDE.md](CLAUDE.md) - Guardrails para agentes
   - [docs/docs-owner.md](docs/docs-owner.md) - Estado actual del código

2. **Ejecutar tests antes de commitear:**
   ```bash
   cd frontend && npm run test && npm run test:e2e
   cd ../backend && pytest
   cd ../worker && pytest
   ```

3. **Actualizar documentación:**
   - Actualizar [docs/changes-log.md](docs/changes-log.md) con tus cambios
   - Actualizar [docs/docs-owner.md](docs/docs-owner.md) si agregaste endpoints o features

---

## Próximos Pasos (Post-PoC)

- [ ] Migrar a deployment cloud (Fly.io, Railway, Render)
- [ ] Configurar CI/CD (GitHub Actions)
- [ ] Agregar rate limiting y anti-abuse
- [ ] Implementar búsqueda full-text (PostgreSQL tsvector)
- [ ] Agregar analytics básicos (Plausible o similar)
- [ ] PWA con offline support
- [ ] Notificaciones push
- [ ] Social sharing (Open Graph tags)

---

## Licencia

Uso privado. No distribuir sin autorización.
