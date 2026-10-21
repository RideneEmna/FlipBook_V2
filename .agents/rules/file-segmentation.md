# Règle : Segmentation et responsabilité unique des fichiers

## Principe directeur

Un fichier = une responsabilité. La limite de lignes est un **indicateur de
couplage excessif**, pas une règle typographique. Tout fichier qui tend vers
600 lignes doit être découpé selon les principes de responsabilité unique (SRP).

## Seuils par couche d'architecture

| Type de fichier                         | Seuil conseillé | Seuil bloquant |
|-----------------------------------------|-----------------|----------------|
| Page (`app/*/page.tsx`)                 | < 80 lignes     | > 150 lignes   |
| Container / Feature component           | < 200 lignes    | > 400 lignes   |
| Composant UI pur                        | < 150 lignes    | > 300 lignes   |
| Hook custom (`use*.ts`)                 | < 120 lignes    | > 200 lignes   |
| Service / couche API (`lib/*.ts`)       | < 200 lignes    | > 350 lignes   |
| Fichier de types (`types.ts`)           | < 150 lignes    | > 250 lignes   |
| Fichier de configuration                | < 100 lignes    | > 200 lignes   |
| **Tout autre fichier**                  | < 300 lignes    | **> 600 lignes** |

> Un fichier qui atteint 400 lignes est un signal de refactoring imminent.
> Un fichier qui dépasse 600 lignes est un bloquant lors de la code review.

## Règles de découpe obligatoires

### Pages : orchestration uniquement
Une page Next.js (`page.tsx`) ne contient **aucune logique métier**.
Elle importe un composant Container ou Feature et le rend. C'est tout.

### Logique dans des hooks custom
Tout `useState`, `useEffect`, `useCallback` groupé autour d'une même
responsabilité doit être extrait dans un hook `use<Domaine>.ts` dédié.

### Un hook = une unité de logique
Un hook ne gère pas plusieurs préoccupations. Exemples corrects :
- `useFileUpload.ts` → gère uniquement l'upload
- `useJobProgress.ts` → gère uniquement le suivi de progression
- `useConversion.ts` → orchestre les deux hooks précédents si nécessaire

### Composants UI : rendu pur sans side effects
Un composant qui affiche des données ne doit pas contenir de logique
d'appel API, de timers, ou de transformations de données complexes.

### Co-location des types
Les types et interfaces sont déclarés dans le fichier du domaine qui les
produit, puis ré-exportés si nécessaire. Pas de fichier `types.ts` global
fourre-tout.

### Barrel exports par dossier
Chaque dossier de composants ou de hooks expose un `index.ts` qui
ré-exporte ses membres publics. Cela active le tree-shaking et clarifie
l'API publique de chaque module.

## Structure de feature module de référence

```
feature/
├── page.tsx              ← orchestration pure (< 80 lignes)
├── FeatureContainer.tsx  ← state + coordination (< 200 lignes)
├── hooks/
│   ├── useDomainA.ts
│   ├── useDomainB.ts
│   └── index.ts
├── components/
│   ├── ComponentA.tsx
│   ├── ComponentB.tsx
│   └── index.ts
└── types.ts              ← types locaux (< 80 lignes)
```

## Fichiers exclus de ces règles

- Fichiers générés automatiquement : `.next/`, `dist/`, `*.generated.ts`
- Fichiers de données statiques : traductions i18n, fixtures de test
- Fichiers de migration de base de données

## Objectifs

1. **Performance** : fichiers petits = chunks JS plus fins = meilleur
   code-splitting et lazy loading par Next.js / Turbopack.
2. **Testabilité** : chaque unité est testable isolément sans mocker
   une dépendance entière.
3. **Lisibilité** : un développeur comprend la responsabilité d'un fichier
   en moins de 30 secondes.
4. **Compilation TypeScript** : évite les imports circulaires qui
   ralentissent le compilateur.
