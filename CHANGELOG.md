# WorkshopModel -- historial de versiones

## 1.5.1 -- 2026-11-02

- Usage finder: definitions always read from 0:/sys, rows with separated parts, maybe-created hint

## Next version (in progress, not built yet)

- Usage finder: the name, the counts and the state of a result row are apart (a space and a gap), no longer glued. The definitions no longer depend on what you chose to read: every .g file of 0:/sys (down to 4 levels, backups and examples left out) is always read for its `global x = ...` lines, so globals created in 0:/sys outside the M98 chain (meshglobals.g, workshop/macros/jogFreeSet.g) are not reported as missing; a definition after a condition on the same line (if !exists(global.x) global x = 0) counts. A name read but created nowhere is a problem only when every folder that could create it was read; otherwise it says it may be created in a folder not read, with a button that reads that folder. A folder left out (a plugin folder) can be switched on by hand.

## 1.5.0 -- 2026-11-02

- Usage finder with scope and less noise, Globals section with search, groups and quick edit
- Globals section reworked: a search, filters by kind, kept across reboots, changed in the last minute and watched, a sort by name, type or last change (favourites first); groups by the start of the name (before the first underscore or capital letter, two or more members, the rest in Other) that fold and are remembered; one clean row per global (star, name, kind chip, short value that opens on a tap, save icon when kept, in how many files the last usage scan saw it) with a quick edit for booleans (a switch) and numbers (a field, Enter) through the command preview, and one menu (edit, open in the tree, watch, favourite); creating a global opens a dialog with the typed editor; the persistence macro is a folded panel that opens by itself only when a saved value is not the live one or config.g does not call it; density and favourites follow the Model section.
- Usage finder reworked: what to read is a choice remembered in this browser (config.g and every file it calls with M98, daemon.g and start.g, the top of 0:/macros by default; a switch per folder; the depth, 2 by default; backups, examples and plugin folders left out); texts in quotes are not counted as reads unless inside braces; only a global read but never created is a problem, a global nothing reads is a hint (a plugin, a panel or the console may read it); the result opens on the problems, with filters by kind and file, a search, one line per global (defined, written and read in N files) that opens to the files and lines, and a view by file; files that did not change are not read again (memory kept in the page, and in the watch file with the SBC tier only), with a progress bar.

## 1.4.0 -- 2026-11-02

- Snapshots, expression tester, detail panel, watch renderers for every value kind, Changes polish
- Snapshots section: save the whole model or the branch selected in the Model section under a name (0:/sys/workshop-model-snapshots.json, the same on a standalone Duet and in SBC mode; at most 4 snapshots of 4000 values on a standalone Duet, 20 of 10000 with the SBC tier), compare two snapshots or one with the model now (changed, added, removed, with filters), export one as a workshop JSON file and import one back.
- Expression tester section: an RRF expression sent with echo, or a path read with M409, through the command preview with one tap; the answer shown in place and a short history; a line break or an output redirection (> to a file) is refused. Test in the detail panel opens a path there.
- Detail panel: the value in words (bytes, durations), a swatch for a colour, arrays as small tables (one column per key for a list of objects), the kind as a chip and the favourite star; the children of an object open with a tap.
- Watch list drawn by the kind of the value: a number keeps its sparkline with min and max and can mark its sudden jumps, a text or a word of the model (state.status, a mode) is a timeline of coloured bands with a legend (colours from the badge palette of the family, stable per value), a boolean an on and off line, an array or an object the count of what changed inside; every row opens its changes: time, before, after and how long the value before lasted, with the changes inside an array or an object. The changes are kept with the watch list in this browser and, with the SBC tier, in the watch file.
- Changes view: long paths show their last two names (the whole path in the title and a copy button) in a wider column, and the noise (the command logs of other plugins under lastCommands, time stamps that move every second) is hidden by default with a chip that shows it again.

## 1.3.0 -- 2026-11-02

- Six views (Topics, Flat list, Columns, Browse, Changes, Technical tree), density, favourites, plugin state fix
- Three more views of the live model: Columns (like a file browser), Browse (one level at a time with a breadcrumb) and Changes (only what changed since a moment you pick, before and after); six views in the selector.
- Density switch (comfortable or compact rows) and favourites (a star on any path, the pinned paths with their live values on top of the section), both remembered in this browser; the Flat list shows the type as a chip and a star per row.

## 1.2.1 -- 2026-11-01

- Plugins card says browser only for plugins without a Pi process; start-up card SBC extras and optional companion row
- Topics view, Plugins card: a plugin without an sbcExecutable lives in the browser and reads "browser only", never "stopped"; a plugin with a process on the Pi reads running or stopped (with the SBC tier). The card is shown on a standalone Duet too.
- Start-up card: the SBC row is now "SBC mode extras (done from DWC)" and lists what it turns on (the watch history file 0:/sys/workshop-model-watch.json, the wider usage finder, the sbc and plugins branches); a new row "Companion on the Pi (WorkshopModelAgent)" is an offer, always grey, never counted as missing, and says whether it is not installed, stopped or running and how to install it. The header chip says "SBC mode, extras on" (or off) and "Standalone"; the word companion is kept for the plugin of the Pi.

## 1.2.0 -- 2026-11-01

- Stage 1 of the 1.1 views: view selector, Topics and Flat list views
- Model section with a view selector (remembered in this browser) over the same live model; the technical tree stays as one of the views.
- Topics view (the default): one card per area of the machine (state, temperatures, motion and axes, job, tools, fans, sensors, boards and drivers, network, plugins, globals) with readable names, units and live values, built from what the model has; every top-level key no card covers is listed in Other; See all opens the branch in the technical tree. The globals card follows the RRF 3.4 gate and the DSF plugin list the SBC tier.
- Flat list view: every value of the model in one sortable table (path, value, type, last change) with filters by text, by type, changed in the last minute and only watched; bytes and durations are shown in words beside the raw value.
- Each view carries its help (what it is, what it is for, what you lose without it, how to use it) in a fold under the selector.
- The contract every view follows is written in vue/WorkshopModel/VIEW-CONTRACT.md and checked by test/view-contract.test.js.

## 1.0.0 -- 2026-11-01

- First version of Model Explorer: the object model as a live tree with the globals as one of its branches, detail table and path copy, search by key and value, typed editor of globals (int, float, bool, string, array, expression; quotes handled by the plugin), creation of globals, watch list with sparkline and min / max, change highlight and list of recent changes, command preview before every send (one tap for meta commands, double tap for any other G or M code), presets with compare, apply and JSON export / import, persistence macro 0:/sys/workshop-globals.g with the config.g check, usage finder over 0:/sys and 0:/macros, path helper (M409, M291, echo, expression, condition).
- DWC-only: no WorkshopService, no Raspberry needed (sbcRequired false); the files go through DWC's machine file API, so it works on a standalone Duet. With a Duet in SBC mode (DSF 3.4 or newer) it unlocks by itself the watch history kept in 0:/sys/workshop-model-watch.json and a wider usage scan.
- Boards with RepRapFirmware older than 3.4 keep the tree, the watch list and the path helper; the globals features are off with one line saying why.
- Both DWC lines (3.6 and 3.7) from one set of pure modules.
