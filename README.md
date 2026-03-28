# HA Dropdown Fix (HACS)

Correctif communautaire pour Home Assistant, basé sur le ticket frontend
[#29172](https://github.com/home-assistant/frontend/issues/29172), qui provoque des menus
`ha-dropdown` transparents/non cliquables (problèmes de focus/superposition/z-index).

Repository officiel: https://github.com/benoitpoirier/ha-dropdown-rescue

## Objectifs

- Corriger les menus "3 points" et autres dropdowns inactifs dans l'UI.
- Fournir une installation simple via HACS (catégorie `Integration`).
- Permettre une configuration rapide côté `configuration.yaml`.
- Préparer le projet pour une soumission au store HACS officiel.

## Ce que fait le correctif

- Injecte un module frontend global via `frontend.add_extra_js_url`.
- Force un contexte visuel/clicable correct pour les menus ouverts.
- Optionnellement neutralise certains conteneurs qui coupent les overlays (`overflow`, `contain`).
- Injecte aussi les styles dans les Shadow DOM détectés, pour couvrir les zones UI concernées.

## Installation

### 1. Ajouter le repository dans HACS

1. Ouvrir HACS > menu 3 points > `Custom repositories`.
2. Ajouter l'URL du repository: `https://github.com/benoitpoirier/ha-dropdown-rescue`.
3. Choisir la catégorie `Integration`.
4. Installer `HA Dropdown Fix`.

### 2. Configurer Home Assistant

Ajouter dans `configuration.yaml`:

```yaml
ha_dropdown_fix:
  enabled: true
  z_index: 2147483647
  fix_overflow: true
  scan_shadow_dom: true
  debug_outline: false
  aggressive_mode: false
  extra_menu_selectors: []
```

Puis redémarrer Home Assistant.

## Configuration

Paramètres disponibles sous `ha_dropdown_fix`:

- `enabled` (`bool`, défaut: `true`): active/désactive le patch.
- `z_index` (`int`, défaut: `2147483647`): priorité visuelle des menus.
- `fix_overflow` (`bool`, défaut: `true`): retire certains `overflow/contain` bloquants.
- `scan_shadow_dom` (`bool`, défaut: `true`): applique le style dans les Shadow DOM.
- `debug_outline` (`bool`, défaut: `false`): affiche un contour de debug autour des menus.
- `aggressive_mode` (`bool`, défaut: `false`): force un mode de correction plus agressif (utile pour certains navigateurs/appareils, notamment iOS 15/16).
- `extra_menu_selectors` (`list[str]`, défaut: `[]`): sélecteurs CSS additionnels à forcer.

Exemple avancé:

```yaml
ha_dropdown_fix:
  z_index: 999999
  fix_overflow: true
  extra_menu_selectors:
    - "ha-selector-menu"
    - ".my-custom-dropdown"
```

## Structure du projet

- `custom_components/ha_dropdown_fix/__init__.py`: setup intégration + injection module.
- `custom_components/ha_dropdown_fix/frontend/ha-dropdown-fix.js`: correctif JS/CSS runtime.
- `custom_components/ha_dropdown_fix/manifest.json`: métadonnées Home Assistant.
- `hacs.json`: métadonnées HACS.
- `.github/workflows/validate.yml`: validations HACS + Hassfest.

## Bonnes pratiques incluses

- Intégration minimaliste sans dépendance externe.
- Configuration validée via `voluptuous`.
- Chargement conditionnel (désactivable) et options de tuning.
- CI de validation pour maintenir la qualité avant publication.

## Publication dans le store HACS officiel

Pré-requis conseillés:

1. Créer un repository GitHub public dédié.
2. Renseigner `documentation`, `issue_tracker` et `codeowners` dans `manifest.json` selon votre repository public.
3. Publier une release sémantique (`v0.1.0`, `v0.1.1`, etc.).
4. Vérifier que HACS + Hassfest passent sur la branche par défaut.
5. Soumettre le repository au store HACS officiel via la procédure HACS.

Statut actuel de ce repository:

- Metadata `manifest.json` configurée pour GitHub.
- Tag/release `v0.1.0` publié.
- Workflow de validation HACS + Hassfest en place.

## Limites connues

- Le bug original est côté frontend Home Assistant. Ce projet applique un patch runtime de contournement.
- Si le frontend upstream change fortement ses classes/composants, ajuster `extra_menu_selectors` peut être nécessaire.

## Contribution

Les PR sont bienvenues pour élargir la couverture des menus impactés (automations, scripts, dashboards, blueprints, etc.).
