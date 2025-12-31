import { useEffect, useMemo, useRef, useState } from "react";
import AuthPanel from "./components/AuthPanel.jsx";
import Layout from "./components/Layout.jsx";
import { apiBase, authHeaders, fetchJson } from "./lib/api.js";

function FeedPage() {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [feed, setFeed] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState("");
  const [currentTrack, setCurrentTrack] = useState(null);
  const [voteError, setVoteError] = useState("");
  const [tagOptions, setTagOptions] = useState([]);
  const [selectedTags, setSelectedTags] = useState(() => parseTagsFromUrl());
  const [tagLoading, setTagLoading] = useState(true);
  const [tagError, setTagError] = useState("");
  const [autoPlay, setAutoPlay] = useState(false);
  const [playerNotice, setPlayerNotice] = useState("");
  const [playerError, setPlayerError] = useState("");
  const [openTranscripts, setOpenTranscripts] = useState({});
  const audioRef = useRef(null);

  const headers = useMemo(() => authHeaders(token), [token]);

  useEffect(() => {
    loadTags();
  }, []);

  useEffect(() => {
    loadFeed(selectedTags);
    updateTagsInUrl(selectedTags);
  }, [selectedTags]);

  useEffect(() => {
    if (!currentTrack || !autoPlay || !audioRef.current) return;
    audioRef.current
      .play()
      .catch(() => {
        setAutoPlay(false);
        setPlayerNotice("Autoplay blocked. Tap play to continue.");
      });
  }, [currentTrack, autoPlay]);

  const loadTags = async () => {
    setTagLoading(true);
    setTagError("");
    try {
      const res = await fetch(`${apiBase}/feed/tags`);
      if (!res.ok) {
        throw new Error("tags failed");
      }
      const data = await res.json();
      setTagOptions(data || []);
    } catch {
      setTagOptions([]);
      setTagError("Tags unavailable");
    } finally {
      setTagLoading(false);
    }
  };

  const loadFeed = async (tags = []) => {
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
      setFeedError("Feed unavailable");
    } finally {
      setFeedLoading(false);
    }
  };

  const handleRegister = async () => {
    setAuthError("");
    const res = await fetch(`${apiBase}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      setAuthError("Registration failed");
      return;
    }
    const data = await res.json();
    localStorage.setItem("token", data.access_token);
    setToken(data.access_token);
  };

  const handleLogin = async () => {
    setAuthError("");
    const form = new URLSearchParams();
    form.append("username", email);
    form.append("password", password);
    const res = await fetch(`${apiBase}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form
    });
    if (!res.ok) {
      setAuthError("Login failed");
      return;
    }
    const data = await res.json();
    localStorage.setItem("token", data.access_token);
    setToken(data.access_token);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
  };

  const handleVote = async (audioId) => {
    if (!token) {
      setVoteError("Login to vote");
      return;
    }
    setVoteError("");
    try {
      await fetchJson(`${apiBase}/votes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ audio_id: audioId })
      });
      await loadFeed(selectedTags);
    } catch {
      setVoteError("Vote failed");
    }
  };

  const handleSelectTrack = (item) => {
    setPlayerError("");
    setPlayerNotice("");
    setCurrentTrack(item);
    setAutoPlay(true);
  };

  const handleTagToggle = (tag) => {
    setSelectedTags((prev) => {
      if (prev.includes(tag)) {
        return prev.filter((item) => item !== tag);
      }
      return [...prev, tag];
    });
  };

  const clearTags = () => {
    setSelectedTags([]);
  };

  const handleTagQuickSelect = (tag) => {
    setSelectedTags([tag]);
  };

  const handleTrackEnded = () => {
    const nextTrack = pickNextTrack(feed, currentTrack);
    if (nextTrack) {
      setCurrentTrack(nextTrack);
    }
  };

  const toggleTranscript = (submissionId) => {
    setOpenTranscripts((prev) => ({
      ...prev,
      [submissionId]: !prev[submissionId]
    }));
  };

  const rightRail = (
    <>
      <div className="rail-card">
        <h4>Now playing</h4>
        <p>
          {currentTrack?.summary ||
            currentTrack?.transcript_preview ||
            "Select a story"}
        </p>
        {currentTrack && (
          <div className="now-playing-meta">
            {currentTrack.tags && currentTrack.tags.length > 0 && (
              <span>Related to: {currentTrack.tags.slice(0, 2).join(" · ")}</span>
            )}
          </div>
        )}
      </div>
      <div className="rail-card">
        <h4>Signal</h4>
        <p>Tap a tag to shape the stream. Autoplay chains related stories.</p>
      </div>
    </>
  );

  const player = (
    <div className="player-bar">
      <div>
        <strong>
          {currentTrack?.summary || currentTrack?.transcript_preview || "Idle"}
        </strong>
        <span>{currentTrack ? "Streaming anonymized copy" : "Pick a track"}</span>
        {playerError && <span className="player-error">{playerError}</span>}
        {!playerError && playerNotice && (
          <span className="player-note">{playerNotice}</span>
        )}
      </div>
      {currentTrack && (
        <audio
          controls
          ref={audioRef}
          src={currentTrack.public_url}
          onEnded={handleTrackEnded}
          onPlay={() => {
            setAutoPlay(true);
            setPlayerNotice("");
            setPlayerError("");
          }}
          onError={() => {
            setAutoPlay(false);
            setPlayerError("Audio unavailable. Try another story.");
          }}
        />
      )}
    </div>
  );

  return (
    <Layout
      current="feed"
      token={token}
      onLogout={handleLogout}
      heroTitle="Stories, stripped of identity"
      heroCopy="A warm, radio-like stream. Upload your voice, we anonymize and publish the echo."
      heroBadgeLabel="Pipeline"
      heroBadgeValue="Async + visible"
      rightRail={rightRail}
      player={player}
    >
      {!token && (
        <AuthPanel
          email={email}
          password={password}
          onEmailChange={(event) => setEmail(event.target.value)}
          onPasswordChange={(event) => setPassword(event.target.value)}
          onRegister={handleRegister}
          onLogin={handleLogin}
          error={authError}
        />
      )}
      {voteError && <p className="error">{voteError}</p>}

      <section className="feed">
        <div className="tag-filter">
          <div className="tag-filter-header">
            <h3>Listen by tag</h3>
            <div className="tag-filter-actions">
              <button type="button" className="ghost" onClick={loadTags}>
                Refresh tags
              </button>
              <button type="button" onClick={clearTags} disabled={!selectedTags.length}>
                Clear
              </button>
            </div>
          </div>
          {tagLoading && <span className="muted">Loading tags...</span>}
          {tagError && <span className="error">{tagError}</span>}
          {!tagLoading && !tagError && tagOptions.length === 0 && (
            <span className="muted">No tags yet.</span>
          )}
          <div className="tag-list">
            {tagOptions.map((tag) => (
              <button
                type="button"
                key={tag}
                className={`tag ${selectedTags.includes(tag) ? "is-active" : ""}`}
                onClick={() => handleTagToggle(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
          {selectedTags.length > 0 && (
            <div className="tag-active">
              Filtering: {selectedTags.join(", ")}
            </div>
          )}
        </div>

        <div className="feed-header">
          <h3>Latest anonymous drops</h3>
          <button
            type="button"
            onClick={() => loadFeed(selectedTags)}
          >
            Refresh
          </button>
        </div>
        {feedLoading && <p className="muted">Loading feed...</p>}
        {feedError && <p className="error">{feedError}</p>}
        <div className="feed-grid">
          {feed.map((item) => (
            <article key={item.id} className="feed-card">
              <div className="cover" />
              <div>
                <h4>
                  {truncateText(item.summary || item.transcript_preview || "Untitled", 64)}
                </h4>
                <p className="summary">
                  {item.summary ||
                    truncateText(item.transcript_preview || "", 160) ||
                    "Awaiting metadata"}
                </p>
                <div className="tag-row">
                  {(item.tags || []).map((tag) => (
                    <button
                      type="button"
                      key={tag}
                      className={`tag ${selectedTags.includes(tag) ? "is-active" : ""}`}
                      onClick={() => handleTagQuickSelect(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                {item.transcript_preview && (
                  <div className="transcript">
                    <button
                      type="button"
                      className="transcript-toggle"
                      onClick={() => toggleTranscript(item.id)}
                      aria-expanded={Boolean(openTranscripts[item.id])}
                      aria-controls={`transcript-${item.id}`}
                    >
                      Transcript
                      <span
                        className={`caret ${
                          openTranscripts[item.id] ? "open" : ""
                        }`}
                      >
                        ▾
                      </span>
                    </button>
                    <div
                      id={`transcript-${item.id}`}
                      className={`transcript-panel ${
                        openTranscripts[item.id] ? "open" : ""
                      }`}
                    >
                      <p>{item.transcript_preview}</p>
                    </div>
                  </div>
                )}
                <div className="feed-actions">
                  <button
                    type="button"
                    className="play"
                    onClick={() => handleSelectTrack(item)}
                  >
                    Play
                  </button>
                  <button
                    type="button"
                    className="vote"
                    onClick={() => handleVote(item.id)}
                  >
                    +1 {item.vote_count}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
        {!feedLoading && feed.length === 0 && !feedError && (
          <p className="muted">
            {selectedTags.length
              ? "No stories match those tags yet."
              : "No stories yet."}
          </p>
        )}
        <div className="feed-cta">
          <a href="/upload/">Upload a story</a>
        </div>
      </section>
    </Layout>
  );
}

function pickNextTrack(feed, currentTrack) {
  if (!feed.length) return null;
  if (!currentTrack) return feed[0];

  const currentIndex = feed.findIndex((item) => item.id === currentTrack.id);
  if (currentIndex === -1) return feed[0];

  const currentTags = new Set(
    (currentTrack.tags || []).map((tag) => String(tag).toLowerCase())
  );

  if (currentTags.size > 0) {
    for (let offset = 1; offset < feed.length; offset += 1) {
      const candidate = feed[(currentIndex + offset) % feed.length];
      const candidateTags = (candidate.tags || []).map((tag) =>
        String(tag).toLowerCase()
      );
      if (candidateTags.some((tag) => currentTags.has(tag))) {
        return candidate;
      }
    }
  }

  if (feed.length > 1) {
    return feed[(currentIndex + 1) % feed.length];
  }
  return null;
}

function parseTagsFromUrl() {
  if (typeof window === "undefined") return [];
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("tags") || params.get("tag") || "";
  return raw
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function updateTagsInUrl(tags) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (tags.length) {
    url.searchParams.set("tags", tags.join(","));
  } else {
    url.searchParams.delete("tags");
  }
  url.searchParams.delete("tag");
  window.history.replaceState({}, "", url.toString());
}

function buildFeedUrl(tags) {
  if (!tags.length) return `${apiBase}/feed`;
  const params = new URLSearchParams();
  params.set("tags", tags.join(","));
  return `${apiBase}/feed?${params.toString()}`;
}

function truncateText(text, max) {
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}...`;
}

export default FeedPage;
