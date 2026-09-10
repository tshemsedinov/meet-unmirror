'use strict';

const {
  DEFAULTS,
  normalize,
  parseSettings,
  isScreenShareStream,
  shouldUnmirrorVideo,
} = globalThis.MeetUnmirror;

const MARKER = 'meetUnmirrorExtension';
const MARKER_ATTR = 'meet-unmirror-extension';
const UNMIRROR_SCALE = '-1 1';
const SCAN_DELAY_MS = 150;
const STYLE_RETRY_DELAYS_MS = [200, 800];
const MAX_TILE_VIDEOS = 4;
const LOG_PREFIX = '[Meet Self-View Unmirror]';
const SKIP_TAGS = ['SCRIPT', 'STYLE', 'NOSCRIPT'];
const MEDIA_EVENTS = ['play', 'playing', 'loadedmetadata', 'emptied'];

let settings = parseSettings(DEFAULTS);
let observer = null;
let scanTimer = null;
const retryTimers = new Set();
const abortController = new AbortController();

const markedSelector = `video[data-${MARKER_ATTR}="true"]`;

const markedVideos = () => document.querySelectorAll(markedSelector);

const restoreVideo = (video) => {
  video.style.removeProperty('scale');
  delete video.dataset[MARKER];
};

const unmirrorVideo = (video) => {
  video.style.setProperty('scale', UNMIRROR_SCALE, 'important');
  video.dataset[MARKER] = 'true';
};

const restoreAll = () => {
  for (const video of markedVideos()) restoreVideo(video);
};

const hasUnmirrorStyle = (video) =>
  video.style.getPropertyValue('scale') === UNMIRROR_SCALE;

const getVideoTrack = (video) => {
  const stream = video.srcObject;
  if (!stream || typeof stream.getVideoTracks !== 'function') return null;
  const [track] = stream.getVideoTracks();
  return track || null;
};

const isScreenShareVideo = (video) => {
  const track = getVideoTrack(video);
  if (!track) return false;
  const trackSettings =
    typeof track.getSettings === 'function' ? track.getSettings() : {};
  return isScreenShareStream(trackSettings.displaySurface);
};

const canUnmirrorVideo = (video) =>
  shouldUnmirrorVideo(isScreenShareVideo(video));

const cameraVideosIn = (root) =>
  [...root.querySelectorAll('video')].filter(
    (video) => !isScreenShareVideo(video),
  );

const acceptNameLabel = (element, targetName) => {
  if (SKIP_TAGS.includes(element.tagName)) return NodeFilter.FILTER_REJECT;
  if (element.children.length > 0) return NodeFilter.FILTER_SKIP;
  const label = normalize(element.textContent);
  if (label === targetName) return NodeFilter.FILTER_ACCEPT;
  return NodeFilter.FILTER_SKIP;
};

const findNameLabels = (participantName) => {
  const targetName = normalize(participantName);
  if (!targetName) return [];
  const root = document.body;
  if (!root) return [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
    acceptNode: (element) => acceptNameLabel(element, targetName),
  });
  const labels = [];
  let node = walker.nextNode();
  while (node) {
    labels.push(node);
    node = walker.nextNode();
  }
  return labels;
};

const scoreVideo = (video) => {
  const visible = video.getClientRects().length > 0;
  const playing = !video.paused && video.readyState >= 2;
  const hasPixels = video.videoWidth > 0;
  const area = video.clientWidth * video.clientHeight;
  const unmirrorable = canUnmirrorVideo(video);
  return (
    (unmirrorable ? 1e9 : 0) +
    (visible ? 8 : 0) +
    (playing ? 4 : 0) +
    (hasPixels ? 2 : 0) +
    area
  );
};

const pickBestVideo = (videos) => {
  let best = null;
  let bestScore = -1;
  for (const video of videos) {
    const score = scoreVideo(video);
    if (score <= bestScore) continue;
    best = video;
    bestScore = score;
  }
  return best;
};

