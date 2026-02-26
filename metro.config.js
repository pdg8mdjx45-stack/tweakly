const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Very aggressive memory optimization - use single worker
config.maxWorkers = 1;

// BlockList - exclude large unnecessary directories
config.resolver = {
  ...config.resolver,
  blockList: [
    /node_modules\/.*\/node_modules\/.*/,
    /android\/.*/,
    /ios\/.*/,
    /functions\/.*/,
    /dist\/.*/,
    /\.expo\/.*/,
  ],
};

// Disable watcher to reduce memory
config.watchFolders = [];
config.watchman = {
  deferStates: ['hg.update'],
};

module.exports = config;
