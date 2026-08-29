const express = require('express');
const path = require('path');

const api = express();

const buildDirectory = path.join(__dirname, 'dist');

// Serve the compiled React application before the legacy public assets.
api.use(express.static(buildDirectory));
api.use(express.static(path.join(__dirname, 'public')));

api.get('*', (_req, res) => {
  res.sendFile(path.join(buildDirectory, 'index.html'));
});

module.exports = api;