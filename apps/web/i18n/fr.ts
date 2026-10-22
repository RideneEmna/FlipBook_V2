export type Translations = {
  studio: {
    badge: string;
    title: string;
    subtitle: string;
    resetBtn: string;
    pagesConverted: (n: number) => string;
    footer: string;
    stepper: {
      step1: string;
      step1Tag: string;
      step2: string;
      step2Tag: string;
      step3: string;
      step3Tag: string;
      doneTag: string;
    };
    inputs: {
      pdfPathLabel: string;
      pdfPathPlaceholder: string;
      browseBtn: string;
      destFolderLabel: string;
      destFolderPlaceholder: string;
      chooseFolderBtn: string;
    };
    projectMeta: {
      sectionTitle: string;
      sectionDesc: string;
      titleLabel: string;
      titlePlaceholder: string;
      subtitleLabel: string;
      subtitlePlaceholder: string;
      resolutionTitle: string;
      dpiFast: string;
      dpiFastDesc: string;
      dpiHd: string;
      dpiHdDesc: string;
      dpiUltra: string;
      dpiUltraDesc: string;
    };
    actions: {
      submitPrimary: string;
      openProject: string;
      noFileError: string;
    };
  };
  upload: {
    label: string;
    dragHere: string;
    supportsPdf: string;
    selectBtn: string;
    changeBtn: string;
    fileReady: string;
  };
  progress: {
    inProgress: string;
    sending: string;
    sendingMsg: string;
  };
  errors: {
    pdfOnly: string;
    tooLarge: (mb: number) => string;
    sendFailed: string;
    conversionFailed: string;
    connectionLost: string;
  };
  settings: {
    resolution: string;
    quality: (v: number) => string;
    dpiChoices: Record<number, string>;
  };
  ui: {
    lightMode: string;
    darkMode: string;
    langToggle: string;
    installPwa: string;
  };
};

export const fr: Translations = {
  studio: {
    badge: 'Flipbook Studio Pro · Éditeur Interactif',
    title: 'Convertisseur & Configurateur de Flipbook',
    subtitle: 'Configurez chaque page (textes à lire, modales HD, pistes audio) avant de compiler votre Flipbook HTML5 autonome.',
    resetBtn: 'Convertir un autre PDF',
    pagesConverted: (n: number) => `${n} pages converties avec succès.`,
    footer: 'Flipbook Studio Pro Engine v2 • Compilateur Web • Tous droits réservés © 2026',
    stepper: {
      step1: 'Upload document PDF',
      step1Tag: 'Étape actuelle',
      step2: 'Configuration des pages',
      step2Tag: 'À venir',
      step3: 'Conversion finale',
      step3Tag: 'Finalisation',
      doneTag: 'Terminé',
    },
    inputs: {
      pdfPathLabel: 'Fichier PDF source :',
      pdfPathPlaceholder: 'ex: /documents/catalogue-2026.pdf',
      browseBtn: 'Parcourir',
      destFolderLabel: 'Dossier de Destination Final :',
      destFolderPlaceholder: 'ex: /var/www/html/flipbooks/projet-A',
      chooseFolderBtn: 'Choisir dossier',
    },
    projectMeta: {
      sectionTitle: 'Options Générales & Résolution',
      sectionDesc: 'Définissez les métadonnées principales et la qualité de rendu pour les textures du flipbook.',
      titleLabel: 'Titre du Flipbook :',
      titlePlaceholder: 'ex: Catalogue Printemps-Été 2026',
      subtitleLabel: 'Sous-titre / Description :',
      subtitlePlaceholder: 'ex: Édition interactive avec narration vocale et modales HD',
      resolutionTitle: 'Résolution du rendu :',
      dpiFast: 'rapide (150 DPI)',
      dpiFastDesc: 'Aperçu rapide',
      dpiHd: 'HD recommandé (300 DPI)',
      dpiHdDesc: 'Équilibre parfait',
      dpiUltra: 'Ultra HD (450 DPI)',
      dpiUltraDesc: 'Qualité impression',
    },
    actions: {
      submitPrimary: 'Charger le PDF et configurer les pages',
      openProject: 'Ouvrir un projet (.json)',
      noFileError: 'Veuillez sélectionner ou glisser un fichier PDF pour continuer.',
    },
  },
  upload: {
    label: 'Glissez-déposez votre document PDF source :',
    dragHere: 'Glissez votre fichier PDF ici',
    supportsPdf: 'Supporte les fichiers PDF haute définition jusqu\'à 500 Mo',
    selectBtn: 'Sélectionner un fichier',
    changeBtn: 'Changer de fichier',
    fileReady: 'Fichier prêt pour la configuration',
  },
  progress: {
    inProgress: 'En cours',
    sending: 'Envoi',
    sendingMsg: 'Envoi du PDF au convertisseur...',
  },
  errors: {
    pdfOnly: 'Seuls les fichiers PDF sont acceptés.',
    tooLarge: (mb: number) => `Ce fichier dépasse ${mb} Mo.`,
    sendFailed: 'Envoi impossible.',
    conversionFailed: 'La conversion a échoué.',
    connectionLost: 'La connexion au convertisseur a été perdue ou le travail a expiré.',
  },
  settings: {
    resolution: 'Résolution',
    quality: (v: number) => `Qualité des images : ${v}%`,
    dpiChoices: {
      150: '150 DPI : rapide, fichiers légers',
      200: '200 DPI : équilibré',
      300: '300 DPI : haute qualité (recommandé)',
      450: '450 DPI : Ultra HD maximale',
    },
  },
  ui: {
    lightMode: 'Mode clair',
    darkMode: 'Mode sombre',
    langToggle: 'عربي',
    installPwa: "Installer l'application (Kiosque)",
  },
};

