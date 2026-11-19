"""Test « dans Grist » de grist-carte, avec une API Grist simulée (tests/grist-mock.js) chargée dans tests/hote.html.
Lancer un serveur à la racine du dépôt (python3 -m http.server PORT), puis : PORT=… python3 tests/test_dans_grist.py"""
import os, sys, json
from playwright.sync_api import sync_playwright
ok = ko = 0
def verifier(nom, cond):
    global ok, ko
    print(('OK   ' if cond else 'ÉCHEC ') + nom); ok += cond; ko += (not cond)
def ouvrir(b, port, mock, erreurs):
    pg = b.new_page(viewport={'width': 1280, 'height': 860})
    pg.on('pageerror', lambda e: erreurs.append(str(e)))
    mockjs = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'grist-mock.js')).read()
    pg.route('https://docs.getgrist.com/grist-plugin-api.js', lambda r: r.fulfill(status=200, content_type='application/javascript', body=mockjs))
    pg.route('https://data.geopf.fr/wmts**', lambda r: r.fulfill(status=204))
    pg.route('https://data.geopf.fr/geocodage/**', lambda r: r.fulfill(status=200, content_type='application/json', body=json.dumps({'features': [{'geometry': {'coordinates': [3.72, 48.72]}, 'properties': {'score': 0.9}}]})))
    pg.goto(f'http://localhost:{os.environ.get("PORT", port)}/tests/hote.html')
    pg.evaluate('m => { window.MOCK = m; charger(); }', mock)
    return pg, pg.frame_locator('#w')
mock = lambda pg: pg.evaluate('window.MOCK')
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ.get('CHROME') or None, args=['--no-sandbox'])
    erreurs = []
    # --- grist-carte : colonnes associées, options, géocodage écrit dans la table, réglages enregistrés
    m = {'tables': {
        'Structures': {'colonnes': {'Nom': {'type': 'Text'}, 'Type': {'type': 'Choice'}, 'Ville': {'type': 'Text'}, 'Lat': {'type': 'Numeric'}, 'Lon': {'type': 'Numeric'}}, 'lignes': [
            {'id': 1, 'Nom': 'Lycée B', 'Type': 'Établissement', 'Ville': 'Châlons', 'Lat': 48.95, 'Lon': 4.36}, {'id': 2, 'Nom': 'Association F', 'Type': 'Partenaire', 'Ville': 'Troyes', 'Lat': 48.30, 'Lon': 4.08},
            {'id': 3, 'Nom': 'Espace M', 'Type': 'Partenaire', 'Ville': 'Sézanne', 'Lat': None, 'Lon': None}]},
        'Liens': {'colonnes': {'De': {'type': 'Text'}, 'Vers': {'type': 'Text'}, 'Type': {'type': 'Text'}}, 'lignes': [{'id': 1, 'De': 'Lycée B', 'Vers': 'Association F', 'Type': 'Partenariat'}]}},
        'table': 'Structures', 'mapping': {'Nom': 'Nom', 'Type': 'Type', 'Adresse': 'Ville', 'Latitude': 'Lat', 'Longitude': 'Lon'},
        'options': {'puces': {'Partenaire': {'couleur': 'green-menthe', 'icone': 'community'}}, 'liens': {'table': 'Liens', 'afficher': True}}, 'utilisateur': {'email': 'a@b.fr', 'nom': 'A'}}
    pg, f = ouvrir(b, 8782, m, erreurs)
    f.locator('.gc-liste').wait_for(); f.locator('.leaflet-marker-icon').first.wait_for()
    verifier('carte : 2 points placés, icône du type', f.locator('.gc-liste li').count() == 2 and f.locator('.leaflet-marker-icon .fr-icon-community-fill').count() == 1)
    verifier('carte : lien tracé depuis la table Liens', f.locator('.leaflet-overlay-pane path').count() == 1)
    f.get_by_role('button', name='Placer ces adresses').click()
    pg.wait_for_function("window.MOCK.tables.Structures.lignes[2].Lat !== null", timeout=10000)
    r = mock(pg)['tables']['Structures']['lignes'][2]
    verifier('carte : coordonnées écrites dans les colonnes associées', r['Lat'] == 48.72 and r['Lon'] == 3.72)
    f.locator('.gc-liste li').nth(2).wait_for()
    f.locator('.gc-liste__bouton', has_text='Lycée B').click()
    verifier('carte : sélection transmise à Grist', mock(pg).get('curseur') == {'rowId': 1})
    f.locator('#gc-reglages').click(); f.locator('label[for=rg-image]').click(); f.get_by_role('button', name='Enregistrer').click()
    verifier('carte : réglages enregistrés avec le widget', mock(pg)['options']['imagePuce'] is True and mock(pg)['options']['puces']['Partenaire']['icone'] == 'community')
    pg.close()
    verifier('aucune erreur JavaScript', not erreurs)
    if erreurs: print(erreurs)
    b.close()
print(f'{ok} réussis, {ko} échoués'); sys.exit(1 if ko else 0)
