# Muscu — suivi de musculation (PWA)

> Ce dossier `muscu/` contient l'app. Le reste du dépôt est le site NatureEmoi, qui n'est pas modifié.

Application personnelle pour noter ses séances de musculation et suivre sa progression.
Elle s'installe sur l'écran d'accueil de l'iPhone, fonctionne **hors connexion**, et garde
toutes les données **uniquement sur le téléphone** (aucun compte, aucun serveur).

- **Séance** : démarrer, ajouter des exercices, saisir les séries avec les boutons − / +, « Annuler » après chaque action, résumé en fin de séance, « Refaire une séance précédente ».
- **Historique** : toutes les séances, modifiables après coup.
- **Progrès** : courbes (poids max, 1RM estimé, volume), records personnels, régularité.
- **Réglages** : mes exercices, export / import de sauvegarde (JSON), données de démonstration.

Technique : Vite + React + TypeScript, Tailwind CSS, Dexie (IndexedDB), Recharts, vite-plugin-pwa.

---

## 1. Lancer l'app sur ton PC Windows

À faire **une seule fois** :

1. Installe **Node.js** : va sur <https://nodejs.org>, télécharge la version **LTS** (« Windows Installer »), puis clique sur *Suivant* jusqu'au bout.
2. Récupère le projet : sur la page GitHub du dépôt **NatureEMoi**, bouton vert **Code → Download ZIP**, puis fais un clic droit sur le fichier → **Extraire tout** (par exemple dans `Documents`).
3. Dans le dossier extrait, ouvre le sous-dossier **`muscu`** (celui qui contient `package.json`). Clique dans la **barre d'adresse** de l'Explorateur, tape `cmd` puis **Entrée** : une fenêtre noire (le terminal) s'ouvre dans ce dossier.
4. Tape :
   ```
   npm install
   ```
   et attends la fin (1 à 2 minutes).

Ensuite, **à chaque fois** que tu veux lancer l'app :

5. Dans le terminal (ouvert comme à l'étape 3), tape :
   ```
   npm run dev
   ```
6. Sur le PC, ouvre ton navigateur à l'adresse **http://localhost:5173**.
7. Pour arrêter : dans le terminal, appuie sur **Ctrl + C**.

## 2. L'ouvrir sur l'iPhone par le Wi-Fi (pour essayer)

1. Le PC et l'iPhone doivent être sur **le même Wi-Fi**.
2. Lance `npm run dev` sur le PC. Le terminal affiche une ligne comme :
   `Network: http://192.168.1.23:5173/`
3. Sur l'iPhone, ouvre **Safari** et tape exactement cette adresse.
4. Si Windows affiche une alerte du **pare-feu**, coche **Réseaux privés** et clique sur **Autoriser**.

> ⚠️ Cette méthode sert à **essayer** l'app. Par le Wi-Fi (adresse en `http://`), le mode hors connexion
> ne fonctionne pas, et les données saisies ici ne seront pas celles de la version installée.
> Pour l'utiliser vraiment à la salle, mets-la en ligne (étape 3) puis installe-la (étape 4).

## 3. La mettre en ligne gratuitement

### Option A — GitHub Pages (recommandé, automatique)

Le dépôt contient déjà tout ce qu'il faut (fichier `.github/workflows/deploy.yml` à la racine du dépôt).

1. Sur la page GitHub du dépôt : **Settings** → **Pages** (menu de gauche).
2. Dans **Source**, choisis **GitHub Actions**.
3. Va dans l'onglet **Actions** : la mise en ligne se lance à chaque modification de la branche `main`
   (sinon, clique sur « Mise en ligne (GitHub Pages) » → **Run workflow**). Attends la coche verte (1 à 2 minutes).
4. L'app est en ligne à l'adresse : **https://m3q8.github.io/NatureEMoi/muscu/**
   (le site NatureEmoi reste à l'adresse https://m3q8.github.io/NatureEMoi/).

Chaque nouvelle version envoyée sur GitHub est mise en ligne toute seule, et l'app installée sur
l'iPhone se met à jour d'elle-même à la prochaine ouverture avec Internet.

### Option B — Netlify (glisser-déposer, sans GitHub)

1. Dans le terminal ouvert dans le dossier `muscu`, tape `npm run build` : un dossier `dist` est créé.
2. Va sur <https://app.netlify.com/drop> (crée un compte gratuit si besoin).
3. Fais glisser le dossier **`dist`** dans la page. Netlify te donne une adresse en `https://…netlify.app`.

## 4. L'installer sur l'iPhone

1. Ouvre l'adresse en ligne (`https://…`) dans **Safari** (pas Chrome).
2. Touche le bouton **Partager** (le carré avec une flèche vers le haut).
3. Fais défiler et touche **Sur l'écran d'accueil**, puis **Ajouter**.
4. Lance l'app depuis sa nouvelle **icône** : elle s'ouvre en plein écran et marche sans Internet.

> ⚠️ Sur iPhone, l'app installée et Safari ont **des données séparées**. Utilise toujours l'icône
> de l'écran d'accueil.

## 5. Ne pas perdre ses données

- Les données sont **uniquement** sur le téléphone. Si tu supprimes l'app (l'icône), elles sont effacées.
- **Réglages → Exporter mes données** crée un fichier de sauvegarde : choisis **Enregistrer dans Fichiers**
  (iCloud Drive). Fais-le régulièrement ; l'app te le rappelle au bout d'un mois.
- **Réglages → Importer une sauvegarde** restaure ce fichier (sur le même ou un nouveau téléphone).
- L'app démarre **vide**. Pour voir les graphiques avec des exemples : **Réglages → Ajouter des données de démo**
  (elles se suppriment ensuite d'un geste, sans toucher à tes vraies séances).

---

## Pour les développeurs

```
npm install      # dépendances
npm run dev      # serveur de développement (accessible sur le réseau local)
npm test         # tests (calculs, séances, sauvegarde)
npm run build    # version de production dans dist/
npm run preview  # tester la version de production
```

Structure :

```
src/
  db/          base IndexedDB (Dexie), exercices de départ, démo, actions (séances, exercices)
  lib/         calculs (1RM d'Epley, volume, records, régularité), formatage, sauvegarde
  hooks/       données en direct, heure, Wake Lock
  components/  Stepper −/+, panneaux, messages « Annuler », barre d'onglets, icônes
  screens/     seance/, historique/, progres/, reglages/
```
