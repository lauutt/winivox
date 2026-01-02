import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * usePlayer - Hook para gestionar el reproductor de audio
 *
 * @param {Array} feed - Lista de audios disponibles para reproducción
 * @returns {Object} - Estado y funciones del player
 * @property {Object|null} currentTrack - Track actual reproduciéndose
 * @property {boolean} autoPlay - Si debe reproducirse automáticamente
 * @property {string} playerNotice - Mensaje informativo del player
 * @property {string} playerError - Mensaje de error del player
 * @property {number} sleepTimer - Minutos para temporizador de sueño (0 = desactivado)
 * @property {number} playbackRate - Velocidad de reproducción (0.5x - 2x)
 * @property {Object|null} nextTrack - Siguiente track en la cola
 * @property {Object} audioRef - Ref al elemento <audio>
 * @property {Function} selectTrack - Seleccionar y reproducir un track
 * @property {Function} skipToNext - Saltar al siguiente track
 * @property {Function} handleTrackEnded - Callback cuando termina un track
 * @property {Function} setSleepTimer - Configurar temporizador de sueño
 * @property {Function} setPlaybackRate - Configurar velocidad de reproducción
 * @property {Function} setAutoPlay - Cambiar estado de autoPlay
 * @property {Function} setPlayerNotice - Establecer mensaje informativo
 * @property {Function} setPlayerError - Establecer mensaje de error
 *
 * @example
 * const { currentTrack, audioRef, selectTrack, skipToNext, handleTrackEnded, sleepTimer, setSleepTimer, playbackRate, setPlaybackRate } = usePlayer(feed);
 *
 * // Reproducir un track
 * <button onClick={() => selectTrack(item)}>Escuchar</button>
 *
 * // Elemento audio
 * <audio ref={audioRef} onEnded={handleTrackEnded} />
 */
export function usePlayer(feed = []) {
  // Player state
  const [currentTrack, setCurrentTrack] = useState(null);
  const [autoPlay, setAutoPlay] = useState(false);
  const [playerNotice, setPlayerNotice] = useState("");
  const [playerError, setPlayerError] = useState("");
  const [sleepTimer, setSleepTimer] = useState(0); // minutes
  const [playbackRate, setPlaybackRate] = useState(1); // 0.5x - 2x

  // Refs
  const audioRef = useRef(null);
  const sleepTimerRef = useRef(null);

  // Find next track based on shared tags
  const nextTrack = useMemo(
    () => pickNextTrack(feed, currentTrack),
    [feed, currentTrack]
  );

  // Select and play a track
  const selectTrack = useCallback((track) => {
    setPlayerError("");
    setPlayerNotice("");
    setCurrentTrack(track);
    setAutoPlay(true);
  }, []);

  // Skip to next track
  const skipToNext = useCallback(() => {
    if (!nextTrack) return;
    setCurrentTrack(nextTrack);
    setAutoPlay(true);
  }, [nextTrack]);

  // Handle when track ends
  const handleTrackEnded = useCallback(() => {
    const next = pickNextTrack(feed, currentTrack);
    if (next) {
      setCurrentTrack(next);
    }
  }, [feed, currentTrack]);

  // Auto-play effect
  useEffect(() => {
    if (!currentTrack || !autoPlay || !audioRef.current) return;

    audioRef.current
      .play()
      .catch(() => {
        setAutoPlay(false);
        setPlayerNotice("La reproduccion automatica fue bloqueada. Toca reproducir.");
      });
  }, [currentTrack, autoPlay]);

  // Sync playback rate with audio element
  useEffect(() => {
    if (audioRef.current && playbackRate) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Sleep timer effect
  useEffect(() => {
    // Clear existing timer
    if (sleepTimerRef.current) {
      clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }

    if (!sleepTimer) return;

    // Set new timer
    sleepTimerRef.current = setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setAutoPlay(false);
      setPlayerNotice("Temporizador finalizado.");
      setSleepTimer(0);
    }, sleepTimer * 60 * 1000);

    // Cleanup
    return () => {
      if (sleepTimerRef.current) {
        clearTimeout(sleepTimerRef.current);
        sleepTimerRef.current = null;
      }
    };
  }, [sleepTimer]);

  return {
    // State
    currentTrack,
    autoPlay,
    playerNotice,
    playerError,
    sleepTimer,
    playbackRate,
    nextTrack,

    // Refs
    audioRef,

    // Actions
    selectTrack,
    skipToNext,
    handleTrackEnded,
    setSleepTimer,
    setPlaybackRate,
    setAutoPlay,
    setPlayerNotice,
    setPlayerError
  };
}

// Helper function: find next track based on shared tags
function pickNextTrack(feed, currentTrack) {
  if (!currentTrack || !feed.length) return null;

  const currentIdx = feed.findIndex(item => item.id === currentTrack.id);
  if (currentIdx === -1) return null;

  // Try to find next track with shared tags
  const currentTags = currentTrack.tags || [];
  if (currentTags.length > 0) {
    for (let i = 1; i < feed.length; i++) {
      const candidateIdx = (currentIdx + i) % feed.length;
      const candidate = feed[candidateIdx];
      const candidateTags = candidate.tags || [];

      // Check if they share at least one tag
      if (candidateTags.some(tag => currentTags.includes(tag))) {
        return candidate;
      }
    }
  }

  // Fallback: just pick next in feed
  if (feed.length > 1) {
    return feed[(currentIdx + 1) % feed.length];
  }

  return null;
}
