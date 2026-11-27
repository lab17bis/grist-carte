# Journal des modifications

Les adresses `/v1/` ne changent pas : chaque version ajoute ou corrige, sans retirer ce qui existe.

## 2026-11-27 (cohérence de la barre de réglages)

### Corrigé

- Le bouton Enregistrer est aligné sur la barre d'onglets, les onglets sont centrés et la pastille « Enregistré / Non enregistré » reste visible sur toutes les pages.

## 2026-11-26 (tables déjà présentes dans le document)

### Ajouté
- Le panneau signale quand aucune colonne de position n'est associée (Latitude et Longitude, ou Adresse), ou quand une seule des deux coordonnées l'est.

## 2026-11-26 (style commun de configuration)

### Corrigé
- Configuration : sur l'onglet de l'outil, le style commun masquait par erreur tout champ dont l'identifiant finit par « -etat » (dans grist-projet : le filtre « État » de la banque et la liste « État » du formulaire de projet). Seul le badge « Enregistré » de la barre est maintenant masqué. Rien à refaire : rechargez la page.

## 2026-11-25 (mention de conception)

### Ajouté
- Mention discrète en pied de page, sur l'outil comme sur ses pages publiques : « Widget conçu par le Lab 17 bis, le laboratoire d'innovation publique de l'académie de Reims ».

## 2026-11-25 (aperçu réel)

### Amélioré
- Onglet « Aperçu » de la configuration : il montre maintenant la carte elle-même, entre l'en-tête et le pied de page, au lieu d'un exemple fixe. Les réglages en cours de saisie, même non enregistrés, s'appliquent le temps de l'aperçu ; en quittant l'onglet, l'outil revient à ses réglages enregistrés.
- Carte : le fond de carte est recalé et recadré sur les points à l'entrée et à la sortie de l'aperçu (sinon les tuiles s'affichaient décalées).
- Dans l'aperçu, l'outil est réellement actif : ce que vous y faites s'applique au document. Un message le rappelle.

## 2026-11-25 (audit de sécurité)

### Sécurité
- Les liens venant des données ou des réglages sont vérifiés par le navigateur lui-même : une adresse déguisée (« java⇥script: » avec tabulation, retour à la ligne ou caractère de contrôle) n'est plus acceptée. Elle permettait, sur le portail, d'exécuter du script au clic depuis une adresse fabriquée.
- Politique de sécurité de contenu stricte : seuls les scripts du site, l'API Grist et les scripts de la page connus par leur empreinte peuvent s'exécuter. L'évaluation de texte (« unsafe-eval ») reste permise : l'API officielle de Grist en a besoin (sans elle, les widgets restaient bloqués sur « Chargement… » dans Grist le 25/11 au matin). Un script injecté (lien javascript:, attribut onerror…) est bloqué même si un filtre le laissait passer.
- Page publique : message clair si le document Grist est injoignable (au lieu de « Failed to fetch »).

## 2026-11-24 (durcissement)

### Sécurité
- Les pages ajoutent une politique de sécurité de contenu minimale (pas d'objets embarqués, pas de balise base).
- Les pages publiques n'acceptent plus qu'un lien de document Grist en https (http seulement pour localhost, en développement).

### Corrigé
- Page publique : le message « adresse sans coordonnées… » destiné aux personnes qui administrent n'est plus affiché aux visiteuses et visiteurs.

## 2026-11-24 (message de lecture publique)

### Corrigé
- Page publique : quand une table est masquée par les règles d'accès du document, le message nomme la table et explique la cause (erreur 403), au lieu de demander si le document est partagé. Comportement vérifié sur un vrai document Grist : une table refusée au public répond 403, une colonne refusée disparaît des lignes, les personnes connectées gardent leurs droits.

## 2026-11-24 (règles d'accès)

### Corrigé
- Page publique : une table ou une colonne masquée par les règles d'accès du document (par exemple les adresses de courriel) n'empêche plus d'afficher le reste de la page.

### Ajouté
- Documentation de la page publique (README) : réglages, ce qui est lu, ce qui reste caché, règles d'accès à poser.

## 2026-11-24 (aperçu des puces)

### Corrigé
- Onglet Réglages : l'aperçu de la puce se met de nouveau à jour dès qu'on change la couleur ou l'icône d'un type.

## 2026-11-24 (page publique)

### Ajouté
- Page publique en lecture seule : la carte, la liste des points, la recherche, les fiches et les liens. L'adresse `index.html?public=1&doc=<lien du document Grist>&table=<table>` affiche l'outil en pleine page, sans compte Grist, avec l'en-tête et le pied de page DSFR configurés ; aucune commande d'écriture n'est proposée.
- Onglet Publication : saisissez le lien du document Grist partagé en lecture publique, l'outil construit le lien de la page publique (réglages et association des colonnes compris), à copier ou à ouvrir. Le lien du document est enregistré avec les réglages.
- Option `integre=1` : la page s'affiche sans en-tête ni pied propres, pour être intégrée dans un autre site.
- Module commun `commun/grist-public.js` (et `.css`) : lit le document par l'API REST de Grist, en lecture seule.

## 2026-11-24 (documentation)

### Modifié
- Documentation : l'outil de consultation s'appelle désormais `grist-consultation` (ancien nom `grist-decision`).

## 2026-11-24 (barre d'onglets permanente)

### Modifié
- Le widget s'ouvre désormais sur une barre d'onglets, comme le catalogue et le questionnaire : *Carte*, puis les onglets de réglages, En-tête et pied, Aperçu, Publication. L'outil lui-même est le premier onglet.
- Le bouton « Configurer » laisse la place à la barre d'onglets ; les anciens liens et boutons « Réglages » restent actifs et ouvrent l'onglet Réglages.
- L'enregistrement des réglages reste dans la colonne de configuration existante : rien à migrer.

## 2026-11-24

### Ajouté
- Bouton « Configurer » en bas du panneau : ouvre une page de configuration pleine largeur, en quatre onglets (Réglages, En-tête et pied, Aperçu, Publication). Le bouton « Réglages » du panneau et « Ouvrir la configuration » de Grist restent actifs.
- Module commun `commun/configuration.js` et `commun/configuration.css`, partagé avec les autres widgets de la famille.
- Onglet En-tête et pied : l'en-tête et le pied de page de l'outil se règlent désormais ici (ils n'avaient pas d'éditeur).
- Onglet Aperçu : l'en-tête et le pied de page tels qu'ils seront affichés, avec les réglages en cours, même non enregistrés.
- Onglet Publication : explique comment inviter l'équipe ou partager le document par lien public, et donne l'adresse du widget à copier.

### Modifié
- Les réglages existants (titre, regroupement, liste, puces, liens) sont conservés tels quels, dans les options du widget.
- Correctif : un en-tête modifié plusieurs fois de suite est maintenant bien réappliqué.

## Versions antérieures

Voir l'historique des commits.
