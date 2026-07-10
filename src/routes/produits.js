'use strict';

const express = require('express');
const { listProduitsResume, getProduitDetail } = require('../data/produits');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ produits: listProduitsResume() });
});

router.get('/:code', (req, res) => {
  const detail = getProduitDetail(req.params.code);
  if (!detail) {
    return res.status(404).json({ erreur: 'PRODUIT_INTROUVABLE', message: `Aucun produit avec le code ${req.params.code}` });
  }
  res.json(detail);
});

module.exports = router;
