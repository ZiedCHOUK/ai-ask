'use strict';

function authApiKey(req, res, next) {
  const cle = req.header('x-api-key') || (req.header('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!cle || cle !== process.env.API_KEY) {
    return res.status(401).json({ erreur: 'NON_AUTORISE', message: "Clé API manquante ou invalide (en-tête 'x-api-key' ou 'Authorization: Bearer <clé>')." });
  }
  next();
}

module.exports = { authApiKey };
