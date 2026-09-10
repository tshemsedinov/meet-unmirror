'use strict';

const { DEFAULTS, normalize, parseSettings } = globalThis.MeetUnmirror;

const STATUS_CLEAR_MS = 1800;
const STATUS = {
  emptyName: 'Enter a participant name.',
  saved: 'Saved. Meet will update automatically.',
};

const enabledCheckbox = document.getElementById('enabled');
const participantInput = document.getElementById('participantName');
const saveButton = document.getElementById('save');
const statusOutput = document.getElementById('status');

let statusTimer = null;
const abortController = new AbortController();

const setStatus = (message) => {
  clearTimeout(statusTimer);
  statusTimer = null;
  statusOutput.textContent = message;
};

const setStatusTemporarily = (message) => {
  setStatus(message);
  statusTimer = setTimeout(() => {
    statusOutput.textContent = '';
    statusTimer = null;
  }, STATUS_CLEAR_MS);
};

const formatError = (error) => `Error: ${error.message || error}`;

const loadSettings = async () => {
  try {
    const stored = await chrome.storage.sync.get(DEFAULTS);
    const settings = parseSettings(stored);
    enabledCheckbox.checked = settings.enabled;
    participantInput.value = settings.participantName;
  } catch (error) {
    setStatus(formatError(error));
  }
};

const saveSettings = async () => {
  const participantName = normalize(participantInput.value);
  if (!participantName) {
    setStatus(STATUS.emptyName);
    participantInput.focus();
    return;
  }
  try {
    await chrome.storage.sync.set({
      enabled: enabledCheckbox.checked,
      participantName,
    });
  } catch (error) {
    setStatus(formatError(error));
    return;
  }
  setStatusTemporarily(STATUS.saved);
};

const { signal } = abortController;
saveButton.addEventListener('click', () => saveSettings(), { signal });
participantInput.addEventListener(
  'keydown',
  (event) => {
    if (event.key !== 'Enter') return;
    saveSettings();
  },
  { signal },
);

loadSettings();
