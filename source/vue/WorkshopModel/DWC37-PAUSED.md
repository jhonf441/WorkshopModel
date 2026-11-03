# DWC 3.7 line: paused

Decision of the owner (2026-11-03): the DWC 3.7 line of this plugin (`dwc-src/`, Vue 3 / Vuetify 3) is PAUSED for now.

- Only the DWC 3.6 line (`dwc36/dwc-src/`) is developed, installed and published. The published release has only the `-dwc3.6.zip`.
- The 3.7 line was never run on a real DWC 3.7; it was only tested without a browser. It stays in the repository as it is and may lag behind the 3.6 line (components, styles, new features).
- Pure JS modules and the i18n catalogs are still copied to the 3.7 line when it is cheap, so the parity tests keep passing.
- Public documents say "DWC 3.6.x only".
- To resume: port the new 3.6 components to Vue 3, rebuild with `python build.py WorkshopModel --dwc 3.7`, test on a real DWC 3.7, then restore the 3.7 lines in the public README.
