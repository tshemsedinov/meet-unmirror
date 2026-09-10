'use strict';

(() => {
  const DEFAULTS = {
    enabled: true,
    participantName: 'Timur Shemsedinov',
  };

  const normalize = (value) => {
    if (value === null || value === undefined) return '';
    const text = typeof value === 'string' ? value : `${value}`;
    return text.replace(/\s+/g, ' ').trim();
  };

  const parseSettings = (stored) => {
    const source = stored ?? DEFAULTS;
    const participantName =
      normalize(source.participantName) || DEFAULTS.participantName;
    return {
      enabled: source.enabled !== false,
      participantName,
    };
  };

  const SCREEN_DISPLAY_SURFACES = [
    'application',
    'browser',
    'monitor',
    'window',
  ];

  const isScreenShareStream = (displaySurface) =>
    SCREEN_DISPLAY_SURFACES.includes(displaySurface);

  const shouldUnmirrorVideo = (isScreenShare) => !isScreenShare;

  const MeetUnmirror = {
    DEFAULTS,
    normalize,
    parseSettings,
    isScreenShareStream,
    shouldUnmirrorVideo,
  };
  globalThis.MeetUnmirror = MeetUnmirror;

  if (typeof module !== 'undefined') {
    module.exports = MeetUnmirror;
  }
})();
