'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const shared = require('../shared.js');
const {
  DEFAULTS,
  normalize,
  parseSettings,
  isScreenShareStream,
  shouldUnmirrorVideo,
} = shared;

test('normalize collapses whitespace and trims', () => {
  assert.equal(normalize('  Timur   Shemsedinov  '), 'Timur Shemsedinov');
});

test('normalize maps nullish to empty string', () => {
  assert.equal(normalize(null), '');
  assert.equal(normalize(undefined), '');
});

test('normalize stringifies non-string values', () => {
  assert.equal(normalize(42), '42');
});

test('parseSettings uses defaults for missing fields', () => {
  const settings = parseSettings({});
  assert.equal(settings.enabled, DEFAULTS.enabled);
  assert.equal(settings.participantName, DEFAULTS.participantName);
});

test('parseSettings keeps a stable settings shape', () => {
  const settings = parseSettings({
    enabled: false,
    participantName: '  Ada   Lovelace ',
  });
  assert.deepEqual(Object.keys(settings), ['enabled', 'participantName']);
  assert.equal(settings.enabled, false);
  assert.equal(settings.participantName, 'Ada Lovelace');
});

test('parseSettings treats empty participant name as default', () => {
  const settings = parseSettings({ enabled: true, participantName: '   ' });
  assert.equal(settings.participantName, DEFAULTS.participantName);
});

test('parseSettings treats missing enabled as true', () => {
  const settings = parseSettings({ participantName: 'Ada Lovelace' });
  assert.equal(settings.enabled, true);
});

test('parseSettings does not mutate the stored object', () => {
  const stored = { enabled: false, participantName: '  Ada  ' };
  parseSettings(stored);
  assert.deepEqual(stored, { enabled: false, participantName: '  Ada  ' });
});

test('parseSettings uses defaults for null stored value', () => {
  const settings = parseSettings(null);
  assert.deepEqual(settings, DEFAULTS);
});

test('isScreenShareStream detects getDisplayMedia surfaces', () => {
  assert.equal(isScreenShareStream('monitor'), true);
  assert.equal(isScreenShareStream('window'), true);
  assert.equal(isScreenShareStream('browser'), true);
  assert.equal(isScreenShareStream('application'), true);
});

test('isScreenShareStream ignores camera streams', () => {
  assert.equal(isScreenShareStream(undefined), false);
  assert.equal(isScreenShareStream(''), false);
  assert.equal(isScreenShareStream('user'), false);
});

test('shouldUnmirrorVideo skips screen shares only', () => {
  assert.equal(shouldUnmirrorVideo(true), false);
  assert.equal(shouldUnmirrorVideo(false), true);
});