const findNearestVideo = (nameElement) => {
  let element = nameElement;
  while (element && element !== document.body) {
    if (element.tagName === 'VIDEO') {
      return isScreenShareVideo(element) ? null : element;
    }
    const videos = cameraVideosIn(element);
    if (videos.length === 1) return videos[0];
    if (videos.length > 1) {
      if (videos.length > MAX_TILE_VIDEOS) return null;
      return pickBestVideo(videos);
    }
    element = element.parentElement;
  }
  return null;
};

const collectMatchedVideos = (participantName) => {
  const matchedVideos = new Set();
  const nameElements = findNameLabels(participantName);
  for (const nameElement of nameElements) {
    const video = findNearestVideo(nameElement);
    if (video) matchedVideos.add(video);
  }
  return matchedVideos;
};

const applyUnmirror = (sessionSettings) => {
  const { enabled, participantName } = sessionSettings;
  if (!enabled || !participantName) {
    restoreAll();
    return;
  }
  const matchedVideos = collectMatchedVideos(participantName);
  for (const video of matchedVideos) {
    if (!canUnmirrorVideo(video)) continue;
    const alreadyMarked = video.dataset[MARKER] === 'true';
    if (alreadyMarked && hasUnmirrorStyle(video)) continue;
    unmirrorVideo(video);
    if (!alreadyMarked) {
      console.info(`${LOG_PREFIX} Unmirrored "${participantName}".`);
    }
  }
  for (const video of markedVideos()) {
    if (matchedVideos.has(video) && canUnmirrorVideo(video)) continue;
    restoreVideo(video);
  }
};

const scheduleApply = (delayMs = SCAN_DELAY_MS) => {
  clearTimeout(scanTimer);
  scanTimer = setTimeout(() => applyUnmirror(settings), delayMs);
};

const clearRetryTimers = () => {
  for (const timer of retryTimers) clearTimeout(timer);
  retryTimers.clear();
};

const scheduleDelayedApply = (delayMs) => {
  const timer = setTimeout(() => {
    retryTimers.delete(timer);
    applyUnmirror(settings);
  }, delayMs);
  retryTimers.add(timer);
};

const scheduleApplyBurst = () => {
  scheduleApply(0);
  clearRetryTimers();
  for (const delayMs of STYLE_RETRY_DELAYS_MS) {
    scheduleDelayedApply(delayMs);
  }
};

const loadSettings = async () => {
  try {
    const stored = await chrome.storage.sync.get(DEFAULTS);
    settings = parseSettings(stored);
  } catch (error) {
    console.warn(`${LOG_PREFIX} Could not load settings:`, error);
    settings = parseSettings(DEFAULTS);
  }
  scheduleApply(0);
};

const startObserver = () => {
  observer?.disconnect();
  observer = new MutationObserver(() => scheduleApply());
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class', 'src'],
  });
};

const onStorageChanged = (changes, areaName) => {
  if (areaName !== 'sync') return;
  const hasEnabled = Object.hasOwn(changes, 'enabled');
  const hasName = Object.hasOwn(changes, 'participantName');
  if (!hasEnabled && !hasName) return;
  const enabled = hasEnabled ? changes.enabled.newValue : settings.enabled;
  const participantName = hasName
    ? changes.participantName.newValue
    : settings.participantName;
  settings = parseSettings({ enabled, participantName });
  restoreAll();
  scheduleApply(0);
};

const onVideoEvent = (event) => {
  if (event.target?.tagName !== 'VIDEO') return;
  const video = event.target;
  if (video.dataset[MARKER] === 'true') {
    if (canUnmirrorVideo(video)) unmirrorVideo(video);
    else restoreVideo(video);
  }
  scheduleApplyBurst();
};

const stop = () => {
  abortController.abort();
  observer?.disconnect();
  observer = null;
  clearTimeout(scanTimer);
  scanTimer = null;
  clearRetryTimers();
  chrome.storage.onChanged.removeListener(onStorageChanged);
};

const { signal } = abortController;
window.addEventListener('pagehide', () => stop(), { signal });
for (const eventName of MEDIA_EVENTS) {
  document.addEventListener(eventName, onVideoEvent, {
    capture: true,
    signal,
  });
}
chrome.storage.onChanged.addListener(onStorageChanged);

startObserver();
loadSettings();
