# Journal des modifications

Les adresses `/v1/` ne changent pas : chaque version ajoute ou corrige, sans retirer ce qui existe.

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
