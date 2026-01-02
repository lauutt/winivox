import { memo } from 'react';

/**
 * Player - Componente del reproductor de audio fijo en la parte inferior
 * Memoizado para evitar re-renders cuando las props no cambian
 *
 * @param {Object} props
 * @param {Object|null} props.currentTrack - Track actualmente reproduciéndose
 * @param {Object} props.audioRef - Ref al elemento <audio>
 * @param {Function} props.onTrackEnded - Callback cuando termina el track
 * @param {Function} props.onSkip - Callback para saltar al siguiente
 * @param {Function} props.onAutoPlayChange - Callback al cambiar autoPlay
 * @param {Function} props.onNoticeChange - Callback al cambiar notice
 * @param {Function} props.onErrorChange - Callback al cambiar error
 * @param {string} props.playerNotice - Mensaje informativo
 * @param {string} props.playerError - Mensaje de error
 * @param {Object|null} props.nextTrack - Siguiente track en la cola
 * @param {number} props.sleepTimer - Temporizador de sueño (minutos)
 * @param {Function} props.onSleepTimerChange - Callback al cambiar temporizador
 * @param {number} props.playbackRate - Velocidad de reproducción (0.5x - 2x)
 * @param {Function} props.onPlaybackRateChange - Callback al cambiar velocidad
 * @param {Function} props.getTitleFn - Función para obtener título del track
 * @param {Function} props.truncateFn - Función para truncar texto
 */
const Player = memo(function Player({
  currentTrack,
  audioRef,
  onTrackEnded,
  onSkip,
  onAutoPlayChange,
  onNoticeChange,
  onErrorChange,
  playerNotice,
  playerError,
  nextTrack,
  sleepTimer,
  onSleepTimerChange,
  playbackRate = 1,
  onPlaybackRateChange,
  getTitleFn,
  truncateFn
}) {
  const getTitle = getTitleFn || ((item) => item?.title || "Sin titulo");
  const truncate = truncateFn || ((text, max) => text?.slice(0, max) || "");

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-sand/80 bg-white pointer-events-none">
      <div className="mx-auto flex w-full flex-col gap-4 px-4 py-4 sm:px-6 lg:w-[80%] lg:flex-row lg:items-center lg:justify-between pointer-events-auto">
        {/* Track info */}
        <div className="flex flex-col gap-1">
          <strong className="text-sm font-semibold">
            {currentTrack ? getTitle(currentTrack) : "En pausa"}
          </strong>
          <span className="text-xs text-muted">
            {currentTrack ? "Al aire · comunidad" : "Elegi un audio"}
          </span>

          {/* Sleep timer status */}
          {sleepTimer > 0 && (
            <span className="text-xs text-muted">
              Temporizador: {sleepTimer}m
            </span>
          )}

          {/* Next track */}
          {currentTrack && nextTrack && (
            <span className="text-xs text-muted">
              Sigue: {truncate(getTitle(nextTrack), 48)}
            </span>
          )}

          {/* Error message */}
          {playerError && (
            <span className="text-xs text-[#f3b0a3]" role="alert">
              {playerError}
            </span>
          )}

          {/* Notice message */}
          {!playerError && playerNotice && (
            <span className="text-xs text-muted" role="status">
              {playerNotice}
            </span>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Audio element */}
          {currentTrack && (
            <audio
              className="w-full sm:w-64"
              controls
              ref={audioRef}
              src={currentTrack.public_url}
              onEnded={onTrackEnded}
              onPlay={() => {
                onAutoPlayChange(true);
                onNoticeChange("");
                onErrorChange("");
              }}
              onError={() => {
                onAutoPlayChange(false);
                onErrorChange("Audio no disponible. Proba otro.");
              }}
            />
          )}

          {/* Skip button */}
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full border border-sand/80 px-3 py-1 text-xs font-semibold text-ink transition hover:bg-sand/60 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onSkip}
            disabled={!nextTrack}
            aria-label={nextTrack ? `Saltar a ${getTitle(nextTrack)}` : "Sin siguiente track"}
          >
            Saltar
          </button>

          {/* Playback rate selector */}
          <label className="flex items-center gap-2 text-xs text-muted">
            <span>Velocidad</span>
            <select
              className="w-auto rounded-full border border-sand/70 bg-white px-3 py-1 text-xs text-ink"
              value={playbackRate}
              onChange={(event) => onPlaybackRateChange(Number(event.target.value))}
              disabled={!currentTrack}
              aria-label="Velocidad de reproducción"
            >
              <option value={0.5}>0.5x</option>
              <option value={0.75}>0.75x</option>
              <option value={1}>1x</option>
              <option value={1.25}>1.25x</option>
              <option value={1.5}>1.5x</option>
              <option value={1.75}>1.75x</option>
              <option value={2}>2x</option>
            </select>
          </label>

          {/* Sleep timer selector */}
          <label className="flex items-center gap-2 text-xs text-muted">
            <span>Temporizador</span>
            <select
              className="w-auto rounded-full border border-sand/70 bg-white px-3 py-1 text-xs text-ink"
              value={sleepTimer}
              onChange={(event) => onSleepTimerChange(Number(event.target.value))}
              disabled={!currentTrack}
              aria-label="Temporizador de sueño"
            >
              <option value={0}>Apagado</option>
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={45}>45 min</option>
            </select>
          </label>
        </div>
      </div>
    </div>
  );
});

export default Player;
