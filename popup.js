'use strict';

const DEFAULTS = {
  enabled: true,
  participantName: 'Timur Shemsedinov',
};

const enabledEl = document.getElementById('enabled');
const nameEl = document.getElementById('participantName');
const saveEl = document.getElementById('save');
const statusEl = document.getElementById('status');

const load = async () => {
  const settings = await chrome.storage.sync.get(DEFAULTS);
  enabledEl.checked = settings.enabled !== false;
  nameEl.value = settings.participantName || DEFAULTS.participantName;
};

const save = async () => {
  const participantName = nameEl.value.replace(/\s+/g, ' ').trim();

  if (!participantName) {
    statusEl.textContent = 'Enter a participant name.';
    nameEl.focus();
    return;
  }

  await chrome.storage.sync.set({
    enabled: enabledEl.checked,
    participantName,
  });

  statusEl.textContent = 'Saved. Meet will update automatically.';
  setTimeout(() => {
    statusEl.textContent = '';
  }, 1800);
};

saveEl.addEventListener('click', save);
nameEl.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') save();
});

load().catch((error) => {
  statusEl.textContent = `Error: ${error.message}`;
});
