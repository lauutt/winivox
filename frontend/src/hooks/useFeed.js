import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiBase } from '../lib/api.js';

/**
 * useFeed - Hook para gestionar el feed de historias, tags y serendipia
 *
 * @returns {Object} - Estado y funciones del feed
 * @property {Array} feed - Lista de historias
 * @property {boolean} feedLoading - Estado de carga del feed
 * @property {string} feedError - Error al cargar feed
 * @property {Array} sortedFeed - Feed ordenado según sortMode
 * @property {string} sortMode - Modo de ordenamiento ("latest" | "top")
 * @property {Function} setSortMode - Cambiar modo de ordenamiento
 * @property {Function} loadFeed - Cargar feed con tags opcionales
 *
 * @property {Array} tagOptions - Tags disponibles
 * @property {boolean} tagLoading - Estado de carga de tags
 * @property {string} tagError - Error al cargar tags
 * @property {Array} selectedTags - Tags seleccionados para filtrar
 * @property {Function} setSelectedTags - Actualizar tags seleccionados
 * @property {Function} loadTags - Cargar tags disponibles
 *
 * @property {Array} lowSerendipia - Historias de baja serendipia
 * @property {boolean} lowSerendipiaLoading - Estado de carga
 * @property {string} lowSerendipiaError - Error al cargar
 * @property {Function} loadLowSerendipia - Cargar historias de baja serendipia
 *
 * @example
 * const { feed, feedLoading, sortedFeed, sortMode, setSortMode, selectedTags, setSelectedTags } = useFeed();
 */
export function useFeed() {
  // Feed state
  const [feed, setFeed] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState("");
  const [sortMode, setSortMode] = useState("latest");

  // Tags state
  const [tagOptions, setTagOptions] = useState([]);
  const [selectedTags, setSelectedTags] = useState(() => parseTagsFromUrl());
  const [tagLoading, setTagLoading] = useState(true);
  const [tagError, setTagError] = useState("");

  // Low serendipia state
  const [lowSerendipia, setLowSerendipia] = useState([]);
  const [lowSerendipiaLoading, setLowSerendipiaLoading] = useState(true);
  const [lowSerendipiaError, setLowSerendipiaError] = useState("");

  // Load feed with optional tag filtering
  const loadFeed = useCallback(async (tags = []) => {
    setFeedLoading(true);
    setFeedError("");
    try {
      const url = buildFeedUrl(tags);
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("feed failed");
      }
      const data = await res.json();
      setFeed(data || []);
    } catch {
      setFeed([]);
      setFeedError("No se pudieron cargar las historias");
    } finally {
      setFeedLoading(false);
    }
  }, []);

  // Load available tags
  const loadTags = useCallback(async () => {
    setTagLoading(true);
    setTagError("");
    try {
      const res = await fetch(`${apiBase}/feed/tags?limit=30`);
      if (!res.ok) {
        throw new Error("tags failed");
      }
      const data = await res.json();
      setTagOptions(data || []);
    } catch {
      setTagOptions([]);
      setTagError("No se pudieron cargar las etiquetas");
    } finally {
      setTagLoading(false);
    }
  }, []);

  // Load low serendipia stories
  const loadLowSerendipia = useCallback(async () => {
    setLowSerendipiaLoading(true);
    setLowSerendipiaError("");
    try {
      const res = await fetch(`${apiBase}/feed/low-serendipia?limit=6`);
      if (!res.ok) {
        throw new Error("low serendipia failed");
      }
      const data = await res.json();
      setLowSerendipia(data || []);
    } catch {
      setLowSerendipia([]);
      setLowSerendipiaError("No se pudo cargar esta seccion");
    } finally {
      setLowSerendipiaLoading(false);
    }
  }, []);

  // Sort feed based on sortMode
  const sortedFeed = useMemo(() => {
    if (sortMode === "top") {
      return [...feed].sort((a, b) => {
        if (b.vote_count !== a.vote_count) {
          return b.vote_count - a.vote_count;
        }
        return new Date(b.published_at || 0) - new Date(a.published_at || 0);
      });
    }
    return feed;
  }, [feed, sortMode]);

  // Update URL when tags change
  useEffect(() => {
    updateTagsInUrl(selectedTags);
  }, [selectedTags]);

  // Load feed when selected tags change
  useEffect(() => {
    loadFeed(selectedTags);
  }, [selectedTags, loadFeed]);

  return {
    // Feed
    feed,
    feedLoading,
    feedError,
    sortedFeed,
    sortMode,
    setSortMode,
    loadFeed,

    // Tags
    tagOptions,
    tagLoading,
    tagError,
    selectedTags,
    setSelectedTags,
    loadTags,

    // Low Serendipia
    lowSerendipia,
    lowSerendipiaLoading,
    lowSerendipiaError,
    loadLowSerendipia
  };
}

// Helper functions

function parseTagsFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const tagsParam = params.get("tags");
  if (!tagsParam) return [];
  return tagsParam.split(",").map(t => t.trim()).filter(Boolean);
}

function buildFeedUrl(tags) {
  let url = `${apiBase}/feed`;
  if (tags && tags.length > 0) {
    const tagsParam = tags.join(",");
    url += `?tags=${encodeURIComponent(tagsParam)}`;
  }
  return url;
}

function updateTagsInUrl(tags) {
  const params = new URLSearchParams(window.location.search);
  if (tags && tags.length > 0) {
    params.set("tags", tags.join(","));
  } else {
    params.delete("tags");
  }
  const newSearch = params.toString();
  const newUrl = newSearch ? `?${newSearch}` : window.location.pathname;
  window.history.replaceState({}, "", newUrl);
}
