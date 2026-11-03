# WorkshopModel (Model Explorer)



Page `/Plugins/Model` ("Model Explorer"). The object model of the board, live, seen in the way that suits the question: readable cards by topic, a flat sortable list, columns like a file browser, one level at a time, only what changed, or the technical tree. Around it: the global variables with a typed editor and quick edits, a watch list drawn by the kind of each value, snapshots of the model to compare two moments, an expression tester, presets, the persistence of globals across reboots and a usage finder over your macros. It needs no WorkshopService and no Raspberry Pi: everything goes through the machine API of DWC itself (`rr_` on a standalone Duet, DSF with a Pi), so it works on a standalone Duet. With a Pi in SBC mode it turns a few extras on by itself.

Version documented: 1.5 (see the CHANGELOG of the plugin).

## 1. Requirements

1. DWC 3.6.x or 3.7.x on a Duet 3, standalone or in SBC mode. Global variables need RepRapFirmware 3.4 or newer; with an older firmware the globals features are off and say why, everything else works. WorkshopService is not needed and no DSF permission is asked.
2. For the SBC extras (section 3.10): the Duet in SBC mode with DSF 3.4 or newer and plugin support. They turn on by themselves; on a standalone Duet they stay grey with a one-line reason.

## 2. Install

1. DWC > Settings > Plugins > Install `WorkshopModel-<ver>-dwc3.6.zip` (or `-dwc3.7.zip` on DWC 3.7); Start. Reload DWC. 2. Open *Plugins > Model Explorer*. 3. Verify: the start-up card shows "Connection" and "Firmware" in green and the Model section shows the cards of your machine.

## 3. Functions

The side bar has seven sections: Model, Globals, Watch, Presets, Usage, Snapshots and Expression tester. The start-up card lives in the header.

### 3.1 Model: the views of the live model
- What: one selector of tabs over the same live model, remembered in this browser. Each view has a fold "How this view works" (what it is, what it is for, what you lose without it, how to use it).
  - Topics (the default): one card per area (machine state, temperatures, motion and axes, job, tools, fans, sensors, boards and drivers, network, plugins, globals) with readable names, units and live values. The cards come from what your model has: nothing of the workshop is assumed, and every top-level key no card covers is in Other. A row or "See all" opens that path in the technical tree. In the Plugins card a plugin without a process on the Pi reads "browser only", never "stopped".
  - Flat list: every value in one sortable table (path, value, type, last change) with filters by text, type, changed in the last minute and watched; bytes and durations are shown in words beside the raw value.
  - Columns: like a file browser, a column per level.
  - Browse: one level at a time with a breadcrumb.
  - Changes: only what changed since a moment you pick, before and after; the command logs of other plugins (`lastCommands`) and clocks that move every second are hidden by default, with a chip to show them.
  - Technical tree: the tree of the firmware with the search by key and value.
- Around the views: a density switch (comfortable or compact rows), favourites (a star on any path, the pinned paths with their live values on top) and the detail panel of the selected path: the value in words (bytes, durations), a swatch for a colour, arrays as small tables, the kind as a chip, the path helper (`M409`, `M291`, `echo`, an expression, a condition) and Test (the expression tester).

### 3.2 Globals
- What: the global variables in groups by the start of their name (before the first underscore or capital letter), folded or open as you leave them; a search, filters (kind, kept across reboots, changed in the last minute, watched) and a sort (name, type, last change; favourites first). Each row: star, name, kind, short value (a tap shows all of it), a save icon when kept, in how many files the last usage scan saw it, a quick edit for a boolean (a switch) or a number (a field and Enter), and one menu (edit with the typed editor, open in the tree, watch, favourite). "Create a global" opens a dialog with the typed editor.
- Watch out: RRF cannot delete a global until the next reboot; the plugin says so instead of offering a delete button.

### 3.3 Command preview
- What: before anything is sent the exact G-code is shown. Meta commands and reads (`set`, `global`, `echo`, `M409`) go with one tap; any other G or M code asks a second tap (design guide). The quick edits, the editor, the presets and the expression tester all go through it.

### 3.4 Watch
- What: pin any path and see it drawn by its kind: a number as a line with min and max (and, if you ask, a mark on every sudden jump), a text or a state word (`state.status`, a mode) as coloured bands as long as each value lasted with a legend, a boolean as on and off, an array or an object as the count of what changed inside. Every row opens its changes: time, before, after and how long the value before lasted, with the changes inside an array or an object.
- Watch out: the samples live in this browser; with a Pi in SBC mode they are also kept in `0:/sys/workshop-model-watch.json` (3.10).

### 3.5 Presets and persistence
- Presets: save the current set of globals under a name, compare it with the machine, apply it, export and import JSON (`0:/sys/workshop-model-presets.json`).
- Persistence: mark the globals to keep; the plugin writes ONE generated macro, `0:/sys/workshop-globals.g`, and you add `M98 P"0:/sys/workshop-globals.g"` to `config.g` (the start-up card copies the line; the plugin never edits `config.g`). The panel opens by itself only when a saved value is not the live one or `config.g` does not call the macro.

