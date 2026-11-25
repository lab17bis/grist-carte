"""Tests de bout en bout du mode démonstration : python3 tests/test_carte.py
Variables : CHROME (chemin du navigateur), URL (par défaut http://localhost:8782/).
Le fond de carte et le géocodage de l'IGN sont simulés : aucun appel réseau extérieur."""
import os, sys, json
from playwright.sync_api import sync_playwright
URL = os.environ.get('URL', 'http://localhost:8782/')
ok = ko = 0
def verifier(nom, cond):
    global ok, ko
    print(('OK   ' if cond else 'ÉCHEC ') + nom); ok += cond; ko += (not cond)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ.get('CHROME') or None, args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 1280, 'height': 860}); erreurs = []
    pg.on('pageerror', lambda e: erreurs.append(str(e)))
    pg.route('https://data.geopf.fr/wmts**', lambda r: r.fulfill(status=204))
    pg.route('https://data.geopf.fr/geocodage/**', lambda r: r.fulfill(status=200, content_type='application/json',
        body=json.dumps({'features': [{'geometry': {'coordinates': [3.7236, 48.7211]}, 'properties': {'score': 0.9}}]})))
    etat = lambda: pg.evaluate('gcEtat()')
    pg.goto(URL); pg.wait_for_selector('.gc-liste'); pg.wait_for_selector('.leaflet-marker-icon'); pg.wait_for_timeout(300)
    verifier('14 points placés, 1 sans coordonnées', etat()['marqueurs'] == 14 and pg.locator('.gc-liste li').count() == 14)
    verifier('légende : 5 types', pg.locator('.gc-legende input').count() == 5)
    verifier('puces personnalisées : couleur et icône du type', 'school' in json.dumps(etat()['options']['puces']))
    pg.locator('.gc-legende label', has_text='Établissement').click()
    verifier('filtre par type', etat()['marqueurs'] == 7 and pg.locator('.gc-liste li').count() == 7)
    pg.locator('.gc-legende label', has_text='Établissement').click()
    pg.fill('#gc-q', 'Troyes'); pg.press('#gc-q', 'Enter')
    verifier('recherche', pg.locator('.gc-liste li').count() == 2)
    pg.fill('#gc-q', ''); pg.press('#gc-q', 'Enter')
    pg.locator('.gc-liste__bouton', has_text='Association F').click()
    verifier('fiche : titre, détails, image', pg.locator('#gc-fiche-titre').inner_text() == 'Association F' and 'Maxime Garcia' in pg.locator('.gc-details').inner_text() and pg.locator('.gc-fiche__image img').count() == 1)
    verifier('fiche : acteurs liés', pg.locator('.gc-voisins li').count() == 2)
    pg.locator('.gc-voisins button', has_text='Lycée H').click()
    verifier('navigation vers un acteur lié', pg.locator('#gc-fiche-titre').inner_text() == 'Lycée H')
    verifier('liens tracés', pg.locator('.leaflet-overlay-pane path').count() >= 5)
    pg.get_by_role('button', name='Retour à la liste').click()
    pg.locator('label[for=gc-liens]').click()
    verifier('masquer les liens', pg.locator('.leaflet-overlay-pane path').count() == 0)
    # Réglages : changer la puce des partenaires, utiliser les logos
    pg.locator('#gc-reglages').click(); pg.wait_for_selector('.gc-reglage-puce')
    i = [t for t in pg.locator('.gc-reglage-puce__titre strong').all_inner_texts()].index('Partenaire')
    pg.select_option('#rg-c%d' % i, 'red-marianne'); pg.select_option('#rg-i%d' % i, 'heart')
    verifier('aperçu de la puce', '#e1000f' in pg.locator('.gc-reglage-puce').nth(i).inner_html())
    pg.locator('label[for=rg-image]').click(); pg.get_by_role('button', name='Enregistrer').click()
    pg.locator('.cl-barre label').first.click(); pg.wait_for_timeout(300)  # retour sur l'onglet Carte
    verifier('puce : couleur et icône enregistrées', etat()['options']['puces']['Partenaire'] == {'couleur': 'red-marianne', 'icone': 'heart'} and 'e1000f' in pg.locator('.gc-legende').inner_html())
    verifier('logos utilisés comme puces', etat()['options'].get('imagePuce') is True)
    # Aperçu réel : la carte elle-même, avec le brouillon non enregistré
    pg.locator('#gc-reglages').click(); pg.wait_for_selector('.gc-reglage-puce')
    j = [t for t in pg.locator('.gc-reglage-puce__titre strong').all_inner_texts()].index('Établissement')
    avant = pg.locator('.gc-legende').inner_html().count('e1000f')
    pg.select_option('#rg-c%d' % j, 'red-marianne')
    pg.locator('.cl-barre label', has_text='Aperçu').click(); pg.wait_for_timeout(500)
    verifier('aperçu réel : la carte est dans le cadre de l\'aperçu', pg.locator('.cl-apercu .gc-cadre').count() == 1 and pg.locator('.cl-apercu .leaflet-marker-icon').count() > 0)
    verifier('aperçu réel : les réglages non enregistrés s\'appliquent', pg.locator('.gc-legende').inner_html().count('e1000f') > avant)
    pg.locator('.cl-barre label', has_text='Réglages').click(); pg.wait_for_timeout(300)
    verifier('aperçu quitté : la carte est revenue dans son onglet, réglages enregistrés rétablis', pg.locator('.cl-apercu .gc-cadre').count() == 0 and pg.locator('.gc-legende').inner_html().count('e1000f') == avant)
    pg.locator('.cl-barre label').first.click(); pg.wait_for_timeout(300)
    # Géocodage simulé
    pg.get_by_role('button', name='Placer ces adresses').click()
    pg.wait_for_function("() => document.querySelector('.gc-alerte') && document.querySelector('.gc-alerte').innerText.indexOf('placée') >= 0", timeout=10000)
    verifier('géocodage : adresse placée', etat()['marqueurs'] == 15 and 'placée' in pg.locator('.gc-alerte').inner_text())
    pg.screenshot(path='/tmp/carte-liste.png')
    pg.locator('.gc-liste__bouton', has_text='Lycée B').click(); pg.wait_for_timeout(500); pg.screenshot(path='/tmp/carte-fiche.png')
    pg.set_viewport_size({'width': 400, 'height': 800}); pg.wait_for_timeout(300); pg.screenshot(path='/tmp/carte-mobile.png', full_page=True)
    verifier('aucune erreur JavaScript', not erreurs)
    if erreurs: print(erreurs)
    b.close()
print(f'{ok} réussis, {ko} échoués'); sys.exit(1 if ko else 0)
