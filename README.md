# grist-carte

> **Widget pour Grist, au Système de design de l'État (DSFR).** Il affiche les lignes d'une table Grist sur une carte interactive au fond de l'IGN : un clic sur un point ouvre sa fiche, la légende sert de filtre, et chaque type de point a sa propre puce (couleur, icône ou logo).

Il fonctionne sur **n'importe quelle table** : on associe ses colonnes dans le panneau de Grist. Tout se règle dans Grist, sans toucher au code. Le dépôt ne contient que le code : aucune donnée réelle.

## À quoi ça sert

| Fonction | Détail |
| --- | --- |
| **Situer** | Établissements, services, partenaires, lieux d'un événement, sites d'un projet : chaque ligne avec une latitude et une longitude devient un point |
| **Présenter** | Fiche de chaque point : image ou logo, type, présentation, adresse, courriel, téléphone, lien, autres colonnes au choix, acteurs liés |
| **Filtrer** | Légende cliquable par type, recherche plein texte, liste des points (alternative accessible à la carte), regroupement des points proches |
| **Personnaliser** | Pour chaque type : couleur du DSFR et icône du DSFR, ou logo de la ligne comme puce. Une colonne `Couleur` ou `Icone` l'emporte pour sa ligne |
| **Placer des adresses** | Les lignes qui ont une adresse sans coordonnées se placent en un clic avec le service de géocodage de l'IGN ; les coordonnées sont écrites dans la table |
| **Relier** | Si le document contient une table de liens (`Liens`), les liens entre points sont tracés sur la carte (épaisseur selon la force, pointillés pour un lien à sens unique) |
| **Synchroniser** | Cliquer sur un point sélectionne la ligne dans Grist, et inversement : la carte se lie aux autres vues de la page |

Fonds de carte : **Plan IGN** (par défaut) et **photographies aériennes IGN**, servis par la Géoplateforme de l'IGN, ou OpenStreetMap.

