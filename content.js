'use strict';

const DEFAULTS = {
  enabled: true,
  participantName: 'Timur Shemsedinov',
};

const MARKER = 'meetUnmirrorExtension';
let settings = { ...DEFAULTS };
let observer = null;
let scanTimer = null;

const normalize = (text) => (text || '').replace(/\s+/g, ' ').trim();

const markedVideos = () => {
  const attr = MARKER.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
  return document.querySelectorAll(`video[data-${attr}="true"]`);
};

const restoreAll = () => {
  markedVideos().forEach((video) => {
    video.style.removeProperty('scale');
    delete video.dataset[MARKER];
  });
};

const findExactNameLabels = (name) => {
  const wanted = normalize(name);
  if (!wanted) return [];

  return [...document.querySelectorAll('*')].filter((el) => {
    if (el.children.length !== 0) return false;
    return normalize(el.textContent) === wanted;
  });
};

const findNearestVideo = (label) => {
  let el = label;

  while (el && el !== document.body) {
    if (el.tagName === 'VIDEO') return el;

    const videos = el.querySelectorAll?.('video');
    if (videos?.length === 1) return videos[0];
    if (videos?.length > 1) return null;

    el = el.parentElement;
  }

  return null;
};

const apply = () => {
  if (!settings.enabled || !normalize(settings.participantName)) {
    restoreAll();
    return;
  }

  const labels = findExactNameLabels(settings.participantName);
  const matchedVideos = new Set();

  for (const label of labels) {
    const video = findNearestVideo(label);
    if (!video) continue;

    matchedVideos.add(video);

    if (video.dataset[MARKER] !== 'true') {
      video.style.setProperty('scale', '-1 1', 'important');
      video.dataset[MARKER] = 'true';
      console.info(
        `[Meet Self-View Unmirror] Unmirrored "${settings.participantName}".`,
      );
    }
  }

  document.querySelectorAll('video').forEach((video) => {
    if (video.dataset[MARKER] === 'true' && !matchedVideos.has(video)) {
      video.style.removeProperty('scale');
      delete video.dataset[MARKER];
    }
  });
};

const scheduleApply = (delay = 150) => {
  clearTimeout(scanTimer);
  scanTimer = setTimeout(apply, delay);
};

const loadSettings = async () => {
  try {
    const stored = await chrome.storage.sync.get(DEFAULTS);
    settings = {
      enabled: stored.enabled !== false,
      participantName: normalize(
        stored.participantName || DEFAULTS.participantName,
      ),
    };
  } catch (error) {
    console.warn('[Meet Self-View Unmirror] Could not load settings:', error);
    settings = { ...DEFAULTS };
  }

  scheduleApply(0);
};

const startObserver = () => {
  observer?.disconnect();

  observer = new MutationObserver(() => scheduleApply());

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
};

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'sync') return;

  if (changes.enabled) {
    settings.enabled = changes.enabled.newValue !== false;
  }

  if (changes.participantName) {
    settings.participantName = normalize(
      changes.participantName.newValue || DEFAULTS.participantName,
    );
  }

  restoreAll();
  scheduleApply(0);
});

window.addEventListener('pagehide', () => {
  observer?.disconnect();
  clearTimeout(scanTimer);
});

startObserver();
loadSettings();
