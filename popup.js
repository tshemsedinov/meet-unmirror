'use strict';

const DEFAULTS = {
  enabled: true,
  participantName: 'Timur Shemsedinov',
};

const enabledCheckbox = document.getElementById('enabled');
const participantInput = document.getElementById('participantName');
const saveButton = document.getElementById('save');
const statusOutput = document.getElementById('status');

const loadSettings = async () => {
  const settings = await chrome.storage.sync.get(DEFAULTS);
  enabledCheckbox.checked = settings.enabled !== false;
  participantInput.value = settings.participantName || DEFAULTS.participantName;
};

const saveSettings = async () => {
  const participantName = participantInput.value.replace(/\s+/g, ' ').trim();
  if (!participantName) {
    statusOutput.textContent = 'Enter a participant name.';
    participantInput.focus();
    return;
  }
  await chrome.storage.sync.set({
    enabled: enabledCheckbox.checked,
    participantName,
  });
  statusOutput.textContent = 'Saved. Meet will update automatically.';
  setTimeout(() => {
    statusOutput.textContent = '';
  }, 1800);
};

saveButton.addEventListener('click', saveSettings);
participantInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') saveSettings();
});

loadSettings().catch((error) => {
  statusOutput.textContent = `Error: ${error.message}`;
});