Démonstration avec des données fictives (rien n'est enregistré) : <https://lab17bis.github.io/grist-carte/v1/>

## Le brancher en 3 minutes

1. **Ouvrir le document Grist** qui contient la table à cartographier, avec au moins une colonne de nom, et des colonnes `Latitude` et `Longitude` (nombres) ou une colonne d'adresse.
2. **Ajouter le widget** : *Ajouter › Ajouter un widget à la page › Personnalisé*, sur cette table. Dans le panneau de droite, choisissez *URL personnalisée*, saisissez `https://lab17bis.github.io/grist-carte/v1/` et donnez l'**accès complet au document** (pour lire la table de liens et écrire les coordonnées).
3. **Associer les colonnes** dans le même panneau : *Nom* est obligatoire ; *Latitude*, *Longitude*, *Adresse*, *Type*, *Présentation*, *Image ou logo*, *Lien*, *Courriel*, *Téléphone*, *Couleur*, *Icône* et *Autres informations* sont facultatives.

Si la table n'a que des adresses, créez deux colonnes numériques `Latitude` et `Longitude`, associez-les, puis cliquez sur *Placer ces adresses* dans le widget.

## Le régler

Le bouton *Réglages* en bas du panneau (ou *Ouvrir la configuration* dans Grist) permet de régler : le titre, le regroupement des points proches, l'affichage de la liste, le logo comme puce, la couleur et l'icône de chaque type, la table de liens. Les réglages sont enregistrés **avec le widget**, dans la vue : deux cartes de la même table peuvent avoir des réglages différents. Le fond de carte et l'affichage des liens choisis dans le panneau sont aussi retenus.

| Colonne associée | Valeurs reconnues |
| --- | --- |
| *Couleur* | Nom d'une couleur du DSFR (`blue-france`, `green-menthe`, `Menthe`…) ou code `#rrggbb` |
| *Icône* | Nom d'une icône proposée dans les réglages (`school`, `community`, `government`, `heart`…) |
| *Image ou logo* | Pièce jointe Grist ou adresse d'une image |
| *Lien* | Adresse commençant par `https://` |

**Table de liens** (facultative, partagée avec grist-graphe) : `De` et `Vers` contiennent les noms de deux points (ou des références vers la table de la carte) ; `Type`, `Force` (1 à 3) et `Sens` (*Réciproque* ou *À sens unique*) sont facultatives.

## Le reprendre et l'adapter

- **L'utiliser tel quel** : ajoutez le widget dans Grist. Aucune installation n'est nécessaire.
- **L'héberger chez vous** : copiez le dépôt (*Fork*), activez GitHub Pages ou déposez les fichiers sur un serveur web statique, puis changez l'adresse du widget dans Grist. Aucune compilation.
- **Modifier le code** :

| Dossier ou fichier | Rôle |
| --- | --- |
| `v1/` | Version stable figée, servie à l'adresse `…/v1/`. Ne pas modifier à la main. |
| `outils/figer-version.sh` | Copie la version en cours dans `vN/`. |
| `index.html`, `js/app.js`, `css/app.css` | L'application : carte, panneau (liste, fiche, réglages), géocodage |
| `commun/` | En-tête et pied de page configurables, communs aux outils `grist-*` |
| `exemples/` | Jeu d'exemple inventé (`demo.json`) et logos fictifs |
| `tests/` | Tests automatisés de l'interface : `python3 tests/test_carte.py` (Playwright, fond de carte et géocodage simulés), et fonctionnement dans Grist avec une API simulée : `python3 tests/test_dans_grist.py` |
| `vendor/` | DSFR et Leaflet 1.9.4 (avec Leaflet.markercluster 1.5.3), embarqués |

## Fonctionnement et sécurité

- Le widget lit la table avec les droits de la personne connectée. Il n'écrit que les coordonnées trouvées par le géocodage, et seulement à la demande.
- **Services extérieurs** : les tuiles du fond de carte viennent de la Géoplateforme de l'IGN (ou d'OpenStreetMap si vous le choisissez). Le géocodage envoie **uniquement les adresses** au service de l'IGN, à la demande. Aucune autre donnée ne quitte le document.
- Ne cartographiez pas le domicile de personnes : la carte est faite pour des lieux et des structures.

## Limites

- Le géocodage traite les adresses une par une (quelques centaines au plus en une fois). Vérifiez les résultats : une adresse incomplète peut être placée au centre de la commune.
- Les liens tracés relient des points de la même carte ; un lien vers une personne ou une structure sans coordonnées n'apparaît pas.
- Aucun audit RGAA n'a été mené. La liste des points et les fiches sont l'alternative accessible à la carte.

## Version stable et version en cours

Dans Grist, utilisez l'adresse de la **version stable** : `https://lab17bis.github.io/grist-carte/v1/`. Elle ne change que pour corriger un défaut, sans toucher aux tables ni aux réglages. Une évolution qui les modifie paraît sous une nouvelle adresse (`v2/`) : les documents déjà en service restent sur `v1/` tant que vous ne changez pas l'adresse du widget.

L'adresse sans numéro (`https://lab17bis.github.io/grist-carte/`) suit la version en cours de développement. Elle sert à essayer les nouveautés ; ne l'utilisez pas pour un document en service.

Pour figer une nouvelle version stable après des tests réussis : `sh outils/figer-version.sh 1` (ou `2` pour une version qui change les tables), puis publiez le dépôt.

## Données partagées avec les autres outils

Plusieurs outils de la même famille peuvent travailler dans un même document Grist. Ils suivent une règle commune pour ne pas dupliquer les données :

