'use strict';

require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const { authApiKey } = require('./middleware/auth');
const produitsRouter = require('./routes/produits');
const souscriptionsRouter = require('./routes/souscriptions');
const contratsRouter = require('./routes/contrats');

const app = express();
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  const debut = Date.now();
  console.log(`[${new Date().toISOString()}] --> ${req.method} ${req.originalUrl} UA="${req.headers['user-agent'] || ''}" x-api-key=${req.headers['x-api-key'] ? 'present' : 'MISSING'}`);
  res.on('finish', () => {
    console.log(`[${new Date().toISOString()}] <-- ${req.method} ${req.originalUrl} status=${res.statusCode} (${Date.now() - debut}ms)`);
  });
  next();
});

app.get('/health', (req, res) => {
  res.json({ statut: 'OK', service: 'mock-assurance-vie-api' });
});

app.get('/openapi.yaml', (req, res) => {
  res.type('text/yaml').sendFile(path.join(__dirname, '..', 'openapi.yaml'));
});

app.use('/api/produits', authApiKey, produitsRouter);
app.use('/api/souscriptions', authApiKey, souscriptionsRouter);
app.use('/api/contrats', authApiKey, contratsRouter);

app.use((req, res) => {
  res.status(404).json({ erreur: 'ROUTE_INTROUVABLE', message: `Route ${req.method} ${req.originalUrl} introuvable.` });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ erreur: 'ERREUR_INTERNE', message: err.message });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Mock Assurance Vie API démarrée sur http://localhost:${port}`);
});
