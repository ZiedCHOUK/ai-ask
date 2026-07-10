'use strict';

const express = require('express');
const { obtenirContrat, listerContrats, ajouterActeGestion } = require('../store');
const {
  isIbanValide,
  isBicValide,
  isCodePostalFrValide,
  sommeQuotites,
} = require('../utils/validation');

const router = express.Router();

function chargerContrat(req, res, next) {
  const contrat = obtenirContrat(req.params.numeroContrat);
  if (!contrat) {
    return res.status(404).json({ erreur: 'CONTRAT_INTROUVABLE', message: `Aucun contrat avec le numéro ${req.params.numeroContrat}` });
  }
  req.contrat = contrat;
  next();
}

router.get('/', (req, res) => {
  res.json({ contrats: listerContrats() });
});

router.get('/:numeroContrat', chargerContrat, (req, res) => {
  res.json(req.contrat);
});

router.get('/:numeroContrat/actes', chargerContrat, (req, res) => {
  res.json({ numeroContrat: req.contrat.numeroContrat, historiqueActesGestion: req.contrat.historiqueActesGestion });
});

router.post('/:numeroContrat/actes/beneficiaires', chargerContrat, (req, res) => {
  const beneficiaires = req.body?.beneficiaires;
  if (!Array.isArray(beneficiaires) || beneficiaires.length === 0) {
    return res.status(400).json({ erreur: 'CHAMP_MANQUANT', message: 'beneficiaires (tableau non vide) est requis.' });
  }
  for (const b of beneficiaires) {
    if (!b.nom || !b.prenom || typeof b.quotite !== 'number') {
      return res.status(400).json({ erreur: 'BENEFICIAIRE_INVALIDE', message: 'Chaque bénéficiaire doit avoir nom, prenom et quotite (nombre).' });
    }
  }
  if (sommeQuotites(beneficiaires) !== 100) {
    return res.status(400).json({
      erreur: 'QUOTITES_BENEFICIAIRES_100',
      message: `La somme des quotités doit être égale à 100% (actuellement ${sommeQuotites(beneficiaires)}%).`,
    });
  }
  if (req.contrat.produitCode === 'VIE-TRANSMISSION' && beneficiaires.length < 2) {
    return res.status(400).json({
      erreur: 'VIE-TRANSMISSION-01',
      message: 'Vie Transmission Patrimoniale exige au moins deux bénéficiaires.',
    });
  }

  const ancienneValeur = req.contrat.beneficiaires;
  req.contrat.beneficiaires = beneficiaires;
  const acte = {
    type: 'CHANGEMENT_BENEFICIAIRES',
    dateEffet: new Date().toISOString(),
    ancienneValeur,
    nouvelleValeur: beneficiaires,
  };
  ajouterActeGestion(req.contrat.numeroContrat, acte);
  res.status(200).json({ message: 'Bénéficiaires mis à jour.', acte, contrat: req.contrat });
});

router.post('/:numeroContrat/actes/rib', chargerContrat, (req, res) => {
  const { iban, bic, titulaire } = req.body || {};
  const erreurs = [];
  if (!iban || !isIbanValide(iban)) erreurs.push({ code: 'IBAN_VALIDE', message: "L'IBAN fourni est absent ou structurellement invalide." });
  if (!bic || !isBicValide(bic)) erreurs.push({ code: 'BIC_VALIDE', message: 'Le BIC fourni est absent ou invalide.' });
  if (!titulaire) erreurs.push({ code: 'RIB_TITULAIRE_MANQUANT', message: 'titulaire (nom du titulaire du compte) est requis.' });
  if (erreurs.length > 0) {
    return res.status(400).json({ erreur: 'VALIDATION_ECHOUEE', erreursValidation: erreurs });
  }

  const ancienneValeur = req.contrat.rib;
  const nouvelleValeur = { iban, bic, titulaire };
  req.contrat.rib = nouvelleValeur;
  const acte = {
    type: 'CHANGEMENT_IDENTITE_BANCAIRE',
    dateEffet: new Date().toISOString(),
    ancienneValeur,
    nouvelleValeur,
  };
  ajouterActeGestion(req.contrat.numeroContrat, acte);
  res.status(200).json({ message: 'Identité bancaire mise à jour.', acte, contrat: req.contrat });
});

router.post('/:numeroContrat/actes/adresse', chargerContrat, (req, res) => {
  const adresse = req.body?.adresse;
  if (!adresse || !adresse.ligne1 || !adresse.codePostal || !adresse.ville || !adresse.pays) {
    return res.status(400).json({
      erreur: 'CHAMP_MANQUANT',
      message: 'adresse.ligne1, adresse.codePostal, adresse.ville et adresse.pays sont requis.',
    });
  }
  if (adresse.pays === 'France' && !isCodePostalFrValide(adresse.codePostal)) {
    return res.status(400).json({ erreur: 'ADRESSE_VALIDE', message: 'Le code postal doit être un code postal français à 5 chiffres.' });
  }

  const ancienneValeur = req.contrat.souscripteur.adresse;
  req.contrat.souscripteur.adresse = adresse;
  const acte = {
    type: 'CHANGEMENT_ADRESSE',
    dateEffet: new Date().toISOString(),
    ancienneValeur,
    nouvelleValeur: adresse,
  };
  ajouterActeGestion(req.contrat.numeroContrat, acte);
  res.status(200).json({ message: 'Adresse mise à jour.', acte, contrat: req.contrat });
});

module.exports = router;