### 3.6 Usage finder
- What: which files define, write or read each global. What to read is your choice, remembered in this browser: by default `config.g` and every file it calls with `M98` (followed once each), `daemon.g`, `start.g` and the top of `0:/macros`; a switch per folder, the depth (2 by default), and backups, examples and plugin folders left out. A text in quotes is not counted as a read unless it is inside braces. The result opens on the real problems (a global read but never created and not on the machine); a global nothing reads is only a hint (a plugin, a panel or the console may read it). Filters by kind and file, a search, one line per global (defined, written, read in N files) that opens to the files and lines, and a view by file.
- Watch out: files that did not change are not read again (memory in the page; in SBC mode also in the watch file). On a standalone Duet the budget is small (the files come through the board).

### 3.7 Snapshots
- What: save the whole model or the selected branch under a name (`0:/sys/workshop-model-snapshots.json`), compare two snapshots or one with the model now (changed, added, removed), export one as a JSON file and import one back.
- Watch out: on a standalone Duet the plugin keeps 4 snapshots of up to 4000 values (the file goes through the board); in SBC mode 20 of up to 10000. The oldest goes when a new one does not fit.

### 3.8 Expression tester
- What: write an RRF expression (sent with `echo`) or a path (read with `M409`) and see the answer of the board in place, with a short history. It only reads: one line, through the command preview with one tap; an expression that starts with `>` (which would write a file) is refused.

### 3.9 Start-up card
- Rows: the connection, the firmware with global variables, the include line of the persistence macro (when you keep globals), the SBC mode extras (done from DWC, no plugin on the Pi). Every row says what it is, what it is for, what happens without it and how to do it.

### 3.10 With a Raspberry Pi (SBC mode)
- What turns on by itself (DSF 3.4 or newer, plugin support): the watch history and the memory of the usage finder kept in `0:/sys/workshop-model-watch.json`, the wide budget of the usage finder and of the snapshots, and the process state of the plugins of the Pi in the Plugins card. The header says "SBC mode, extras on" (or off) or "Standalone".

## 4. Settings

No settings page. In this browser: the chosen view, the density, the favourites, the folded groups of globals, the scope of the usage finder and the watch list. On the SD card: `0:/sys/workshop-globals.g` (persistence macro), `0:/sys/workshop-model-presets.json` (presets), `0:/sys/workshop-model-snapshots.json` (snapshots) and, in SBC mode, `0:/sys/workshop-model-watch.json`. The include line for `config.g` is yours to add.

## 5. Roles

Any role can read the model, the globals, the watch list and the snapshots and use the expression tester. Editing a global, applying or deleting a preset, saving, deleting or importing a snapshot and writing the persistence macro need the technician or administrator role when the workshop service with users is installed; without it (or without users) everybody can edit.

## 6. API operations used

None of WorkshopService. The plugin uses the machine API of DWC itself: the object model, sending G-code (`set global...`, `global ...`, `echo`, `M409`, `M98`) and reading and writing files on the SD card (`rr_` on a standalone Duet, the DSF file API with a Pi; files are written as `application/octet-stream`, otherwise DSF leaves them empty).

## 7. Troubleshooting

1. A global goes back to its old value after a reboot: mark it as kept and add the include line to `config.g` (the start-up card copies it).
2. The SBC row is grey: the Duet is standalone; the extras of 3.10 do not apply and everything else works.
3. "Cannot delete": RRF keeps a global until the next reboot; take its line out of the persistence macro and reboot.
4. The usage finder reads few files on a standalone Duet: its budget is small there; narrow the scope to where your macros are.
5. The firmware row is red: the RepRapFirmware of the board has no global variables; update the firmware.
6. The Changes view looks empty: the noise is hidden by default; the chip says how many paths were hidden.

<!-- permissions:start -->

## Permissions and what it changes

Risk: **Medium (it changes global variables that your macros read, and sends the G-code you confirm)**. Read this before installing; the full document is `security.md` of the Workshop plugins.

**DSF permissions:** none. It is a page of DWC (it runs in your browser) and talks to the board through the file and G-code API of DWC itself (`rr_` on a standalone Duet, DSF with a Raspberry Pi); it does not use `WorkshopService`.

**Files it writes:**
- the persistence macro `0:/sys/workshop-globals.g` for the globals you mark as persistent (generated by the plugin; you include it from `config.g`)
- its presets in `0:/sys/workshop-model-presets.json`, its snapshots of the model in `0:/sys/workshop-model-snapshots.json` and, in SBC mode, the watch history with the memory of the usage finder in `0:/sys/workshop-model-watch.json`

**Safety notes:**
- It needs no backend and no DSF permissions: it talks to the board through the file and G-code API of DWC itself (`rr_` on a standalone Duet, DSF with a Raspberry Pi).
- The functions that need a Raspberry Pi (history kept on the Pi, background usage index, persistence applied at boot) turn on by themselves in SBC mode and are hidden on a standalone Duet.
- RRF cannot delete a global until a restart: the plugin says so instead of offering a delete button.
- The expression tester only sends `echo` or `M409` through the command preview, one line, and refuses an expression that starts with `>` (a write to a file).

Uninstalling removes the plugin folder; your data in `0:/sys/workshop/` and `/opt/dsf/conf/workshop-*.json` stays.

<!-- permissions:end -->

## 8. Limits

The SBC extras need SBC mode. DWC 3.6.x and 3.7.x only.

