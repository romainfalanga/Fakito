# Fakito

Le labo des mots : une appli web pour écrire des paroles en français. On tape un mot ou une phrase, les résultats s'affichent aussitôt juste en dessous. Pensée d'abord pour le téléphone, installable sur l'écran d'accueil et utilisable hors ligne une fois chargée.

Tout tourne dans le navigateur, sans serveur ni compte : un dictionnaire de 125 000 formes françaises avec leur prononciation, et 36 000 entrées de synonymes.

## Les outils

| Famille | Outil | Ce qu'il fait |
| --- | --- | --- |
| Rimes | Rimes | Les mots qui finissent par le même son, des rimes riches aux pauvres, avec un filtre « sens proche de » |
| | Multisyllabes | La même suite de voyelles sur 2 à 6 syllabes, en un mot ou en deux |
| | Voisins | Homophones et mots à un son d'écart |
| | Découpages | La phrase redécoupée en d'autres mots aux mêmes sons |
| Sons | Sons contenus | Les mots qui contiennent tous les sons choisis |
| | Squelette | Mêmes consonnes, autres voyelles |
| | Enchaînements | Les mots qui commencent par la fin du tien, ou l'inverse |
| | Verlan | Verlan et contrepèteries |
| Lettres | Lettres contenues | Les mots qui contiennent toutes les lettres tapées |
| | Mot à trous | Recherche par forme : `?`, `*`, `@` (voyelle), `#` (consonne) |
| | Anagrammes | Avec toutes les lettres ou une partie |
| Sens | Synonymes | Avec un filtre « qui rime avec » |
| | Famille | Toutes les formes d'un mot, rangées par son final |
| Écrire | Atelier | Éditeur avec compte de syllabes par ligne, rimes coloriées, sons qui reviennent |
| | Au hasard | Un tirage de mots et une rime imposée |
| | Ma palette | Les mots gardés en chemin |

## Lancer en local

Aucune dépendance à installer, aucun build : le site est le dossier `public/`.

```bash
npm run dev
```

Puis ouvrir http://localhost:8080.

## Tests

```bash
npm test
```

Les tests vérifient le moteur (`public/js/engine.js`) sur le vrai dictionnaire. Il faut Node 20 ou plus récent.

## Organisation

```
public/
  index.html            la page
  css/app.css           styles, mobile d'abord
  js/engine.js          moteur linguistique, sans DOM (rimes, sons, lettres, synonymes…)
  js/app.js             interface
  data/lexique.txt      dictionnaire phonétique compacté
  data/synonymes.txt    thésaurus compacté
  sw.js                 service worker (hors ligne)
  manifest.webmanifest  installation sur l'écran d'accueil
tools/build_data.py     refabrique public/data/ à partir des sources
tests/                  tests du moteur
```

## Mettre en ligne

N'importe quel hébergeur de fichiers statiques convient : il suffit de servir `public/`. Tous les chemins sont relatifs, le site fonctionne donc aussi dans un sous-dossier.

Quand les fichiers de `public/data/` changent, il faut augmenter `VERSION` dans `public/sw.js` pour que les téléphones retéléchargent le dictionnaire.

## Refaire les données

```bash
python3 tools/build_data.py sources public/data
```

Le dossier `sources/` (non versionné) doit contenir `Lexique383.tsv` et `thes_fr.dat` ; le format des fichiers produits est décrit en tête du script.

## Sources et licences des données

- Dictionnaire phonétique : [Lexique 3.83](http://www.lexique.org) (New, Pallier, Brysbaert & Ferrand), licence CC BY-SA 4.0. `public/data/lexique.txt` en est dérivé et reste sous cette licence.
- Synonymes : thésaurus français de LibreOffice (Dicollecte), licence MPL 2.0.

La prononciation des mots absents du dictionnaire (argot récent, noms propres) est estimée par règles et peut se tromper. Les liaisons ne sont pas comptées.
