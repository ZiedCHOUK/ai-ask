'use strict';

const DOCUMENTS_GENERIQUES = [
  { code: 'PIECE_IDENTITE', libelle: "Pièce d'identité en cours de validité (CNI ou Passeport)", obligatoire: true },
  { code: 'JUSTIF_DOMICILE', libelle: 'Justificatif de domicile de moins de 3 mois', obligatoire: true },
  { code: 'RIB', libelle: "Relevé d'Identité Bancaire (IBAN + BIC)", obligatoire: true },
  { code: 'FORMULAIRE_BENEFICIAIRES', libelle: 'Formulaire de désignation des bénéficiaires', obligatoire: true },
  { code: 'QUESTIONNAIRE_SANTE', libelle: 'Questionnaire médical simplifié', obligatoire: false, condition: 'Requis si prime initiale > 75 000 € ou âge > 65 ans' },
  { code: 'JUSTIF_ORIGINE_FONDS', libelle: "Justificatif d'origine des fonds (LCB-FT)", obligatoire: false, condition: 'Requis si prime initiale > 150 000 €' },
  { code: 'JUSTIF_REVENUS', libelle: "Justificatif de revenus (avis d'imposition ou 3 derniers bulletins de salaire)", obligatoire: false, condition: 'Requis si prime initiale > 150 000 €' },
];

const REGLES_GENERIQUES = [
  { code: 'AGE_SOUSCRIPTION', description: "L'âge du souscripteur à la souscription doit être compris entre l'âge minimum et l'âge maximum du produit." },
  { code: 'PRIME_MIN_INITIALE', description: 'La prime initiale versée doit être supérieure ou égale à la prime minimale initiale du produit.' },
  { code: 'PIECE_IDENTITE_VALIDE', description: "La pièce d'identité fournie doit être en cours de validité (date d'expiration > date du jour)." },
  { code: 'QUOTITES_BENEFICIAIRES_100', description: "La somme des quotités des bénéficiaires désignés doit être égale à 100%." },
  { code: 'IBAN_VALIDE', description: "L'IBAN fourni doit être structurellement valide (format et clé de contrôle mod 97)." },
  { code: 'ADRESSE_VALIDE', description: "L'adresse doit comporter un code postal français valide à 5 chiffres et un pays renseigné." },
  { code: 'LCBFT_SEUIL_150K', description: 'Au-delà de 150 000 € de prime initiale, un justificatif d\'origine des fonds et de revenus est obligatoire (dispositif LCB-FT).' },
  { code: 'PPE_VIGILANCE_RENFORCEE', description: "Si le souscripteur déclare être une Personne Politiquement Exposée (PPE), une vigilance renforcée est appliquée et le dossier est marqué EN_ATTENTE_VALIDATION_CONFORMITE au lieu d'être validé automatiquement." },
];

