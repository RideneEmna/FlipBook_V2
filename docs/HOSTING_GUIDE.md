# Guide Complet de Déploiement en Production (Step-by-Step)
### Flipbook Studio Pro & Visionneuse Élève

Ce guide pas-à-pas explique de manière exhaustive et détaillée comment héberger l'application complète en production :
- Le **Backend Python (FastAPI / Moteur de conversion PDF & Export)** sur **Railway** ou **Render** (ou VPS Docker).
- Le **Frontend Next.js (Studio Pro & Interface Élève)** sur **Vercel**.

---

## Sommaire
1. [Architecture et Prérequis](#1-architecture-et-prérequis)
2. [Étape 1 : Préparer le dépôt GitHub (Monorepo)](#2-étape-1--préparer-le-dépôt-github-monorepo)
3. [Étape 2 : Déployer le Backend Python (Railway ou Render)](#3-étape-2--déployer-le-backend-python)
   - [Option A : Déploiement sur Railway (Recommandé)](#option-a--déploiement-sur-railway-recommandé)
   - [Option B : Déploiement sur Render](#option-b--déploiement-sur-render)
   - [Option C : Déploiement sur VPS Linux (Ubuntu / Docker)](#option-c--déploiement-sur-vps-linux-ubuntu--docker)
4. [Étape 3 : Déployer le Frontend Next.js sur Vercel](#4-étape-3--déployer-le-frontend-nextjs-sur-vercel)
5. [Étape 4 : Configuration Finale & Liaison CORS](#5-étape-4--configuration-finale--liaison-cors)
6. [Étape 5 : Checklist de Vérification Complète](#6-étape-5--checklist-de-vérification-complète)
7. [Dépannage & Erreurs Fréquentes (Gotchas)](#7-dépannage--erreurs-fréquentes-gotchas)

---

## 1. Architecture et Prérequis

### Structure du projet
L'application est organisée en **Monorepo** :
```
Newflipbook-converter/
├── apps/
│   ├── web/               # Frontend Next.js 14 (Studio Pro & Visualiseur)
│   └── offline/           # Lecteur HTML autonome empaqueté dans les ZIP
├── packages/
│   └── viewer/            # Moteur JavaScript central du Flipbook (PageFlip, sons, crayons)
├── python/
│   ├── Dockerfile         # Docker multi-stage (compile offline puis lance FastAPI)
│   ├── requirements.txt   # Dépendances Python (pypdfium2, Pillow, FastAPI...)
│   └── main.py            # Point d'entrée de l'API FastAPI
└── package.json           # Workspace npm racine
```

### Rôles des services

| Service | Emplacement | Hébergeur Recommandé | Rôle |
| :--- | :--- | :--- | :--- |
| **Backend & Moteur PDF** | `python/` + `packages/viewer` | **Railway** ou **Render** | Conversion PDF haute résolution (DPI 150/200/300), découpe des zones de zoom HD, streaming SSE de progression, génération des archives ZIP avec script Kiosque. |
| **Frontend Web** | `apps/web` | **Vercel** | Interface utilisateur fluide, éditeur interactif, aperçu en direct, CDN mondial haute vitesse. |

> [!IMPORTANT]
> **Pourquoi déployer le backend en premier ?**
> Le frontend Next.js a besoin de connaître l'URL publique de votre backend (`NEXT_PUBLIC_CONVERTER_URL`) lors de sa compilation pour pouvoir s'y connecter.

---

## 2. Étape 1 : Préparer le dépôt GitHub (Monorepo)

Assurez-vous que l'ensemble du projet est bien versionné sur un dépôt GitHub (public ou privé).

1. Vérifiez l'état de votre Git local :
   ```bash
   git status
   ```
2. Ajoutez et committez les modifications :
   ```bash
   git add .
   git commit -m "feat: complete flipbook production setup"
   ```
3. Poussez sur votre branche principale (`main` ou `master`) :
   ```bash
   git push origin main
   ```

---

## 3. Étape 2 : Déployer le Backend Python

Le backend utilise un `Dockerfile` multi-étapes situé dans `python/Dockerfile` :
1. **Étape 1 (`node:22-slim`)** : Compile le package `@flipbook/viewer` et génère le fichier `apps/offline/dist/index.html`.
2. **Étape 2 (`python:3.12-slim`)** : Installe les dépendances Python, injecte le fichier `index.html` compilé, et démarre le serveur ASGI Uvicorn sur le port dynamique `$PORT`.

---

### Option A : Déploiement sur Railway (Recommandé)

Railway offre un déploiement continu ultra-rapide, une excellente gestion du streaming SSE et des volumes persistants.

#### 1. Créer le projet
1. Connectez-vous sur [railway.app](https://railway.app).
2. Cliquez sur **"+ New Project"** → **"Deploy from GitHub repo"**.
3. Sélectionnez le dépôt de votre projet.
4. Cliquez sur **"Deploy Now"** (nous allons ajuster les paramètres immédiatement).

#### 2. Configurer le build Docker
1. Cliquez sur la carte de votre service dans l'espace Railway.
2. Allez dans l'onglet **"Settings"** :
   - Dans la section **"Build"** :
     - **Builder** : `Dockerfile`
     - **Dockerfile Path** : `python/Dockerfile`
     - **Docker Context Root** : `/` *(la racine du dépôt, indispensable pour accéder à `apps/offline`)*
   - Dans la section **"Deploy"** :
     - **Healthcheck Path** : `/health`
     - **Healthcheck Timeout** : `120`

#### 3. Définir les variables d'environnement
Allez dans l'onglet **"Variables"** et ajoutez :

```env
PORT=8000
ALLOWED_ORIGINS=*
DATA_DIR=/app/tmp_data
MAX_UPLOAD_MB=500
FILE_IDLE_TTL_MINUTES=120
OFFLINE_VIEWER_PATH=/app/offline-viewer/index.html
```

#### 4. Ajouter un volume persistant (Recommandé)
Pour éviter de perdre les fichiers convertis lors d'un redémarrage ou d'une mise à jour :
1. Allez dans l'onglet **"Volumes"**.
2. Cliquez sur **"Add Volume"**.
3. Définissez le point de montage :
   - **Mount Path** : `/app/tmp_data`
   - **Taille** : 5 GB à 10 GB

#### 5. Générer le domaine public
1. Allez dans **"Settings"** → section **"Networking"**.
2. Cliquez sur **"Generate Domain"**.
3. Copiez le domaine HTTPS généré (ex: `https://flipbook-api-production.up.railway.app`).

#### 6. Tester le backend
Ouvrez votre navigateur sur :
```text
https://<VOTRE-DOMAINE-RAILWAY>/health
```
Vous devez obtenir :
```json
{"status": "ok"}
```

---

### Option B : Déploiement sur Render

Render propose des services Web Docker avec disques persistants et certificats SSL automatiques.

#### 1. Créer le Web Service
1. Connectez-vous sur [render.com](https://render.com).
2. Cliquez sur **"New +"** (en haut à droite) → **"Web Service"**.
3. Choisissez **"Build and deploy from a Git repository"** et sélectionnez votre dépôt.

#### 2. Configurer les options du service
Renseignez les champs suivants :
- **Name** : `flipbook-api`
- **Region** : Choisissez la plus proche de vos utilisateurs (ex: `Frankfurt` ou `Oregon`).
- **Branch** : `main`
- **Root Directory** : Laissez **vide** (ou `.`) pour utiliser la racine du monorepo.
- **Language / Runtime** : **Docker**
- **Dockerfile Path** : `./python/Dockerfile`
- **Docker Context** : `.` *(très important : doit pointer vers la racine)*
- **Instance Type** : Minimum **Starter (1 GB RAM, 1 vCPU)**.
  *(Le plan gratuit fonctionne pour les petits PDF, mais le plan Starter évite les dépassements de mémoire lors de la conversion de gros PDF).*

#### 3. Ajouter les variables d'environnement
Dans la section **"Environment Variables"** :

| Clé | Valeur |
| :--- | :--- |
| `PORT` | `8000` |
| `ALLOWED_ORIGINS` | `*` |
| `DATA_DIR` | `/app/tmp_data` |
| `MAX_UPLOAD_MB` | `500` |
| `FILE_IDLE_TTL_MINUTES` | `120` |
| `OFFLINE_VIEWER_PATH` | `/app/offline-viewer/index.html` |

#### 4. Ajouter un disque persistant
1. Faites défiler vers le bas jusqu'à la section **"Disks"**.
2. Cliquez sur **"Add Disk"** :
   - **Name** : `flipbook-storage`
   - **Mount Path** : `/app/tmp_data`
   - **Size** : `5 GB`

#### 5. Valider et déployer
1. Cliquez sur **"Create Web Service"**.
2. Suivez les logs de construction. Une fois le statut **"Live"**, copiez l'URL fournie (ex: `https://flipbook-api.onrender.com`).
3. Vérifiez le point de santé : `https://flipbook-api.onrender.com/health`.

---

### Option C : Déploiement sur VPS Linux (Ubuntu / Docker)

Si vous possédez votre propre serveur VPS (DigitalOcean, OVH, Hetzner, AWS EC2) :

1. **Installer Docker & Docker Compose** :
   ```bash
   sudo apt update && sudo apt install -y docker.io docker-compose git
   sudo systemctl enable --now docker
   ```
2. **Cloner le projet** :
   ```bash
   git clone https://github.com/votre-compte/flipbook-converter.git /opt/flipbook
   cd /opt/flipbook
   ```
3. **Configurer les variables d'environnement** :
   ```bash
   nano python/.env
   ```
   Renseignez :
   ```env
   ALLOWED_ORIGINS=*
   MAX_UPLOAD_MB=500
   DATA_DIR=/app/tmp_data
   FILE_IDLE_TTL_MINUTES=120
   ```
4. **Lancer le conteneur** :
   ```bash
   docker-compose up -d --build
   ```
5. **Configurer Nginx avec proxy inverse & SSL** :
   ```nginx
   server {
       server_name api-flipbook.mondomaine.com;
       client_max_body_size 550M;

       location / {
           proxy_pass http://127.0.0.1:8000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           proxy_set_header Host $host;
           proxy_buffering off;
           proxy_cache off;
           proxy_read_timeout 600s;
       }
   }
   ```
   Activez le certificat SSL avec Let's Encrypt :
   ```bash
   sudo certbot --nginx -d api-flipbook.mondomaine.com
   ```

---

## 4. Étape 3 : Déployer le Frontend Next.js sur Vercel

Le frontend Next.js réside dans `apps/web` et utilise les styles Tailwind ainsi que les packages du monorepo.

### 1. Importer le projet dans Vercel
1. Connectez-vous sur [vercel.com](https://vercel.com).
2. Cliquez sur **"Add New..."** → **"Project"**.
3. Importez votre dépôt GitHub.

### 2. Configurer le Monorepo dans Vercel (Étape Cruciale)
Dans l'écran **"Configure Project"** :

1. **Framework Preset** : `Next.js` (détecté automatiquement).
2. **Root Directory** :
   - Cliquez sur **"Edit"** à côté de Root Directory.
   - Sélectionnez :
     ```text
     apps/web
     ```
   - Cochez la case : **"Include files outside of the Root Directory in the Build Step"** *(Obligatoire pour que Vercel ait accès à `packages/viewer` et `package.json` racine)*.

3. **Build and Output Settings** :
   - Laissez les valeurs par défaut :
     - **Build Command** : `next build`
     - **Output Directory** : `.next`
     - **Install Command** : `npm install`

### 3. Configurer la Variable d'Environnement
Dans la section **"Environment Variables"**, ajoutez la variable de liaison :

| Key | Value | Exemple |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_CONVERTER_URL` | L'URL HTTPS de votre backend | `https://flipbook-api-production.up.railway.app` |

> [!WARNING]
> Ne mettez **pas** de barre oblique `/` à la fin de l'URL !
> - Correct : `https://flipbook-api.up.railway.app`
> - Incorrect : `https://flipbook-api.up.railway.app/`

### 4. Déployer
1. Cliquez sur le bouton bleu **"Deploy"**.
2. Vercel compile le projet et affiche les félicitations avec votre domaine Vercel (ex: `https://flipbook-studio.vercel.app`).

---

## 5. Étape 4 : Configuration Finale & Liaison CORS

Une fois votre domaine Vercel obtenu :

1. Retournez dans les variables de votre backend (sur Railway ou Render).
2. Modifiez la variable `ALLOWED_ORIGINS` pour restreindre l'accès à votre domaine en production :
   ```env
   ALLOWED_ORIGINS=https://flipbook-studio.vercel.app,https://mondomaine.com
   ```
   *(Vous pouvez laisser `*` pendant la phase de test).*
3. Redémarrez le service backend pour appliquer la modification.

---

## 6. Étape 5 : Checklist de Vérification Complète

Avant de distribuer l'application aux enseignants et élèves, réalisez ce test de bout en bout :

- [ ] **1. Vérification API** :
  - Ouvrez `https://<URL-BACKEND>/health` → renvoie `{"status":"ok"}`.
- [ ] **2. Chargement de l'interface Studio** :
  - Ouvrez l'URL Vercel de votre application.
  - L'écran d'accueil Studio s'affiche sans erreur dans la console navigateur (F12).
- [ ] **3. Téléversement & Conversion PDF** :
  - Déposez un document PDF d'exemple (5 à 20 pages).
  - Cliquez sur **"Charger le pdf et configurer les pages"**.
  - La barre de progression s'incrémente en temps réel (valide la communication SSE `/jobs/{id}/stream`).
- [ ] **4. Configuration des pages (Étape 2)** :
  - L'aperçu affiche les miniatures des pages.
  - Le canevas central affiche la page en grand avec un zoom par défaut à 100%.
  - La barre d'outils de zoom au-dessus permet d'ajuster par pas de 10% (zoom max 130%).
  - L'ajout d'une zone (Choix, Entourer, Coloriage, Audio) fonctionne et s'enregistre.
  - Le bouton retour vers l'étape 1 fonctionne.
- [ ] **5. Conversion Finale & Export ZIP (Étape 3)** :
  - Cliquez sur **"Passer à la conversion"**.
  - Cliquez sur **"Lancer la conversion finale"**.
  - Téléchargez l'archive ZIP générée.
- [ ] **6. Test de l'archive autonome & Mode Kiosque** :
  - Extrayez complètement le ZIP sur votre ordinateur.
  - Double-cliquez sur `Ouvrir_Flipbook.bat` : le flipbook s'ouvre dans le navigateur local.
  - Double-cliquez sur `Lancer_Mode_Kiosque.bat` : le flipbook démarre en plein écran immersif.
  - Cliquez sur le bouton rouge **[ ✕ Quitter ]** dans la barre supérieure : une confirmation s'affiche et la fenêtre se ferme proprement.

---

## 7. Dépannage & Erreurs Fréquentes (Gotchas)

### 1. Erreur « Mixed Content » (HTTPS / HTTP)
- **Symptôme** : La console affiche : `Blocked loading mixed active content 'http://...'`.
- **Cause** : Votre frontend Vercel est en `https://`, mais l'URL de votre backend a été configurée en `http://`.
- **Solution** : Utilisez toujours `https://` dans `NEXT_PUBLIC_CONVERTER_URL`. Railway et Render fournissent des certificats HTTPS gratuits par défaut.

### 2. Erreur Vercel « Cannot find module @flipbook/viewer »
- **Symptôme** : Le build Vercel échoue avec une erreur de module introuvable.
- **Cause** : Vercel n'a pas inclus les dossiers parents du monorepo dans le contexte de build.
- **Solution** : Dans **Vercel Settings** → **General** → **Root Directory**, vérifiez que la case **"Include files outside of the Root Directory in the Build Step"** est bien cochée.

### 3. Erreur 413 « Payload Too Large » lors de l'upload de gros PDF
- **Symptôme** : L'upload échoue immédiatement pour les fichiers volumineux (> 50 Mo).
- **Cause** : Le proxy inverse ou la configuration de l'hébergeur bloque les requêtes trop lourdes.
- **Solution** :
  - Sur Railway et Render, la limite par défaut est de 100 Mo à 500 Mo.
  - Si vous utilisez un VPS Nginx, ajoutez `client_max_body_size 550M;` dans la configuration de votre bloc `server`.

### 4. Le streaming SSE ne s'affiche pas en temps réel (barre bloquée à 0% puis saute à 100%)
- **Symptôme** : La barre de progression ne bouge pas pendant le traitement puis passe directement à 100%.
- **Cause** : Mise en mémoire tampon (buffering) par un proxy intermédiaire (Cloudflare ou Nginx).
- **Solution** :
  - Si vous utilisez Nginx : ajoutez `proxy_buffering off;` et `proxy_cache off;`.
  - Si vous utilisez Cloudflare : désactivez le buffering dans les règles de transformation ou passez la route `/jobs/*/stream` en bypass de cache.

### 5. Render : Le backend s'endort après 15 minutes
- **Symptôme** : La première requête met ~50 secondes à répondre.
- **Cause** : Le plan gratuit de Render met en veille les conteneurs inactifs.
- **Solution** : Passez sur le plan Render **Starter** (7$/mois) ou utilisez **Railway**, qui dispose d'un temps de réponse instantané.

---

## Récapitulatif des Liens Utiles
- Dashboard Railway : [https://railway.app](https://railway.app)
- Dashboard Render : [https://render.com](https://render.com)
- Dashboard Vercel : [https://vercel.com](https://vercel.com)
- Documentation FastAPI : [https://fastapi.tiangolo.com](https://fastapi.tiangolo.com)
- Documentation Next.js : [https://nextjs.org/docs](https://nextjs.org/docs)
