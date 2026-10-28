const fs = require('fs');
try {
  const gracefulFs = require('graceful-fs');
  gracefulFs.gracefulify(fs);
} catch {}

module.exports = function (api) {
  api.cache(true);
  return { presets: ['babel-preset-expo'] };
};
