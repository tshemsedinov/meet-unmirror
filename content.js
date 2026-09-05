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
  const dataName = MARKER.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
  return document.querySelectorAll(`video[data-${dataName}="true"]`);
};

const restoreAll = () => {
  markedVideos().forEach((video) => {
    video.style.removeProperty('scale');
    delete video.dataset[MARKER];
  });
};

const findNameLabels = (participantName) => {
  const targetName = normalize(participantName);
  if (!targetName) return [];
  return [...document.querySelectorAll('*')].filter((element) => {
    if (element.children.length !== 0) return false;
    return normalize(element.textContent) === targetName;
  });
};

const findNearestVideo = (nameElement) => {
  let element = nameElement;
  while (element && element !== document.body) {
    if (element.tagName === 'VIDEO') return element;
    const videos = element.querySelectorAll?.('video');
    if (videos?.length === 1) return videos[0];
    if (videos?.length > 1) return null;
    element = element.parentElement;
  }
  return null;
};

const apply = () => {
  if (!settings.enabled || !normalize(settings.participantName)) {
    restoreAll();
    return;
  }
  const nameElements = findNameLabels(settings.participantName);
  const matchedVideos = new Set();
  for (const nameElement of nameElements) {
    const video = findNearestVideo(nameElement);
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
    const storedSettings = await chrome.storage.sync.get(DEFAULTS);
    settings = {
      enabled: storedSettings.enabled !== false,
      participantName: normalize(
        storedSettings.participantName || DEFAULTS.participantName,
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
