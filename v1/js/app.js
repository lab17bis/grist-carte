/*
 * grist-carte – carte interactive des lignes d'une table Grist, au DSFR.
 *
 * Chaque ligne qui a une latitude et une longitude devient un point sur un fond de carte
 * de l'IGN (Géoplateforme). Un clic ouvre sa fiche : présentation, coordonnées, lien, image,
 * informations complémentaires et acteurs liés. Les points se filtrent par type (légende
 * cliquable) et par recherche ; leur puce (couleur, icône ou image) se règle par type.
 * Les adresses sans coordonnées se placent avec le service de géocodage de l'IGN.
 * Si le document contient une table de liens (par exemple `Liens`, partagée avec grist-graphe),
 * les liens entre points peuvent être tracés sur la carte.
 *
 * Les colonnes sont associées dans le panneau de Grist (« colonnes du widget ») : le widget
 * fonctionne sur n'importe quelle table. Hors de Grist, il affiche des données fictives.
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Référentiels
  // ---------------------------------------------------------------------------

  // Couleurs illustratives du DSFR (teinte « main »), plus le bleu France et le rouge Marianne.
  var COULEURS = [
    ['blue-france', 'Bleu France', '#000091'], ['red-marianne', 'Rouge Marianne', '#e1000f'],
    ['blue-ecume', 'Écume', '#465f9d'], ['blue-cumulus', 'Cumulus', '#417dc4'], ['green-archipel', 'Archipel', '#009099'],
    ['green-menthe', 'Menthe', '#009081'], ['green-emeraude', 'Émeraude', '#00a95f'], ['green-bourgeon', 'Bourgeon', '#68a532'],
    ['green-tilleul-verveine', 'Tilleul verveine', '#b7a73f'], ['yellow-tournesol', 'Tournesol', '#c8aa39'], ['yellow-moutarde', 'Moutarde', '#c3992a'],
    ['orange-terre-battue', 'Terre battue', '#e4794a'], ['pink-tuile', 'Tuile', '#ce614a'], ['pink-macaron', 'Macaron', '#e18b76'],
    ['purple-glycine', 'Glycine', '#a558a0'], ['brown-caramel', 'Caramel', '#c08c65'], ['brown-opera', 'Opéra', '#bd987a'],
    ['brown-cafe-creme', 'Café crème', '#d1b781'], ['beige-gris-galet', 'Gris galet', '#aea397'], ['grey', 'Gris', '#666666']
  ];
  var ICONES = [
    ['map-pin-2', 'Repère'], ['building', 'Bâtiment'], ['building-4', 'Immeuble'], ['school', 'École'], ['government', 'Administration'],
    ['bank', 'Institution'], ['community', 'Lieu collectif'], ['home-4', 'Maison'], ['store', 'Commerce'], ['hospital', 'Santé'],
    ['stethoscope', 'Soin'], ['team', 'Équipe'], ['group', 'Groupe'], ['user', 'Personne'], ['briefcase', 'Travail'],
    ['book-2', 'Livre'], ['lightbulb', 'Idée'], ['presentation', 'Présentation'], ['microscope', 'Recherche'], ['computer', 'Numérique'],
    ['tools', 'Outils'], ['palette', 'Culture'], ['music-2', 'Musique'], ['ancient-gate', 'Patrimoine'], ['seedling', 'Nature'],
    ['leaf', 'Environnement'], ['restaurant', 'Restauration'], ['cup', 'Café'], ['bus', 'Bus'], ['train', 'Train'],
    ['calendar-event', 'Événement'], ['award', 'Distinction'], ['trophy', 'Trophée'], ['star', 'Étoile'], ['heart', 'Cœur'], ['flag', 'Drapeau']
  ];
  var FONDS = {
    plan: { libelle: 'Plan IGN', url: 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}',
      attribution: '<a href="https://www.ign.fr/" target="_blank" rel="noopener" title="IGN - nouvelle fenêtre">© IGN</a> – Géoplateforme', max: 19 },
    photos: { libelle: 'Photographies aériennes IGN', url: 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/jpeg&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}',
      attribution: '<a href="https://www.ign.fr/" target="_blank" rel="noopener" title="IGN - nouvelle fenêtre">© IGN</a> – Géoplateforme', max: 19 },
    osm: { libelle: 'OpenStreetMap', url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener" title="Licence OpenStreetMap - nouvelle fenêtre">© contributeurs OpenStreetMap</a>', max: 19 }
  };
  var GEOCODAGE = 'https://data.geopf.fr/geocodage/search';
  var CENTRE_FRANCE = [46.6, 2.4];

  var COLONNES = [
    { name: 'Nom', title: 'Nom', type: 'Any' },
    { name: 'Latitude', title: 'Latitude', type: 'Numeric', optional: true },
    { name: 'Longitude', title: 'Longitude', type: 'Numeric', optional: true },
    { name: 'Adresse', title: 'Adresse (pour placer les points)', type: 'Any', optional: true },
    { name: 'Type', title: 'Type (couleur et filtre)', type: 'Any', optional: true },
    { name: 'Description', title: 'Présentation', type: 'Any', optional: true },
    { name: 'Image', title: 'Image ou logo (adresse ou pièce jointe)', type: 'Any', optional: true },
    { name: 'Lien', title: 'Lien (site, page)', type: 'Any', optional: true },
    { name: 'Email', title: 'Courriel', type: 'Any', optional: true },
    { name: 'Telephone', title: 'Téléphone', type: 'Any', optional: true },
    { name: 'Couleur', title: 'Couleur propre à la ligne', type: 'Any', optional: true },
    { name: 'Icone', title: 'Icône propre à la ligne', type: 'Any', optional: true },
    { name: 'Details', title: 'Autres informations de la fiche', type: 'Any', optional: true, allowMultiple: true }
  ];

  var OPTIONS_DEFAUT = { titre: '', fond: 'plan', regrouper: true, liste: true, imagePuce: false, puces: {}, puceDefaut: { couleur: 'blue-france', icone: 'map-pin-2' },
    liens: { table: 'Liens', afficher: false } };

  // ---------------------------------------------------------------------------
  // État
  // ---------------------------------------------------------------------------

  var PUBLIC = !!(window.GristPublic && window.GristPublic.actif);
  var DEMO = window.self === window.top && !PUBLIC;
  var options = JSON.parse(JSON.stringify(OPTIONS_DEFAUT));
  var points = [], liens = [], mappings = {}, libellesDetails = {}, meta = { tables: [], colonnes: [], table: null };
  var etat = { vue: 'liste', selection: null, q: '', masques: {}, alerte: null, geocodage: null, brouillon: null };
  var jeton = null;
  var panneau = document.getElementById('gc-panneau');
  var carte, coucheFond, groupe, coucheLiens, marqueurs = {};

  // ---------------------------------------------------------------------------
  // Utilitaires
  // ---------------------------------------------------------------------------

  function esc(v) {
    return String(v === null || v === undefined ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function adresseSure(u) { return window.PageDSFR ? window.PageDSFR.adresseSure(u) : ''; }
  function pluriel(n, s, p) { return n + ' ' + (n > 1 ? (p || s + 's') : s); }
  // Valeur Grist lisible : référence (objet), liste de choix, date, nombre.
  function texte(v) {
    if (v === null || v === undefined) return '';
    if (v instanceof Date) return v.toLocaleDateString('fr-FR');
    if (Array.isArray(v)) return (v[0] === 'L' ? v.slice(1) : v).map(texte).filter(Boolean).join(', ');
    if (typeof v === 'object') return texte(v.Nom || v.Titre || v.Name || v.Libelle || v.name || (v.id ? '#' + v.id : ''));
    if (typeof v === 'boolean') return v ? 'Oui' : 'Non';
    return String(v);
  }
  function nombre(v) { var n = typeof v === 'number' ? v : parseFloat(String(v === null || v === undefined ? '' : v).replace(',', '.')); return isFinite(n) ? n : null; }
  function cle(t) { return String(t || '').trim().toLowerCase(); }
  function couleurHex(c) {
    if (!c) return null;
    if (/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(c)) return c;
    var t = COULEURS.filter(function (x) { return x[0] === c || cle(x[1]) === cle(c); })[0];
    return t ? t[2] : null;
  }
  function iconeValide(i) { return ICONES.some(function (x) { return x[0] === i; }) ? i : null; }
  function lignesDepuisColonnes(cols) {
    var ids = cols.id || [], cles = Object.keys(cols), res = [];
    for (var i = 0; i < ids.length; i++) { var l = {}; cles.forEach(function (k) { l[k] = cols[k][i]; }); res.push(l); }
    return res;
  }

  // Puce d'un point : couleur et icône de la ligne, sinon celles de son type, sinon celles par défaut.
  function apparence(p) {
    var t = options.puces[p.type] || {};
    return {
      couleur: couleurHex(p.couleur) || couleurHex(t.couleur) || couleurHex(options.puceDefaut.couleur) || '#000091',
      icone: iconeValide(p.icone) || iconeValide(t.icone) || iconeValide(options.puceDefaut.icone) || 'map-pin-2'
    };
  }
  function svgPuce(a, grande) {
    var w = grande ? 38 : 30, h = grande ? 50 : 40;
    return '<span class="gc-puce' + (grande ? ' gc-puce--active' : '') + '" style="--gc-couleur:' + a.couleur + ';width:' + w + 'px;height:' + h + 'px">' +
      '<svg viewBox="0 0 30 40" width="' + w + '" height="' + h + '" aria-hidden="true" focusable="false"><path d="M15 39C15 39 2 23.5 2 14.5a13 13 0 0 1 26 0C28 23.5 15 39 15 39z" fill="' + a.couleur + '" stroke="#fff" stroke-width="2"/>' +
      '<circle cx="15" cy="14.5" r="9.5" fill="#fff"/></svg><span class="gc-puce__icone fr-icon-' + a.icone + '-fill" aria-hidden="true"></span></span>';
  }
  function puceImage(p, a, grande) {
    var s = grande ? 46 : 38;
    return '<span class="gc-puce-image' + (grande ? ' gc-puce--active' : '') + '" style="--gc-couleur:' + a.couleur + ';width:' + s + 'px;height:' + s + 'px">' +
      '<img alt="" ' + (p.image.src ? 'src="' + esc(p.image.src) + '"' : 'data-piece="' + p.image.piece + '"') + '></span>';
  }
  function iconePour(p, grande) {
    var a = apparence(p), image = options.imagePuce && p.image;
    var w = image ? (grande ? 46 : 38) : (grande ? 38 : 30), h = image ? w : (grande ? 50 : 40);
    return L.divIcon({ className: 'gc-marqueur', html: image ? puceImage(p, a, grande) : svgPuce(a, grande), iconSize: [w, h], iconAnchor: image ? [w / 2, h / 2] : [w / 2, h], popupAnchor: [0, -h] });
  }

  // ---------------------------------------------------------------------------
  // Données
  // ---------------------------------------------------------------------------

  function image(v) {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'number') return { piece: v };
    if (Array.isArray(v)) { var ids = v[0] === 'L' ? v.slice(1) : v; return typeof ids[0] === 'number' ? { piece: ids[0] } : image(ids[0]); }
    var src = adresseSure(String(v));
    return src ? { src: src } : null;
  }
  function versPoint(r) {
    var lat = nombre(r.Latitude), lon = nombre(r.Longitude);
    var details = [];
    if (Array.isArray(r.Details)) {
      var cols = Array.isArray(mappings.Details) ? mappings.Details : [];
      r.Details.forEach(function (v, i) {
        var t = texte(v);
        if (t) details.push({ libelle: libellesDetails[cols[i]] || String(cols[i] || 'Information').replace(/_/g, ' '), valeur: t });
      });
    }
    return {
      id: r.id, nom: texte(r.Nom) || 'Sans nom', lat: lat, lon: lon, place: lat !== null && lon !== null && Math.abs(lat) <= 90 && Math.abs(lon) <= 180,
      adresse: texte(r.Adresse), type: texte(r.Type), description: texte(r.Description), image: image(r.Image), lien: texte(r.Lien),
      email: texte(r.Email), tel: texte(r.Telephone), couleur: texte(r.Couleur), icone: texte(r.Icone), details: details
    };
  }

  function chargerDemo() {
    return fetch('exemples/demo.json').then(function (r) { return r.json(); }).then(function (json) {
      mappings = { Details: ['Public', 'Referent'] };
      libellesDetails = { Public: 'Public accueilli', Referent: 'Référent' };
      points = json.points.map(function (l, i) { return versPoint(Object.assign({ id: i + 1 }, l, { Details: [l.Public, l.Referent] })); });
      liens = resoudreLiens(json.liens || []);
      options = Object.assign(JSON.parse(JSON.stringify(OPTIONS_DEFAUT)), json.options || {});
    });
  }

  // Les liens relient deux noms (colonnes De et Vers), ou deux lignes de la table de la carte
  // si ces colonnes sont des références vers elle.
  function resoudreLiens(lignes, refDe, refVers) {
    var parNom = {}, parId = {};
    points.forEach(function (p) { parNom[cle(p.nom)] = p; parId[p.id] = p; });
    function trouver(v, ref) {
      if (typeof v === 'number') return ref ? parId[v] : null;
      return parNom[cle(texte(v))];
    }
    return lignes.map(function (l) {
      return { de: trouver(l.De, refDe), vers: trouver(l.Vers, refVers), type: texte(l.Type), force: nombre(l.Force) || 1, sens: texte(l.Sens), note: texte(l.Note) };
    }).filter(function (l) { return l.de && l.vers && l.de !== l.vers; });
  }
  function chargerLiens() {
    if (DEMO || !options.liens || !options.liens.table) { if (!DEMO) liens = []; return Promise.resolve(); }
    var nomTable = options.liens.table;
    var t = meta.tables.filter(function (x) { return x.tableId === nomTable; })[0];
    if (!t) { liens = []; return Promise.resolve(); }
    function typeCol(c) { var x = meta.colonnes.filter(function (k) { return k.parentId === t.id && k.colId === c; })[0]; return x ? x.type : ''; }
    var refDe = typeCol('De') === 'Ref:' + meta.table, refVers = typeCol('Vers') === 'Ref:' + meta.table;
    return grist.docApi.fetchTable(nomTable).then(function (c) { liens = resoudreLiens(lignesDepuisColonnes(c), refDe, refVers); }).catch(function () { liens = []; });
  }
  function chargerMeta() {
    if (DEMO) return Promise.resolve();
    return Promise.all([grist.docApi.fetchTable('_grist_Tables'), grist.docApi.fetchTable('_grist_Tables_column'),
      grist.selectedTable && grist.selectedTable.getTableId ? grist.selectedTable.getTableId().catch(function () { return null; }) : Promise.resolve(null)])
      .then(function (m) {
        meta.tables = lignesDepuisColonnes(m[0]); meta.colonnes = lignesDepuisColonnes(m[1]); meta.table = m[2];
        var t = meta.tables.filter(function (x) { return x.tableId === meta.table; })[0];
        libellesDetails = {};
        if (t) meta.colonnes.forEach(function (c) { if (c.parentId === t.id) libellesDetails[c.colId] = c.label || c.colId; });
      }).catch(function () { /* accès réduit : les liens et libellés sont ignorés */ });
  }

  // ---------------------------------------------------------------------------
  // Carte
  // ---------------------------------------------------------------------------

  function initCarte() {
    carte = L.map('gc-carte', { zoomControl: true, attributionControl: true, minZoom: 3 }).setView(CENTRE_FRANCE, 6);
    carte.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener" title="Leaflet - nouvelle fenêtre">Leaflet</a>');
    carte.zoomControl.getContainer().querySelectorAll('a').forEach(function (a) {
      a.setAttribute('title', a.classList.contains('leaflet-control-zoom-in') ? 'Zoomer' : 'Dézoomer');
    });
    coucheLiens = L.layerGroup().addTo(carte);
    changerFond();
  }
  function changerFond() {
    var f = FONDS[options.fond] || FONDS.plan;
    if (coucheFond) carte.removeLayer(coucheFond);
    coucheFond = L.tileLayer(f.url, { attribution: f.attribution, maxZoom: f.max, crossOrigin: true }).addTo(carte);
  }
  function creerGroupe() {
    if (groupe) carte.removeLayer(groupe);
    groupe = options.regrouper ? L.markerClusterGroup({
      showCoverageOnHover: false, maxClusterRadius: 45, spiderfyOnMaxZoom: true,
      iconCreateFunction: function (g) {
        var n = g.getChildCount(), s = n < 10 ? 36 : n < 50 ? 44 : 52;
        return L.divIcon({ className: 'gc-groupe', html: '<span style="width:' + s + 'px;height:' + s + 'px">' + n + '<span class="fr-sr-only"> points</span></span>', iconSize: [s, s] });
      }
    }) : L.featureGroup();
    groupe.addTo(carte);
  }

  function visible(p) {
    if (!p.place) return false;
    if (etat.masques[p.type || '']) return false;
    if (etat.q) {
      var t = (p.nom + ' ' + p.type + ' ' + p.adresse + ' ' + p.description + ' ' + p.details.map(function (d) { return d.valeur; }).join(' ')).toLowerCase();
      if (t.indexOf(etat.q.toLowerCase()) < 0) return false;
    }
    return true;
  }

  function dessiner(ajuster) {
    creerGroupe();
    marqueurs = {};
    var vis = points.filter(visible);
    vis.forEach(function (p) {
      var m = L.marker([p.lat, p.lon], { icon: iconePour(p, etat.selection === p.id), title: p.nom, alt: p.nom, keyboard: true, riseOnHover: true, zIndexOffset: etat.selection === p.id ? 1000 : 0 });
      m.on('click', function () { selectionner(p.id, true); });
      m.bindTooltip(esc(p.nom), { direction: 'top', offset: [0, options.imagePuce && p.image ? -20 : -38] });
      groupe.addLayer(m);
      marqueurs[p.id] = m;
    });
    dessinerLiens();
    chargerImages(document.getElementById('gc-carte'));
    if (ajuster) toutAfficher();
  }
  function dessinerLiens() {
    coucheLiens.clearLayers();
    if (!options.liens || !options.liens.afficher) return;
    liens.forEach(function (l) {
      if (!visible(l.de) || !visible(l.vers)) return;
      var actif = etat.selection && (l.de.id === etat.selection || l.vers.id === etat.selection);
      L.polyline([[l.de.lat, l.de.lon], [l.vers.lat, l.vers.lon]], {
        color: actif ? '#000091' : '#6a6af4', weight: 1 + Math.min(3, l.force) * (actif ? 1.5 : 1), opacity: actif ? 0.9 : 0.45,
        dashArray: l.sens === 'À sens unique' ? '6 6' : null, interactive: false
      }).addTo(coucheLiens);
    });
  }
  function toutAfficher() {
    var vis = points.filter(visible);
    if (!vis.length) { carte.setView(CENTRE_FRANCE, 6); return; }
    if (vis.length === 1) { carte.setView([vis[0].lat, vis[0].lon], 13); return; }
    carte.fitBounds(L.latLngBounds(vis.map(function (p) { return [p.lat, p.lon]; })), { padding: [40, 40], maxZoom: 14 });
  }

  function selectionner(id, depuisCarte) {
    var ancien = etat.selection;
    etat.selection = id;
    etat.vue = id ? 'fiche' : 'liste';
    [ancien, id].forEach(function (x) {
      var m = marqueurs[x], p = point(x);
      if (m && p) { m.setIcon(iconePour(p, x === id)); m.setZIndexOffset(x === id ? 1000 : 0); }
    });
    chargerImages(document.getElementById('gc-carte'));
    dessinerLiens();
    var p = point(id);
    if (p && p.place && marqueurs[id]) {
      if (groupe.zoomToShowLayer && options.regrouper) groupe.zoomToShowLayer(marqueurs[id], function () {});
      else if (!depuisCarte) carte.panTo([p.lat, p.lon]);
    }
    if (!DEMO && id && depuisCarte !== 'grist') { try { grist.setCursorPos({ rowId: id }); } catch (e) { /* liaison facultative */ } }
    rendrePanneau();
    if (depuisCarte === true) { var t = document.getElementById('gc-fiche-titre'); if (t) t.focus(); }
  }
  function point(id) { return points.filter(function (p) { return p.id === id; })[0]; }

  // ---------------------------------------------------------------------------
  // Panneau : liste, fiche, réglages
  // ---------------------------------------------------------------------------

  function blocAlerte() {
    if (!etat.alerte) return '';
    return '<div class="fr-alert fr-alert--sm fr-alert--' + etat.alerte.type + ' gc-alerte" role="' + (etat.alerte.type === 'error' ? 'alert' : 'status') + '"><p>' + esc(etat.alerte.texte) + '</p></div>';
  }
  function typesPresents() {
    var t = {};
    points.forEach(function (p) { var k = p.type || ''; t[k] = (t[k] || 0) + (p.place ? 1 : 0); });
    return Object.keys(t).sort(function (a, b) { return a === '' ? 1 : b === '' ? -1 : a.localeCompare(b, 'fr'); }).map(function (k) { return [k, t[k]]; });
  }
  function miniPuce(type) {
    var a = apparence({ type: type });
    return '<span class="gc-mini" style="--gc-couleur:' + a.couleur + '" aria-hidden="true"><span class="fr-icon-' + a.icone + '-fill"></span></span>';
  }

  function vueListe() {
    var types = typesPresents(), vis = points.filter(visible), sansCoord = points.filter(function (p) { return !p.place; });
    var aPlacer = sansCoord.filter(function (p) { return p.adresse; });
    var h = (options.titre ? '<h1 class="fr-h5 gc-titre">' + esc(options.titre) + '</h1>' : '<h1 class="fr-sr-only">Carte</h1>') + blocAlerte() +
      '<div class="fr-search-bar gc-recherche" role="search"><label class="fr-label" for="gc-q">Rechercher sur la carte</label>' +
      '<input class="fr-input" type="search" id="gc-q" placeholder="Rechercher" value="' + esc(etat.q) + '">' +
      '<button type="button" class="fr-btn" title="Rechercher" data-action="rechercher">Rechercher</button></div>';
    if (types.length > 1 || (types.length === 1 && types[0][0])) {
      h += '<fieldset class="fr-fieldset gc-legende"><legend class="fr-fieldset__legend fr-text--md">Types</legend>' +
        types.map(function (t, i) {
          return '<div class="fr-fieldset__element"><div class="fr-checkbox-group fr-checkbox-group--sm"><input type="checkbox" id="gc-t' + i + '" data-type="' + esc(t[0]) + '"' + (etat.masques[t[0]] ? '' : ' checked') + '>' +
            '<label class="fr-label" for="gc-t' + i + '">' + miniPuce(t[0]) + esc(t[0] || 'Sans type') + ' <span class="gc-compte">(' + t[1] + ')</span></label></div></div>';
        }).join('') + '</fieldset>';
    }
    h += '<div class="gc-outils">' +
      '<div class="fr-select-group"><label class="fr-label" for="gc-fond">Fond de carte</label><select class="fr-select fr-select--sm" id="gc-fond">' +
      Object.keys(FONDS).map(function (k) { return '<option value="' + k + '"' + (k === options.fond ? ' selected' : '') + '>' + FONDS[k].libelle + '</option>'; }).join('') + '</select></div>' +
      (liens.length ? '<div class="fr-checkbox-group fr-checkbox-group--sm"><input type="checkbox" id="gc-liens"' + (options.liens.afficher ? ' checked' : '') + '><label class="fr-label" for="gc-liens">Afficher les liens (' + liens.length + ')</label></div>' : '') +
      '<button type="button" class="fr-btn fr-btn--sm fr-btn--tertiary fr-icon-fullscreen-line fr-btn--icon-left" data-action="tout-afficher">Tout afficher</button></div>';
    if (aPlacer.length && !PUBLIC) {
      h += '<div class="gc-geo"><p class="fr-text--sm fr-mb-1v"><strong>' + pluriel(aPlacer.length, 'adresse') + ' sans coordonnées.</strong></p>' +
        (peutGeocoder() ? '<button type="button" class="fr-btn fr-btn--sm fr-mt-1w" data-action="geocoder"' + (etat.geocodage ? ' disabled' : '') + '>' + (etat.geocodage ? 'Placement en cours… ' + etat.geocodage : 'Placer ces adresses') + '</button>' +
          '<p class="fr-text--xs fr-mt-1w fr-mb-0">Avec le service de géocodage de l\'IGN. Seules les adresses sont envoyées.</p>' :
          '<p class="fr-text--xs fr-mb-0">Associez les colonnes Adresse, Latitude et Longitude du widget pour les placer.</p>') + '</div>';
    }
    if (!DEMO && !PUBLIC && !(mappings.Latitude && mappings.Longitude) && !mappings.Adresse) {
      h += '<div class="fr-alert fr-alert--info fr-alert--sm fr-mt-2w"><p>Aucune colonne de position n\'est associée : associez Latitude et Longitude, ou Adresse, dans le panneau du widget à droite.</p></div>';
    } else if (!DEMO && !PUBLIC && (mappings.Latitude ? !mappings.Longitude : mappings.Longitude)) {
      h += '<div class="fr-alert fr-alert--info fr-alert--sm fr-mt-2w"><p>Associez à la fois Latitude et Longitude : une seule des deux ne suffit pas pour placer un point.</p></div>';
    }
    h += '<p class="gc-compte gc-resume" aria-live="polite">' + pluriel(vis.length, 'point') + ' affiché' + (vis.length > 1 ? 's' : '') +
      (sansCoord.length ? ' · ' + pluriel(sansCoord.length, 'ligne') + ' sans coordonnées' : '') + '</p>';
    if (options.liste) {
      h += '<ul class="gc-liste">' + vis.slice().sort(function (a, b) { return a.nom.localeCompare(b.nom, 'fr'); }).map(function (p) {
        return '<li><button type="button" class="gc-liste__bouton" data-point="' + p.id + '">' + miniPuce(p.type) + '<span><span class="gc-liste__nom">' + esc(p.nom) + '</span>' +
          (p.adresse || p.type ? '<span class="gc-liste__info">' + esc([p.type, p.adresse].filter(Boolean).join(' · ')) + '</span>' : '') + '</span></button></li>';
      }).join('') + '</ul>';
    }
    return h;
  }
  function peutGeocoder() { if (PUBLIC) return false; return DEMO || (mappings.Adresse && mappings.Latitude && mappings.Longitude); }

  function vueFiche(p) {
    var a = apparence(p), lien = adresseSure(p.lien);
    var voisins = liens.filter(function (l) { return l.de === p || l.vers === p; });
    var h = '<p class="gc-retour"><button type="button" class="fr-btn fr-btn--sm fr-btn--tertiary-no-outline fr-icon-arrow-left-line fr-btn--icon-left" data-action="retour">Retour à la liste</button></p>' +
      '<article class="gc-fiche">' +
      (p.image ? '<div class="gc-fiche__image"><img class="fr-responsive-img" alt="" ' + (p.image.src ? 'src="' + esc(p.image.src) + '"' : 'data-piece="' + p.image.piece + '"') + '></div>' : '') +
      (p.type ? '<p class="gc-fiche__type"><span class="gc-mini" style="--gc-couleur:' + a.couleur + '" aria-hidden="true"><span class="fr-icon-' + a.icone + '-fill"></span></span>' + esc(p.type) + '</p>' : '') +
      '<h2 class="fr-h5 gc-fiche__titre" id="gc-fiche-titre" tabindex="-1">' + esc(p.nom) + '</h2>' +
      (p.description ? '<p class="fr-text--sm gc-fiche__texte">' + esc(p.description).replace(/\n/g, '<br>') + '</p>' : '') +
      '<ul class="gc-coord">' +
      (p.adresse ? '<li><span class="fr-icon-map-pin-2-line fr-icon--sm" aria-hidden="true"></span><span class="fr-sr-only">Adresse : </span>' + esc(p.adresse) + '</li>' : '') +
      (p.email ? '<li><span class="fr-icon-mail-line fr-icon--sm" aria-hidden="true"></span><a href="mailto:' + esc(p.email) + '">' + esc(p.email) + '</a></li>' : '') +
      (p.tel ? '<li><span class="fr-icon-phone-line fr-icon--sm" aria-hidden="true"></span><a href="tel:' + esc(p.tel.replace(/[^0-9+]/g, '')) + '">' + esc(p.tel) + '</a></li>' : '') +
      (lien ? '<li><span class="fr-icon-global-line fr-icon--sm" aria-hidden="true"></span><a href="' + esc(lien) + '" target="_blank" rel="noopener" title="' + esc(p.nom) + ' - nouvelle fenêtre">Site ou page</a></li>' : '') +
      '</ul>' +
      (p.details.length ? '<dl class="gc-details">' + p.details.map(function (d) { return '<dt>' + esc(d.libelle) + '</dt><dd>' + esc(d.valeur) + '</dd>'; }).join('') + '</dl>' : '') +
      (voisins.length ? '<h3 class="fr-h6 fr-mt-2w">En lien avec</h3><ul class="gc-voisins">' + voisins.map(function (l) {
        var autre = l.de === p ? l.vers : l.de;
        return '<li><button type="button" class="fr-link fr-text--sm" data-point="' + autre.id + '">' + esc(autre.nom) + '</button>' + (l.type ? ' <span class="gc-compte">' + esc(l.type) + (l.sens === 'À sens unique' ? (l.de === p ? ' →' : ' ←') : '') + '</span>' : '') + '</li>';
      }).join('') + '</ul>' : '') +
      (!p.place ? '<p class="fr-text--sm gc-compte">Ce point n\'a pas de coordonnées : il n\'apparaît pas sur la carte.</p>' : '') +
      '</article>';
    return h;
  }

  function vueReglages() {
    var b = etat.brouillon = etat.brouillon || JSON.parse(JSON.stringify(options));
    var types = typesPresents().map(function (t) { return t[0]; }).filter(Boolean);
    var tables = meta.tables.filter(function (t) { return !/^_grist/.test(t.tableId) && !/^GristHidden/.test(t.tableId); }).map(function (t) { return t.tableId; });
    function selCouleur(id, val, chemin) {
      return '<div class="fr-select-group"><label class="fr-label" for="' + id + '">Couleur</label><select class="fr-select fr-select--sm" id="' + id + '" data-reglage="' + chemin + '">' +
        COULEURS.map(function (c) { return '<option value="' + c[0] + '"' + (c[0] === val ? ' selected' : '') + '>' + c[1] + '</option>'; }).join('') + '</select></div>';
    }
    function selIcone(id, val, chemin) {
      return '<div class="fr-select-group"><label class="fr-label" for="' + id + '">Icône</label><select class="fr-select fr-select--sm" id="' + id + '" data-reglage="' + chemin + '">' +
        ICONES.map(function (c) { return '<option value="' + c[0] + '"' + (c[0] === val ? ' selected' : '') + '>' + c[1] + '</option>'; }).join('') + '</select></div>';
    }
    function ligne(titre, val, chemin, i) {
      var a = { couleur: couleurHex(val.couleur) || '#000091', icone: iconeValide(val.icone) || 'map-pin-2' };
      return '<div class="gc-reglage-puce"><p class="gc-reglage-puce__titre">' + svgPuce(a) + '<strong>' + esc(titre) + '</strong></p><div class="gc-reglage-puce__choix">' +
        selCouleur('rg-c' + i, val.couleur, chemin + '.couleur') + selIcone('rg-i' + i, val.icone, chemin + '.icone') + '</div></div>';
    }
    var h = '<p class="gc-retour"><button type="button" class="fr-btn fr-btn--sm fr-btn--tertiary-no-outline fr-icon-arrow-left-line fr-btn--icon-left" data-action="retour">Retour à la carte</button></p>' +
      '<h2 class="fr-h5">Réglages de la carte</h2>' + blocAlerte() +
      (DEMO ? '<p class="fr-text--sm">Démonstration : essayez les réglages, ils ne sont pas enregistrés.</p>' : '<p class="fr-text--sm">Les réglages sont propres à cette vue. Ils sont enregistrés avec le widget dans le document.</p>') +
      '<div class="fr-input-group"><label class="fr-label" for="rg-titre">Titre affiché au-dessus de la liste</label><input class="fr-input" id="rg-titre" data-reglage="titre" value="' + esc(b.titre) + '"></div>' +
      '<div class="fr-checkbox-group fr-checkbox-group--sm"><input type="checkbox" id="rg-regrouper" data-reglage="regrouper"' + (b.regrouper ? ' checked' : '') + '><label class="fr-label" for="rg-regrouper">Regrouper les points proches</label></div>' +
      '<div class="fr-checkbox-group fr-checkbox-group--sm"><input type="checkbox" id="rg-liste" data-reglage="liste"' + (b.liste ? ' checked' : '') + '><label class="fr-label" for="rg-liste">Afficher la liste des points</label></div>' +
      '<div class="fr-checkbox-group fr-checkbox-group--sm"><input type="checkbox" id="rg-image" data-reglage="imagePuce"' + (b.imagePuce ? ' checked' : '') + '><label class="fr-label" for="rg-image">Utiliser l\'image ou le logo comme puce<span class="fr-hint-text">Pour les lignes qui en ont une. Le contour prend la couleur du type.</span></label></div>' +
      '<h3 class="fr-h6 fr-mt-3w">Puces</h3><p class="fr-text--xs">Couleurs du Système de design de l\'État. Une colonne « Couleur » ou « Icône » associée au widget l\'emporte pour sa ligne (nom de couleur, code #rrggbb ou nom d\'icône).</p>' +
      types.map(function (t, i) { b.puces[t] = b.puces[t] || {}; return ligne(t, { couleur: b.puces[t].couleur || b.puceDefaut.couleur, icone: b.puces[t].icone || b.puceDefaut.icone }, 'puces.' + i, i); }).join('') +
      ligne(types.length ? 'Autres points' : 'Tous les points', b.puceDefaut, 'puceDefaut', 'd') +
      '<h3 class="fr-h6 fr-mt-3w">Liens entre points</h3>' +
      (DEMO ? '<p class="fr-text--xs">Table <code>Liens</code> de l\'exemple.</p>' :
        '<div class="fr-select-group"><label class="fr-label" for="rg-liens">Table des liens<span class="fr-hint-text">Colonnes De et Vers (noms des points ou références), et facultativement Type, Force, Sens.</span></label><select class="fr-select fr-select--sm" id="rg-liens" data-reglage="liens.table"><option value="">Aucune</option>' +
          tables.map(function (t) { return '<option' + (t === b.liens.table ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('') + '</select></div>') +
      '<ul class="fr-btns-group fr-btns-group--inline-sm fr-btns-group--sm fr-mt-3w"><li><button type="button" class="fr-btn" data-action="enregistrer">Enregistrer</button></li><li><button type="button" class="fr-btn fr-btn--secondary" data-action="annuler">Annuler</button></li></ul>';
    etat.typesReglages = types;
    return h;
  }

  function rendrePanneau() {
    var p = etat.vue === 'fiche' ? point(etat.selection) : null;
    panneau.innerHTML = etat.vue === 'reglages' ? vueReglages() : p ? vueFiche(p) : vueListe();
    chargerImages(panneau);
  }

  // ---------------------------------------------------------------------------
  // Images en pièce jointe : lues avec un jeton d'accès de Grist
  // ---------------------------------------------------------------------------

  function chargerImages(racine) {
    var imgs = racine ? racine.querySelectorAll('img[data-piece]') : [];
    if (!imgs.length || DEMO) return;
    var obtenir = jeton && jeton.expire > Date.now() ? Promise.resolve(jeton) :
      grist.docApi.getAccessToken({ readOnly: true }).then(function (t) { jeton = { token: t.token, baseUrl: t.baseUrl, expire: Date.now() + (t.ttlMsecs || 300000) - 30000 }; return jeton; });
    obtenir.then(function (j) {
      Array.prototype.forEach.call(imgs, function (img) {
        img.src = j.baseUrl + '/attachments/' + img.getAttribute('data-piece') + '/download?auth=' + encodeURIComponent(j.token);
        img.removeAttribute('data-piece');
      });
    }).catch(function () { /* images indisponibles */ });
  }

  // ---------------------------------------------------------------------------
  // Géocodage : service de l'IGN (Géoplateforme), une adresse à la fois
  // ---------------------------------------------------------------------------

  function geocoder() {
    var aPlacer = points.filter(function (p) { return !p.place && p.adresse; });
    var trouves = [], echecs = [], i = 0;
    etat.geocodage = '0 / ' + aPlacer.length; rendrePanneau();
    function suivant() {
      if (i >= aPlacer.length) return Promise.resolve();
      var p = aPlacer[i++];
      return fetch(GEOCODAGE + '?limit=1&q=' + encodeURIComponent(p.adresse)).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (j) {
        var f = j.features && j.features[0];
        if (f && f.properties && f.properties.score >= 0.4) trouves.push({ p: p, lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] });
        else echecs.push(p.nom);
      }).catch(function () { echecs.push(p.nom); }).then(function () {
        etat.geocodage = i + ' / ' + aPlacer.length;
        var b = panneau.querySelector('[data-action=geocoder]'); if (b) b.textContent = 'Placement en cours… ' + etat.geocodage;
        return new Promise(function (ok) { setTimeout(ok, 120); }).then(suivant);
      });
    }
    suivant().then(function () {
      if (DEMO) {
        trouves.forEach(function (t) { t.p.lat = t.lat; t.p.lon = t.lon; t.p.place = true; });
        return null;
      }
      if (!trouves.length) return null;
      return grist.selectedTable.update(trouves.map(function (t) {
        var f = {}; f[mappings.Latitude] = Math.round(t.lat * 1e6) / 1e6; f[mappings.Longitude] = Math.round(t.lon * 1e6) / 1e6;
        return { id: t.p.id, fields: f };
      }));
    }).then(function () {
      etat.geocodage = null;
      etat.alerte = { type: echecs.length ? 'warning' : 'success', texte: pluriel(trouves.length, 'adresse') + ' placée' + (trouves.length > 1 ? 's' : '') + '.' +
        (echecs.length ? ' Non trouvée' + (echecs.length > 1 ? 's' : '') + ' : ' + echecs.join(', ') + '. Précisez l\'adresse (commune, code postal).' : '') };
      if (DEMO) { dessiner(true); rendrePanneau(); }
    }).catch(function (err) {
      etat.geocodage = null;
      etat.alerte = { type: 'error', texte: 'Enregistrement des coordonnées refusé par Grist. (' + ((err && err.message) || err) + ')' };
      rendrePanneau();
    });
  }

  // ---------------------------------------------------------------------------
  // Réglages : enregistrés dans les options du widget (propres à la vue)
  // ---------------------------------------------------------------------------

  function majBrouillon(el) {
    var b = etat.brouillon, chemin = el.getAttribute('data-reglage').split('.'), v = el.type === 'checkbox' ? el.checked : el.value;
    if (chemin[0] === 'puces') { var t = etat.typesReglages[num(chemin[1])]; b.puces[t] = b.puces[t] || {}; b.puces[t][chemin[2]] = v; }
    else if (chemin.length === 2) { b[chemin[0]][chemin[1]] = v; }
    else b[chemin[0]] = v;
  }
  function num(v) { var n = parseInt(v, 10); return isNaN(n) ? 0 : n; }
  function appliquerOptions(o, ajuster) {
    var fond = options.fond;
    options = Object.assign(JSON.parse(JSON.stringify(OPTIONS_DEFAUT)), o || {});
    options.puces = options.puces || {};
    options.puceDefaut = Object.assign({}, OPTIONS_DEFAUT.puceDefaut, options.puceDefaut || {});
    options.liens = Object.assign({}, OPTIONS_DEFAUT.liens, options.liens || {});
    if (carte && fond !== options.fond) changerFond();
    if (window.PageDSFR && o && o.page && (o.page.titre || o.page.marque)) {
      var cible = window.PageDSFR.appliquer(o.page, { entete: document.getElementById('entete'), pied: document.getElementById('pied') });
      if (cible.entete) cible.entete.id = 'entete';
      if (cible.pied) cible.pied.id = 'pied';
    }
    if (carte) { dessiner(ajuster); rendrePanneau(); }
  }
  function enregistrerOptions(o) {
    if (DEMO) return Promise.resolve();
    if (window.BarreLab && window.BarreLab.modeEnregistre()) { o = Object.assign({}, o, { modeLab: window.BarreLab.modeEnregistre() }); } // garde l'affichage choisi pour cette vue
    return grist.setOptions(o);
  }

  // ---------------------------------------------------------------------------
  // Événements
  // ---------------------------------------------------------------------------

  panneau.addEventListener('click', function (e) {
    var el = e.target.closest('button');
    if (!el || el.disabled) return;
    var a = el.getAttribute('data-action');
    if (el.hasAttribute('data-point')) { selectionner(num(el.getAttribute('data-point')), false); var t = document.getElementById('gc-fiche-titre'); if (t) t.focus(); return; }
    if (a === 'retour') { etat.alerte = null; var ancien = etat.selection; selectionner(null); var b = panneau.querySelector('[data-point="' + ancien + '"]'); if (b) b.focus(); return; }
    if (a === 'tout-afficher') { toutAfficher(); return; }
    if (a === 'rechercher') { etat.q = document.getElementById('gc-q').value; dessiner(true); rendrePanneau(); return; }
    if (a === 'geocoder') { geocoder(); return; }
    if (a === 'annuler') { etat.brouillon = null; etat.vue = 'liste'; appliquerOptions(options); return; }
    if (a === 'enregistrer') {
      var o = etat.brouillon;
      enregistrerOptions(o).then(function () {
        etat.brouillon = null; etat.vue = 'liste';
        etat.alerte = { type: 'success', texte: DEMO ? 'Réglages appliqués (démonstration : non enregistrés).' : 'Réglages enregistrés.' };
        appliquerOptions(o);
      }).catch(function (err) {
        etat.alerte = { type: 'error', texte: 'Enregistrement impossible : il faut pouvoir modifier le document. (' + ((err && err.message) || err) + ')' };
        rendrePanneau();
      });
    }
  });
  panneau.addEventListener('change', function (e) {
    var el = e.target;
    if (el.hasAttribute('data-type')) { etat.masques[el.getAttribute('data-type')] = !el.checked; dessiner(false); rendrePanneau(); var x = document.getElementById(el.id); if (x) x.focus(); return; }
    if (el.id === 'gc-fond') { options.fond = el.value; changerFond(); enregistrerOptions(options).catch(function () {}); return; }
    if (el.id === 'gc-liens') { options.liens.afficher = el.checked; dessinerLiens(); enregistrerOptions(options).catch(function () {}); return; }
    if (el.hasAttribute('data-reglage')) {
      majBrouillon(el);
      // Aperçu immédiat des puces.
      if (/^(puces|puceDefaut)/.test(el.getAttribute('data-reglage'))) { var id = el.id; rendrePanneau(); var y = document.getElementById(id); if (y) y.focus(); }
    }
  });
  panneau.addEventListener('input', function (e) {
    if (e.target.hasAttribute('data-reglage') && e.target.type !== 'checkbox') majBrouillon(e.target);
  });
  var rendreApres = false;
  panneau.addEventListener('focusout', function (e) {
    if (rendreApres && !(e.relatedTarget && panneau.contains(e.relatedTarget))) { rendreApres = false; setTimeout(rendrePanneau, 0); }
  });
  panneau.addEventListener('keydown', function (e) {
    if (e.target.id === 'gc-q' && e.key === 'Enter') { e.preventDefault(); etat.q = e.target.value; dessiner(true); rendrePanneau(); var q = document.getElementById('gc-q'); if (q) q.focus(); }
  });
  document.getElementById('gc-reglages').addEventListener('click', function () { ouvrirReglages(); });
  document.getElementById('gc-actualiser').addEventListener('click', function () { (DEMO ? chargerDemo() : chargerMeta().then(chargerLiens)).then(function () { dessiner(false); rendrePanneau(); }); });

  // ---------------------------------------------------------------------------
  // Thème
  // ---------------------------------------------------------------------------

  var choixTheme = 'auto';
  try { choixTheme = localStorage.getItem('gc-theme') || 'auto'; } catch (e) { /* stockage indisponible */ }
  function themeGrist() {
    var st = getComputedStyle(document.documentElement);
    var m = (st.getPropertyValue('--grist-theme-page-bg') || st.getPropertyValue('--grist-theme-bg') || '').trim().match(/^#([0-9a-f]{6})$/i);
    if (!m) return null;
    var n = parseInt(m[1], 16);
    return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255 < 0.5 ? 'dark' : 'light';
  }
  function appliquerTheme() {
    var t = choixTheme;
    if (t === 'auto') t = themeGrist() || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-fr-theme', t);
  }
  var selectTheme = document.getElementById('gc-theme');
  selectTheme.value = choixTheme;
  selectTheme.addEventListener('change', function () {
    choixTheme = selectTheme.value;
    try { localStorage.setItem('gc-theme', choixTheme); } catch (e) { /* stockage indisponible */ }
    appliquerTheme();
  });
  new MutationObserver(appliquerTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });

  // ---------------------------------------------------------------------------
  // Page de configuration unique (réglages, en-tête et pied, aperçu, publication)
  // ---------------------------------------------------------------------------

  var configLab = null;
  var zoneConfig = document.getElementById('gc-coque');
  var pageEditee = null, avantApercu = null;
  // Contenu de l'onglet Réglages : le formulaire de vueReglages(), sans ses boutons propres.
  function corpsReglages() {
    var h = vueReglages();
    return h.slice(h.indexOf('<div class="fr-input-group"><label class="fr-label" for="rg-titre"'), h.lastIndexOf('<ul class="fr-btns-group'));
  }
  function rafraichirReglages() {
    if (!configLab || configLab.estModifie()) return;
    etat.brouillon = null;
    configLab.rafraichir('reglages');
  }
  function monterCoque() {
    if (configLab || !zoneConfig || !window.ConfigLab) return;
    pageEditee = JSON.parse(JSON.stringify(options.page || { marque: '', titre: 'Carte', pied: { accessibilite: '' } }));
    configLab = window.ConfigLab.monter(zoneConfig, {
      nom: 'Widget carte',
      vue: { libelle: 'Carte', element: document.querySelector('.gc-cadre') },
      page: pageEditee,
      onglets: [{ id: 'reglages', libelle: 'Réglages', rendre: function (zone) { zone.innerHTML = '<div class="cl-panneau"><p class="fr-text--sm">Les réglages sont propres à cette vue : ils sont enregistrés avec le widget dans le document.</p>' + corpsReglages() + '</div>'; } }],
      // Aperçu réel : la carte elle-même s'affiche sous l'en-tête, avec les réglages en cours (même non enregistrés).
      surApercu: function (ouvert) {
        if (ouvert) {
          avantApercu = JSON.parse(JSON.stringify(options));
          if (etat.brouillon) { appliquerOptions(Object.assign({}, etat.brouillon, { page: pageEditee }), true); }
        } else if (avantApercu) {
          appliquerOptions(avantApercu, true); avantApercu = null;
        }
        // Le conteneur change de taille en passant d'un onglet à l'autre : on recale le fond de carte et on recadre sur les points.
        if (carte) { setTimeout(function () { carte.invalidateSize(); dessiner(true); }, 200); }
      },
      publication: { mode: 'connecte', adresseWidget: location.href.split('#')[0].split('?')[0],
        publier: { lienDoc: (options.publication && options.publication.lienDoc) || '', texte: 'La carte peut s\'afficher en page complète, sans compte Grist, en lecture seule : liste, recherche, fiches et liens entre les points.',
          construire: function (l) {
            var o = JSON.parse(JSON.stringify(etat.brouillon || options)); delete o.publication; o.page = pageEditee;
            return window.GristPublic ? window.GristPublic.lien(location.href.split('#')[0].split('?')[0], { doc: l, table: meta.table, options: o, mappings: mappings }) : null;
          },
          surChangement: function (l) { if (!etat.brouillon) etat.brouillon = JSON.parse(JSON.stringify(options)); etat.brouillon.publication = { lienDoc: l }; } } },
      surOnglet: function (id) { if ((id === 'vue' || id === 'apercu') && carte) { setTimeout(function () { carte.invalidateSize(); }, 50); } },
      surEnregistrer: function () {
        var o = etat.brouillon || JSON.parse(JSON.stringify(options));
        o.page = pageEditee;
        o.publication = o.publication || options.publication || { lienDoc: '' };
        enregistrerOptions(o).then(function () {
          etat.brouillon = JSON.parse(JSON.stringify(o));
          appliquerOptions(o);
          configLab.enregistre();
          configLab.message('success', DEMO ? 'Réglages appliqués (démonstration : non enregistrés).' : 'Réglages enregistrés.');
        }).catch(function (err) {
          configLab.message('error', 'Enregistrement impossible : il faut pouvoir modifier le document. (' + ((err && err.message) || err) + ')');
        });
      }
    });
  }
  function ouvrirReglages() { monterCoque(); if (configLab) configLab.onglet('reglages'); }
  if (zoneConfig) {
    zoneConfig.addEventListener('change', function (e) {
      if (!e.target.hasAttribute('data-reglage') || !etat.brouillon) return;
      majBrouillon(e.target);
      // L'aperçu des puces suit le choix : on redessine l'onglet en gardant les modifications.
      if (configLab && /^puces\./.test(e.target.getAttribute('data-reglage'))) {
        var id = e.target.id; configLab.rafraichir('reglages'); configLab.modifie(true);
        var n = id && document.getElementById(id); if (n) n.focus();
      }
    });
    zoneConfig.addEventListener('input', function (e) { if (e.target.hasAttribute('data-reglage') && e.target.type !== 'checkbox' && etat.brouillon) majBrouillon(e.target); });
  }

  // ---------------------------------------------------------------------------
  // Démarrage
  // ---------------------------------------------------------------------------

  appliquerTheme();
  initCarte();
  // Accès au code des tests (mode démonstration uniquement).
  if (DEMO) window.gcEtat = function () { return { options: options, points: points, liens: liens, marqueurs: Object.keys(marqueurs).length }; };

  if (DEMO) {
    document.getElementById('gc-demo').hidden = false;
    chargerDemo().then(function () { changerFond(); dessiner(true); rendrePanneau(); monterCoque(); }).catch(function (err) {
      panneau.innerHTML = '<div class="fr-alert fr-alert--error"><p>Chargement impossible : ' + esc(err.message || err) + '</p></div>';
    });
  } else {
    var premier = true, recus = null;
    grist.ready({ requiredAccess: 'full', columns: COLONNES, allowSelectBy: true,
      onEditOptions: function () { ouvrirReglages(); } });
    grist.onOptions(function (o) {
      appliquerOptions(o || {}, premier && recus !== null);
      monterCoque(); rafraichirReglages();
      if (recus !== null) chargerLiens().then(function () { dessiner(false); rendrePanneau(); });
    });
    grist.onRecords(function (records, m) {
      mappings = m || {};
      recus = records;
      var associes = grist.mapColumnNames(records);
      if (!associes) {
        panneau.innerHTML = '<h1 class="fr-h5">Carte</h1><div class="fr-alert fr-alert--info fr-alert--sm"><p>Associez au moins la colonne Nom, et les colonnes Latitude et Longitude (ou Adresse), dans le panneau du widget à droite.</p></div>';
        return;
      }
      chargerMeta().then(function () {
        points = associes.map(versPoint);
        return chargerLiens();
      }).then(function () {
        dessiner(premier); premier = false;
        monterCoque(); rafraichirReglages();
        // Une mise à jour venue de Grist pendant une saisie dans le panneau attend la fin de la saisie.
        var a = document.activeElement;
        if (a && panneau.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) { rendreApres = true; return; }
        rendrePanneau();
      });
    });
    grist.onRecord(function (r) {
      if (r && r.id && r.id !== etat.selection && point(r.id)) selectionner(r.id, 'grist');
    });
    // Rien n'arrive si aucune colonne n'est associée : on l'indique.
    setTimeout(function () {
      monterCoque();
      if (recus === null) panneau.innerHTML = '<h1 class="fr-h5">Carte</h1><div class="fr-alert fr-alert--info fr-alert--sm"><p>Associez au moins les colonnes Nom, Latitude et Longitude (ou Adresse) dans le panneau du widget, à droite.</p></div>';
    }, 2500);
  }
})();
