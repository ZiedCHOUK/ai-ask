'use strict';

const contrats = new Map();
let compteurContrat = 1000;

function genererNumeroContrat() {
  compteurContrat += 1;
  return `AV-${compteurContrat}`;
}

function creerContrat(contrat) {
  contrats.set(contrat.numeroContrat, contrat);
  return contrat;
}

function obtenirContrat(numeroContrat) {
  return contrats.get(numeroContrat) || null;
}

function listerContrats() {
  return Array.from(contrats.values());
}

function ajouterActeGestion(numeroContrat, acte) {
  const contrat = contrats.get(numeroContrat);
  if (!contrat) return null;
  contrat.historiqueActesGestion.push(acte);
  contrat.dateDerniereModification = acte.dateEffet;
  return contrat;
}

module.exports = {
  genererNumeroContrat,
  creerContrat,
  obtenirContrat,
  listerContrats,
  ajouterActeGestion,
};
