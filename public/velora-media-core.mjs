/** Seek a native video with scroll progress. Keep the poster visible until a decoded frame exists. */
export function createScrubVideo(video, {fallbackSource = '', onFrame = () => {}, onFallback = () => {}} = {}) {
  let progress = 0, active = false, disposed = false, frameReady = false, usedFallback = false;
  let raf = null;
  const listeners = [];
  const listen = (name, callback) => {
    video.addEventListener(name, callback);
    listeners.push([name, callback]);
  };
  function reveal() {
    if (!disposed && !frameReady && video.readyState >= 2) {
      frameReady = true;
      onFrame();
    }
  }
  function flush() {
    raf = null;
    if (disposed || !active || video.seeking || !Number.isFinite(video.duration) || video.duration <= 0) return;
    const target = progress * Math.max(0, video.duration - 0.08);
    if (Math.abs(video.currentTime - target) > 0.025) {
      try { video.currentTime = target; } catch { /* Metadata can change while a fallback source loads. */ }
    }
  }
  function schedule() {
    if (raf === null && !disposed) raf = requestAnimationFrame(flush);
  }
  function failover() {
    if (disposed) return;
    frameReady = false;
    onFallback();
    if (!usedFallback && fallbackSource) {
      usedFallback = true;
      video.src = fallbackSource;
      video.load();
    }
  }
  listen('loadedmetadata', schedule);
  listen('loadeddata', () => { reveal(); schedule(); });
  listen('seeked', () => { reveal(); schedule(); });
  listen('error', failover);
  return {
    activate() {
      if (disposed || active) return;
      active = true;
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';
      video.load();
      schedule();
    },
    setProgress(value) {
      if (!Number.isFinite(value)) return;
      progress = Math.max(0, Math.min(1, value));
      schedule();
    },
    dispose() {
      disposed = true;
      if (raf !== null) cancelAnimationFrame(raf);
      for (const [name, callback] of listeners) video.removeEventListener(name, callback);
      video.pause();
    }
  };
}
