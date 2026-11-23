// TEST-ONLY: `node -r ./tests/preload-sqlite-shim.js server.js` runs the server on
// Node's built-in SQLite when the platform-specific sqlite3 binary is unavailable.
require.cache[require.resolve('sqlite3')] = { id: 'sqlite3', filename: 'sqlite3', loaded: true, exports: require('./sqlite3-shim') };
