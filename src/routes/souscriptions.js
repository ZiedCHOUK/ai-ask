'use strict';

const express = require('express');
const { findProduit, getDocumentsRequis } = require('../data/produits');
const { genererNumeroContrat, creerContrat } = require('../store');
const {
  calculerAge,
  isIbanValide,
  isBicValide,
  isCodePostalFrValide,
  isEmailValide,
  isDateExpirationValide,
  sommeQuotites,
} = require('../utils/validation');

const router = express.Router();

const SEUIL_LCBFT = 150000;
const SEUIL_QUESTIONNAIRE_SANTE = 75000;

function validerSouscription(produit, corps) {
  const erreurs = [];
  const souscripteur = corps.souscripteur || {};
  const adresse = souscripteur.adresse || {};
  const pieceIdentite = souscripteur.pieceIdentite || {};
  const rib = corps.rib || {};
  const beneficiaires = corps.beneficiaires || [];
  const documentsFournis = corps.documentsFournis || [];
  const primeInitiale = Number(corps.primeInitiale || 0);

  if (!souscripteur.dateNaissance) {
    erreurs.push({ code: 'CHAMP_MANQUANT', message: 'souscripteur.dateNaissance est requis.' });
  } else {
    const age = calculerAge(souscripteur.dateNaissance);
    if (age < produit.ageSouscriptionMin || age > produit.ageSouscriptionMax) {
      erreurs.push({
        code: 'AGE_SOUSCRIPTION',
        message: `Âge du souscripteur (${age} ans) hors bornes autorisées pour ${produit.code} [${produit.ageSouscriptionMin}-${produit.ageSouscriptionMax}].`,
      });
    }
  }

  if (!souscripteur.email || !isEmailValide(souscripteur.email)) {
    erreurs.push({ code: 'EMAIL_INVALIDE', message: 'souscripteur.email est requis et doit être un email valide.' });
  }

  if (!pieceIdentite.numero || !pieceIdentite.dateExpiration) {
    erreurs.push({ code: 'PIECE_IDENTITE_MANQUANTE', message: 'souscripteur.pieceIdentite.numero et dateExpiration sont requis.' });
  } else if (!isDateExpirationValide(pieceIdentite.dateExpiration)) {
    erreurs.push({ code: 'PIECE_IDENTITE_VALIDE', message: "La pièce d'identité fournie est expirée." });
  }

  if (!isCodePostalFrValide(adresse.codePostal)) {
    erreurs.push({ code: 'ADRESSE_VALIDE', message: 'souscripteur.adresse.codePostal doit être un code postal français à 5 chiffres.' });
  }
  if (!adresse.pays) {
    erreurs.push({ code: 'ADRESSE_VALIDE', message: 'souscripteur.adresse.pays est requis.' });
  }

  if (primeInitiale < produit.primeMinimaleInitiale) {
    erreurs.push({
      code: 'PRIME_MIN_INITIALE',
      message: `La prime initiale (${primeInitiale} €) est inférieure au minimum requis pour ${produit.code} (${produit.primeMinimaleInitiale} €).`,
    });
  }

  if (beneficiaires.length === 0) {
    erreurs.push({ code: 'BENEFICIAIRES_MANQUANTS', message: 'Au moins un bénéficiaire doit être désigné.' });
  } else if (sommeQuotites(beneficiaires) !== 100) {
    erreurs.push({
      code: 'QUOTITES_BENEFICIAIRES_100',
      message: `La somme des quotités des bénéficiaires doit être égale à 100% (actuellement ${sommeQuotites(beneficiaires)}%).`,
    });
  }

  if (produit.code === 'VIE-TRANSMISSION' && beneficiaires.length < 2) {
    erreurs.push({
      code: 'VIE-TRANSMISSION-01',
      message: 'Vie Transmission Patrimoniale exige au moins deux bénéficiaires (ou une clause démembrée).',
    });
  }

  if (!rib.iban || !isIbanValide(rib.iban)) {
    erreurs.push({ code: 'IBAN_VALIDE', message: "L'IBAN fourni (rib.iban) est absent ou structurellement invalide." });
  }
  if (!rib.bic || !isBicValide(rib.bic)) {
    erreurs.push({ code: 'BIC_VALIDE', message: 'Le BIC fourni (rib.bic) est absent ou invalide.' });
  }
  if (!rib.titulaire) {
    erreurs.push({ code: 'RIB_TITULAIRE_MANQUANT', message: 'rib.titulaire (nom du titulaire du compte) est requis.' });
  }

  if (produit.code === 'VIE-DYNAMIQUE' && !['prudent', 'equilibre', 'dynamique'].includes(corps.profilRisque)) {
    erreurs.push({
      code: 'VIE-DYNAMIQUE-02',
      message: "profilRisque est requis pour Vie Dynamique et doit être 'prudent', 'equilibre' ou 'dynamique'.",
    });
  }

  const documentsRequis = getDocumentsRequis(produit);
  const documentsManquants = [];
  for (const doc of documentsRequis) {
    let requisEffectif = doc.obligatoire;
    if (!requisEffectif && doc.code === 'QUESTIONNAIRE_SANTE' && primeInitiale > SEUIL_QUESTIONNAIRE_SANTE) requisEffectif = true;
    if (!requisEffectif && (doc.code === 'JUSTIF_ORIGINE_FONDS' || doc.code === 'JUSTIF_REVENUS') && primeInitiale > SEUIL_LCBFT) requisEffectif = true;
    if (requisEffectif && !documentsFournis.includes(doc.code)) {
      documentsManquants.push({ code: doc.code, libelle: doc.libelle });
    }
  }
  if (documentsManquants.length > 0) {
    erreurs.push({
      code: 'DOCUMENTS_MANQUANTS',
      message: 'Un ou plusieurs documents obligatoires sont manquants.',
      documentsManquants,
    });
  }

  return erreurs;
}

router.post('/', (req, res) => {
  const corps = req.body || {};
  const produit = findProduit(corps.produitCode);
  if (!produit) {
    return res.status(400).json({ erreur: 'PRODUIT_INCONNU', message: `produitCode '${corps.produitCode}' ne correspond à aucun produit du référentiel.` });
  }

  const erreursValidation = validerSouscription(produit, corps);
  if (erreursValidation.length > 0) {
    return res.status(400).json({ erreur: 'VALIDATION_ECHOUEE', erreursValidation });
  }

  const primeInitiale = Number(corps.primeInitiale || 0);
  const estPPE = Boolean(corps.souscripteur?.personnePolitiquementExposee);
  const depasseSeuilLCBFT = primeInitiale > SEUIL_LCBFT || produit.code === 'VIE-TRANSMISSION';

  const statut = estPPE ? 'EN_ATTENTE_VALIDATION_CONFORMITE' : 'VALIDE';

  const contrat = {
    numeroContrat: genererNumeroContrat(),
    produitCode: produit.code,
    produitNom: produit.nom,
    statut,
    dateSouscription: new Date().toISOString(),
    dateDerniereModification: new Date().toISOString(),
    souscripteur: corps.souscripteur,
    primeInitiale,
    modeVersement: corps.modeVersement || 'unique',
    allocations: corps.allocations || null,
    profilRisque: corps.profilRisque || null,
    beneficiaires: corps.beneficiaires,
    rib: corps.rib,
    documentsFournis: corps.documentsFournis || [],
    controleLCBFT: depasseSeuilLCBFT ? 'RENFORCE' : 'STANDARD',
    historiqueActesGestion: [],
  };

  creerContrat(contrat);
  res.status(201).json({ message: 'Souscription enregistrée.', contrat });
});

module.exports = router;
