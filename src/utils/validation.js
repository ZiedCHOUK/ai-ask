'use strict';

function calculerAge(dateNaissanceStr, dateReference = new Date()) {
  const dateNaissance = new Date(dateNaissanceStr);
  let age = dateReference.getFullYear() - dateNaissance.getFullYear();
  const moisDiff = dateReference.getMonth() - dateNaissance.getMonth();
  if (moisDiff < 0 || (moisDiff === 0 && dateReference.getDate() < dateNaissance.getDate())) {
    age -= 1;
  }
  return age;
}

function isIbanValide(iban) {
  if (!iban || typeof iban !== 'string') return false;
  const normalise = iban.replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(normalise)) return false;
  const rearrange = normalise.slice(4) + normalise.slice(0, 4);
  const numerique = rearrange.replace(/[A-Z]/g, (ch) => (ch.charCodeAt(0) - 55).toString());
  let reste = 0;
  for (let i = 0; i < numerique.length; i += 7) {
    reste = Number(String(reste) + numerique.substring(i, i + 7)) % 97;
  }
  return reste === 1;
}

function isBicValide(bic) {
  if (!bic || typeof bic !== 'string') return false;
  return /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(bic.toUpperCase());
}

function isCodePostalFrValide(codePostal) {
  return /^[0-9]{5}$/.test(String(codePostal || ''));
}

function isEmailValide(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ''));
}

function isDateExpirationValide(dateExpirationStr, dateReference = new Date()) {
  const dateExpiration = new Date(dateExpirationStr);
  if (Number.isNaN(dateExpiration.getTime())) return false;
  return dateExpiration.getTime() > dateReference.getTime();
}

function sommeQuotites(beneficiaires) {
  return (beneficiaires || []).reduce((somme, b) => somme + Number(b.quotite || 0), 0);
}

module.exports = {
  calculerAge,
  isIbanValide,
  isBicValide,
  isCodePostalFrValide,
  isEmailValide,
  isDateExpirationValide,
  sommeQuotites,
};
