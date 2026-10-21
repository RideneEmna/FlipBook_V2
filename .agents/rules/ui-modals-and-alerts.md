# Règle : Cohérence visuelle stricte des Alertes et Modales

## Principe directeur

Toutes les alertes, notifications de statut et fenêtres modales de l'application
doivent obligatoirement réutiliser les composants d'interface unifiés du Design System
(`@/components/UI/Alert` et `@/components/UI/Modal`).
Aucun style ad-hoc ou composant d'alerte/modale custom ne doit être recréé inline.

## Ce qui est strictement interdit

| Pratique interdite | Pourquoi |
|---|---|
| `alert()`, `confirm()`, `prompt()` natifs du navigateur | Bloquent le thread JS, cassent l'UX et ne respectent pas le thème |
| Blocs d'alerte stylisés à la main (`bg-red-50 text-red-700 border-red-200`) | Viole la cohérence du thème sombre et des tokens |
| Modales écrites directement dans un composant métier sans `<Modal />` | Risque d'incohérence visuelle, d'accessibilité dégradée et de fuite d'événements |
| Couleurs de statut ou ombres écrites en dur | Non compatible avec le basculement dynamique Light / Dark |

## Ce qui est obligatoire

### 1. Alertes (`<Alert variant="danger" | "info" />`)
- Importer exclusivement le composant unifié :
  ```tsx
  import { Alert } from '@/components/UI';
  ```
- Utiliser les tokens sémantiques de retour utilisateur :
  - `variant="danger"` pour les erreurs et échecs
  - `variant="info"` pour les informations et guides
- Maintenir l'accessibilité : attribut `role="alert"` présent nativement dans le composant.
- Les textes d'alerte doivent provenir du système d'internationalisation (`i18n`).

### 2. Modales (`<Modal isOpen={...} onClose={...} title="...">`)
- Importer exclusivement le composant unifié :
  ```tsx
  import { Modal } from '@/components/UI';
  ```
- Respecter le contrat d'interface :
  - `isOpen: boolean`
  - `onClose: () => void`
  - `title?: string`
- Accessibilité obligatoire :
  - Piège du focus ou gestion native de la touche Échap (`Escape`)
  - Fermeture au clic sur le backdrop
  - Balises sémantiques `role="dialog"` et `aria-modal="true"`
- Le panneau modal doit adopter :
  - `bg-surface-card`
  - `border-surface-border`
  - `text-text-base`
  - `rounded-card`
  - Ombrage doux compatible Dark/Light.

### 3. Support Dark/Light et RTL (Arabe)
- Tous les composants d'alerte et de modale s'adaptent automatiquement sans conditionnel CSS manuel grâce aux variables de surfaces (`--color-surface-*`, `--color-danger-*`).
- En mode RTL (langue arabe), l'alignement du texte et des boutons de fermeture s'adapte automatiquement sans positionnement absolu gauche/droite figé.
