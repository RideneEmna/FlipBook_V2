# Règle : Interdiction du hardcoding des design tokens

## Principe

Toute valeur visuelle doit être déclarée dans le système de design centralisé
du projet et **jamais écrite en dur** dans un composant ou une feuille de style ad hoc.

## Ce qui est interdit

Les valeurs suivantes ne doivent **jamais** apparaître directement dans un
composant `.tsx`, `.ts`, `.css` ou `.js` :

| Catégorie            | Exemples de valeurs interdites                         |
|----------------------|--------------------------------------------------------|
| Couleurs             | `#3b82f6`, `rgb(255,0,0)`, `hsl(220, 90%, 56%)`       |
| Tailles / espacement | `16px`, `1.5rem`, `24`, `w-[340px]`                    |
| Typographie          | `font-size: 14px`, `font-weight: 700`, `"Inter"`       |
| Ombres               | `box-shadow: 0 4px 12px rgba(0,0,0,.15)`               |
| Rayons de bordure    | `border-radius: 8px`, `rounded-[12px]`                 |
| Z-index              | `z-index: 999`                                         |
| Durées d'animation   | `transition: 0.3s ease`                                |
| Breakpoints          | `@media (max-width: 768px)`                            |

## Ce qui est obligatoire

- **Tailwind CSS** : utiliser uniquement les classes issues de la configuration
  `tailwind.config.ts` du projet (couleurs du thème, espacements de l'échelle,
  etc.). Les classes arbitraires `[valeur]` sont **proscrites**.
- **Variables CSS** : toute valeur personnalisée doit être déclarée dans
  `:root {}` (dans `globals.css` ou équivalent) et référencée via `var(--nom-du-token)`.
- **Thème centralisé** : tout ajout de couleur, taille ou typographie passe
  d'abord par `tailwind.config.ts` avant d'être utilisé dans un composant.

## Exceptions autorisées

- Valeurs à `0` ou `100%` sans sémantique (ex. `opacity-0`, `w-full`).
- Valeurs structurelles inline incontournables imposées par une lib tierce,
  documentées par un commentaire `/* design-token-exception: raison */`.

## Objectifs

1. **Cohérence visuelle** : un seul endroit pour changer une couleur ou une taille.
2. **Maintenabilité** : refactoring du design system sans chasse aux magic values.
3. **Scalabilité** : le thème évolue sans régression visuelle non intentionnelle.
