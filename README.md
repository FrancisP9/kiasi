# Kiasi&Co - Site Web Expérientiel

Ce projet est une maquette haute fidélité du site Kiasi&Co, intégrant des séquences vidéo cinématiques contrôlées par le scroll et le temps.

## Structure du Projet

- **Animations** : GSAP + ScrollTrigger
- **Rendu** : HTML5 Canvas (performant pour les séquences d'images)
- **Design** : CSS moderne (Variables, Flexbox, Grid)
- **Assets** : Séquences WebP optimisées (Zoom & Rotation 360°)

## Installation et Lancement

1. Assurez-vous d'avoir Node.js installé.
2. À la racine du dossier, installez les dépendances :
   ```bash
   npm install
   ```
3. Lancez le serveur de développement :
   ```bash
   npm run dev
   ```
4. Ouvrez le lien local (généralement `http://localhost:5173`) dans votre navigateur.

## Fonctionnement des Séquences

- **Zoom d'entrée** : Se joue automatiquement au chargement. (Frames `frames/zoom/`)
- **Rotation 360°** : Contrôlée par le scroll après l'intro. (Frames `frames/rotate/`)
- **Textes** : Synchronisés avec l'avancement de la vidéo via GSAP.

## Modification des Frames

Si vous souhaitez changer les vidéos, remplacez simplement les fichiers dans `public/frames/zoom` et `public/frames/rotate` en gardant la nomenclature exacte (`zoom-0001.webp`, etc.).

