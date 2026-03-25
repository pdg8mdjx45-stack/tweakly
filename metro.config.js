const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Very aggressive memory optimization - use single worker
config.maxWorkers = 1;

// Escape project root for use in regex
const root = __dirname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// BlockList - exclude large unnecessary project-level directories only
// (patterns are anchored to project root to avoid blocking identically-named
//  folders inside node_modules, e.g. semver/functions, react-native-web/dist)
config.resolver = {
  ...config.resolver,
  blockList: [
    new RegExp(`^${root}\\/android\\/.*`),
    new RegExp(`^${root}\\/ios\\/.*`),
    new RegExp(`^${root}\\/functions\\/.*`),
    new RegExp(`^${root}\\/dist\\/.*`),
    new RegExp(`^${root}\\/\\.expo\\/.*`),
  ],
};

// Disable watcher to reduce memory
config.watchFolders = [];
config.watchman = {
  deferStates: ['hg.update'],
};

module.exports = config;