- **Une seule table `Personnes`** par document. Colonne commune : `Nom`. Colonnes facultatives reconnues par tous : `Email` et `Structure` (référence à `Structures`). Un outil lit cette table si elle existe et la crée seulement si elle manque. Il n'y ajoute que ses propres colonnes.
- **Une seule table `Structures`** pour les équipes, services ou établissements : `Nom`, `Sigle`, `Type`, `Parent` (structure de rattachement).
- **Aucun outil ne supprime ni ne renomme** une table ou une colonne qu'il n'a pas créée.
- **Les autres tables portent des noms propres à chaque outil**, pour éviter les collisions (par exemple `Actions` pour grist-projet, `Actions_reunion` pour grist-carte). Les réglages sont rangés dans la description d'une colonne technique propre à l'outil (`Config_…`).
- **Identifier la personne connectée** : un widget ne connaît pas l'adresse de la personne connectée. Les colonnes « créé par » utilisent une formule `user.Email` calculée à la création. Seul un outil qui doit relier la personne connectée à sa fiche crée la table `Comptes`.

Ce que fait cet outil : il ne crée aucune table. Il s'affiche sur la table de votre choix, par exemple `Structures`. Il lit la table de liens `Liens` (colonnes `De`, `Vers`, `Type`, `Force`, `Sens`), partagée avec [grist-graphe](https://github.com/lab17bis/grist-graphe), si elle existe.

## Espaces clés en main

Ce widget est assemblé dans [espace-communaute](https://github.com/lab17bis/espace-communaute) : la carte des structures de la communauté et de leurs liens (page *Carte des structures*). Il s'ajoute à tout document qui contient des lieux ou des structures avec une adresse.

## Autres outils de la même famille

- [grist-questionnaire](https://github.com/lab17bis/grist-questionnaire) : questionnaires au DSFR avec logique conditionnelle.
- [grist-catalogue](https://github.com/lab17bis/grist-catalogue) : catalogue public de fiches au DSFR.
- [grist-graphique](https://github.com/lab17bis/grist-graphique) : tableaux de bord et graphiques au DSFR.
- [grist-projet](https://github.com/lab17bis/grist-projet) : espace d'équipe pour gérer des projets.
- [grist-reunion](https://github.com/lab17bis/grist-reunion) : réunions : ordre du jour, séance, compte rendu et suivi des actions.
- [grist-management](https://github.com/lab17bis/grist-management) : écran de management visuel d'équipe.
- [grist-decision](https://github.com/lab17bis/grist-decision) : consultations : boîte à idées, valorisation des réalisations, votes et suites données.
- [grist-graphe](https://github.com/lab17bis/grist-graphe) : cartographie des acteurs et de leurs liens.

Les widgets qui ont un en-tête et un pied de page partagent les mêmes réglages.

## Écosystème

- **[Grist](https://grist.numerique.gouv.fr)** : tableur-base de données libre ([gristlabs/grist-core](https://github.com/gristlabs/grist-core)), proposé aux agents publics par la [DINUM](https://www.numerique.gouv.fr/) dans [La Suite numérique](https://lasuite.numerique.gouv.fr/).
- **[Système de design de l'État (DSFR)](https://www.systeme-de-design.gouv.fr/)** ([GouvernementFR/dsfr](https://github.com/GouvernementFR/dsfr)). Son usage est réservé aux sites des services de l'État.
- **[Communauté Grist francophone](https://forum.grist.libre.sh/)**.

## Mots-clés

Grist, widget Grist, carte, cartographie, carte interactive, Leaflet, IGN, Géoplateforme, Plan IGN, géocodage, adresse, lieux, établissements, structures, partenaires, annuaire cartographique, DSFR, Système de design de l'État, La Suite numérique, DINUM, service public, logiciel libre.

## Licence

Code sous licence MIT (voir `LICENSE`). Le DSFR embarqué dans `vendor/dsfr/` et Leaflet dans `vendor/leaflet/` (licence BSD-2, extension de regroupement sous licence MIT) conservent leur propre licence. Réutilisation, adaptation et contributions bienvenues.

Conçu par le Lab 17 bis, laboratoire d'innovation publique de l'académie de Reims. Contact : <lab17bis@ac-reims.fr>