const PRODUITS = [
  {
    code: 'VIE-SERENITE',
    nom: 'Vie Sérénité',
    categorie: 'Épargne sécurisée',
    description: 'Contrat monosupport en fonds euros, capital garanti, orienté épargne de précaution.',
    typesSupport: ['fondsEuros'],
    primeMinimaleInitiale: 500,
    primeMinimaleVersementLibre: 100,
    primeMaximaleSansJustificatif: 150000,
    dureeMinimaleConseillee: 4,
    ageSouscriptionMin: 18,
    ageSouscriptionMax: 85,
    fraisEntreePourcent: 2,
    fraisGestionPourcentParAn: 0.6,
    modesSortie: ['capital', 'rente'],
    reglesValidationSpecifiques: [
      { code: 'VIE-SERENITE-01', description: 'Support unique en fonds euros : aucune allocation en unités de compte possible.' },
    ],
    documentsRequisSpecifiques: [],
  },
  {
    code: 'VIE-DYNAMIQUE',
    nom: 'Vie Dynamique',
    categorie: 'Épargne multisupport',
    description: "Contrat multisupport combinant fonds euros et unités de compte, pour un profil d'épargne à risque modéré à élevé.",
    typesSupport: ['fondsEuros', 'unitesDeCompte'],
    primeMinimaleInitiale: 1000,
    primeMinimaleVersementLibre: 150,
    primeMaximaleSansJustificatif: 150000,
    dureeMinimaleConseillee: 8,
    ageSouscriptionMin: 18,
    ageSouscriptionMax: 80,
    fraisEntreePourcent: 3,
    fraisGestionPourcentParAn: 0.9,
    modesSortie: ['capital', 'rente', 'capitalOuRente'],
    reglesValidationSpecifiques: [
      { code: 'VIE-DYNAMIQUE-01', description: "L'allocation en unités de compte ne peut excéder 100% et doit être répartie entre supports proposés (somme des pourcentages = 100%)." },
      { code: 'VIE-DYNAMIQUE-02', description: 'Un profil de risque (prudent, équilibré, dynamique) doit être renseigné et signé par le souscripteur.' },
    ],
    documentsRequisSpecifiques: [
      { code: 'PROFIL_RISQUE_SIGNE', libelle: 'Questionnaire de profil de risque signé', obligatoire: true },
    ],
  },
  {
    code: 'VIE-RETRAITE-PLUS',
    nom: 'Vie Retraite Plus',
    categorie: 'Retraite complémentaire',
    description: 'Contrat orienté constitution et sortie en rente pour compléter les revenus à la retraite.',
    typesSupport: ['fondsEuros', 'unitesDeCompte'],
    primeMinimaleInitiale: 800,
    primeMinimaleVersementLibre: 100,
    primeMaximaleSansJustificatif: 150000,
    dureeMinimaleConseillee: 10,
    ageSouscriptionMin: 18,
    ageSouscriptionMax: 65,
    fraisEntreePourcent: 2.5,
    fraisGestionPourcentParAn: 0.75,
    modesSortie: ['rente', 'capitalOuRente'],
    reglesValidationSpecifiques: [
      { code: 'VIE-RETRAITE-PLUS-01', description: "L'âge de sortie prévisionnelle déclaré doit être supérieur à l'âge de souscription et ne peut excéder 70 ans." },
    ],
    documentsRequisSpecifiques: [],
  },
  {
    code: 'VIE-OBSEQUES',
    nom: 'Vie Obsèques Protection',
    categorie: 'Prévoyance décès',
    description: 'Contrat de prévoyance destiné à couvrir les frais liés aux obsèques du souscripteur.',
    typesSupport: ['fondsEuros'],
    primeMinimaleInitiale: 300,
    primeMinimaleVersementLibre: 50,
    primeMaximaleSansJustificatif: 30000,
    dureeMinimaleConseillee: 1,
    ageSouscriptionMin: 50,
    ageSouscriptionMax: 90,
    fraisEntreePourcent: 1,
    fraisGestionPourcentParAn: 0.4,
    modesSortie: ['capital'],
    reglesValidationSpecifiques: [
      { code: 'VIE-OBSEQUES-01', description: 'Le capital garanti ne peut excéder 30 000 € sans questionnaire médical complémentaire.' },
      { code: 'VIE-OBSEQUES-02', description: 'Le bénéficiaire principal est par défaut une entreprise de pompes funèbres ou un proche désigné nommément.' },
    ],
    documentsRequisSpecifiques: [
      { code: 'QUESTIONNAIRE_SANTE', libelle: 'Questionnaire médical simplifié', obligatoire: true },
    ],
  },
  {
    code: 'VIE-TRANSMISSION',
    nom: 'Vie Transmission Patrimoniale',
    categorie: 'Transmission de patrimoine',
    description: 'Contrat orienté transmission de capital dans un cadre fiscal privilégié, pour primes élevées.',
    typesSupport: ['fondsEuros', 'unitesDeCompte'],
    primeMinimaleInitiale: 50000,
    primeMinimaleVersementLibre: 5000,
    primeMaximaleSansJustificatif: 150000,
    dureeMinimaleConseillee: 8,
    ageSouscriptionMin: 18,
    ageSouscriptionMax: 75,
    fraisEntreePourcent: 1.5,
    fraisGestionPourcentParAn: 0.8,
    modesSortie: ['capital'],
    reglesValidationSpecifiques: [
      { code: 'VIE-TRANSMISSION-01', description: 'Le souscripteur doit obligatoirement désigner au moins deux bénéficiaires ou un bénéficiaire avec clause démembrée.' },
      { code: 'VIE-TRANSMISSION-02', description: "Justificatif d'origine des fonds systématiquement requis quel que soit le montant, en raison du profil du produit." },
    ],
    documentsRequisSpecifiques: [
      { code: 'JUSTIF_ORIGINE_FONDS', libelle: "Justificatif d'origine des fonds (LCB-FT)", obligatoire: true },
    ],
  },
];

function getDocumentsRequis(produit) {
  const parCode = new Map();
  for (const doc of DOCUMENTS_GENERIQUES) parCode.set(doc.code, doc);
  for (const doc of produit.documentsRequisSpecifiques || []) parCode.set(doc.code, doc);
  return Array.from(parCode.values());
}

function getReglesValidation(produit) {
  return [...REGLES_GENERIQUES, ...(produit.reglesValidationSpecifiques || [])];
}

function findProduit(code) {
  return PRODUITS.find((p) => p.code.toLowerCase() === String(code).toLowerCase());
}

function listProduitsResume() {
  return PRODUITS.map((p) => ({
    code: p.code,
    nom: p.nom,
    categorie: p.categorie,
    description: p.description,
    primeMinimaleInitiale: p.primeMinimaleInitiale,
    ageSouscriptionMin: p.ageSouscriptionMin,
    ageSouscriptionMax: p.ageSouscriptionMax,
  }));
}

function getProduitDetail(code) {
  const produit = findProduit(code);
  if (!produit) return null;
  return {
    ...produit,
    documentsRequis: getDocumentsRequis(produit),
    reglesValidation: getReglesValidation(produit),
  };
}

module.exports = {
  PRODUITS,
  DOCUMENTS_GENERIQUES,
  REGLES_GENERIQUES,
  findProduit,
  listProduitsResume,
  getProduitDetail,
  getDocumentsRequis,
  getReglesValidation,
};
