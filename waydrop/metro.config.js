// Gracefully patch fs to prevent EMFILE (too many open files) on Windows
const fs = require('fs');
try {
  const gracefulFs = require('graceful-fs');
  gracefulFs.gracefulify(fs);
} catch {}

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Throttle worker count on Windows to prevent file descriptor exhaustion
config.maxWorkers = 2;

// Block unnecessary non-app folders from being crawled/watched by Metro
config.resolver.blockList = [
  /backend\/.*/,
  /\.git\/.*/,
  /\.system_generated\/.*/,
  /node_modules\/.*\/android\/build\/.*/,
  /node_modules\/.*\/ios\/build\/.*/,
];

module.exports = config;
