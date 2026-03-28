# HACS Submission Checklist

## Already done

- [x] Integration structure under `custom_components/ha_dropdown_fix`
- [x] Valid `manifest.json` with domain, name, version
- [x] `hacs.json` present at repository root
- [x] Public GitHub repository
- [x] Semantic release tag `v0.1.0`
- [x] README with install and configuration steps
- [x] CI workflow for HACS + Hassfest

## Before submission

- [ ] Confirm repository description and topics are set on GitHub
- [ ] Ensure default branch is `main`
- [ ] Verify latest CI run is green on `main`
- [ ] Validate installation from HACS Custom Repository on a fresh HA instance
- [ ] Add screenshots/GIF to README (recommended)
- [ ] Confirm license and owner details are correct

## Submission steps

1. Go to the official HACS default repositories process.
2. Submit repository URL: `https://github.com/benoitpoirier/ha-dropdown-rescue`
3. Category: `Integration`
4. Wait for review and address feedback if needed.

## Post-submission maintenance

- Keep semantic releases for each change.
- Track Home Assistant frontend changes and update selectors when needed.
- Triage issues quickly for compatibility reports.
