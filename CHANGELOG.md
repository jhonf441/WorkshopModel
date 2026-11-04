# WorkshopModel -- historial de versiones

## 1.7.11 -- 2026-11-03

- Model: menu at row end, hover detail, no overflow, alerts help tips

## 1.7.10 -- 2026-11-03

- Model: Favoritos como seccion propia, Globales ordenado, usos como en Uso

## 1.7.9 -- 2026-11-03

- Model: advanced expression builder and setter links on globals

## 1.7.8 -- 2026-11-03

- Model: files list of a global opens with lines and viewer, scan button, tidy compact cards

## 1.7.7 -- 2026-11-03

- Dialogs: room above the first line (create global, share recipe)

## 1.7.6 -- 2026-11-03

- Share-recipe dialog: real head and fixed foot

## 1.7.5 -- 2026-11-03

- Model: tidy watch list, where a global is used, usage legend, send from snippets, file viewer centering

## 1.7.4 -- 2026-11-03

- Model: new-global dialog styled, where a global is used (files, lines, viewer), usage legend, DWC version select in the report

## 1.7.3 -- 2026-11-03

- A topic that opens another part of the model scrolls back to the top of the page

## 1.7.2 -- 2026-11-03

- Expression builder: Insert fills the open blank, the field and the search stay in view, colours per type, focus jumps to the next blank, one dot per note

## 1.7.1 -- 2026-11-03

- Expression checks: a leading echo is not a path

## 1.7.0 -- 2026-11-03

- Model Explorer 1.7.0: guided expression builder, community recipes, friendlier redesign

- Community recipes: the Recipes tab of the expression builder lists, next to the recipes built from the model, the ones people contribute as JSON files in `recipes/` of the plugin source (public repository `jhonf441/WorkshopModel`), bundled into the plugin at build time through the generated module `community-recipes-data.js` (`node vue/WorkshopModel/tools/check-recipes.js --write`); the page never fetches anything. A community card shows a Community chip (Example on the ones that ship with the plugin), the author, the blanks to fill with their type and description, the example and the first RRF that has it; the ones the board's firmware lacks are hidden behind a button that says how many. Filter by source (All, Built-in, Community) and a search over title, description, formula, tags and author.
- Recipe file format (`CONTRIBUTING-RECIPES.md`, with a Spanish copy): id, title and description in en (es optional), kind (expression, condition, m409, echo), template with typed holes `<name>`, hole descriptions, `since`, example with the expected answer, author, tags. `recipe-schema.js` (`validateRecipe`) is the one judge: it refuses unknown fields, unbalanced brackets, a hole without a description, an example that is not the template filled, and private data (IP addresses, web addresses, PC paths, network shares). `test/recipe-schema.test.js` validates every file of `recipes/`, fails on a duplicate id and when the generated module is out of date. Five sample recipes (a machine idle and a heater cool, a fan as a percentage, supply voltage under a limit, processor temperature, everything about one axis with M409).
- Share this recipe: on a saved formula (Saved tab) and on any recipe card, a dialog that turns it into a recipe file (every row with its help: identifier, title, description, kind, formula with blanks, each blank, first RRF, example and answer, author, tags, publishing), checked while it is edited with the problems in plain words, the file to copy or download (`<id>.json`, through the exchange standard), and, only when the file is short and clean, GitHub pages pre-filled through their address (a new file in the recipes folder, or an issue). Nothing is read from the board and nothing is sent by the page: the steps to open the pull request or the issue are listed.
- Import a recipe file into the saved formulas: pasted or chosen from the PC (exchange standard), checked with `validateRecipe` first, added with its title as the name; the saved list shows the name over the formula.
- New modules `recipe-schema.js`, `recipe-share.js`, `community-recipes.js`, `community-recipes-data.js` (generated), tool `tools/check-recipes.js`, components `ShareRecipeDialog.vue`, `RecipeImport.vue`; `RecipesPanel.vue` and `SavedPanel.vue` reworked; both DWC lines from the same pure modules, with tests for every module, the texts and the rendering. The export of the plugin repository carries the recipes folder, the tool and the contributing guides.
- Expression builder: guided filling of the blanks, checks that stop nonsense, one hole notice, firmware version rule
- One hole notice: a blank left in a form (written between < and >) is said in ONE place, the hole assistant under the field, with the expression shown and the blank marked; the Send and Start buttons are disabled with that sentence as their tooltip and nothing else repeats it (the lint no longer warns about blanks).
- Hole assistant (new component `HoleAssist.vue`, module `expression-holes.js`): for the blank the cursor is on it says what goes there (a number, an angle in radians, a text, a file, true or false, any value, a path, a list, a position in a list, an axis, a heater, a tool, a fan, a global, a variable name, a parameter letter), where it sits (the side of an operator, the argument of a function, a position in a list, the condition of ? :) and the choices this board really has: the axes with their letter, the heaters, the tools and fans with their name, the globals the board has now, the lists of the model, true and false, radians( ) for an angle, and the value the other side has right now when the blank is compared with a path; a field to type a value (quoted by itself for a text, one upper-case letter for a parameter) and a button to pick a path of the model, with the Paths tab filtered to the type the blank wants (Show every path undoes it). Previous and next blank; Tab and Shift+Tab move between blanks while one is selected; filling one selects the next. Every blank of every catalog entry carries its kind (`holes` in `expression-catalog.js`, `since` kept).
- Checks while you write (modules `expression-tokens.js` and `expression-types.js`): the expression is read and typed before anything is sent, with the live model giving the type of every path. A problem blocks Send and says why in one sentence: a text or a boolean where a number is needed (+ - * / comparisons, the math and angle functions), a text compared with a number, && or || on something that is not true or false, # of something that is not a list or a text, [ ] on something that is not a list, a position that is not a number or past the end of the list (with how many items it has), a wrong number of arguments, exists() on something that is not a path, dividing by 0, an operator RRF does not have (&, |, %), single quotes, something missing after an operator, something left over. A warning only says: a path the model does not have, with the closest real path ("Did you mean move.axes?"), joining a list into a text, the two results of ? : of different types; var.* and param.* get a note that they only exist inside a macro. A value that is null now is unknown, never wrong; an open bracket or quote stops the checker (the lint says it).
- Version rule: a function name the catalog does not know is a problem only when the board runs a firmware the catalog covers (its major.minor is not newer than the newest `since`, 3.5 today); on a newer firmware (RRF 3.6 and up) it is a neutral note saying it may be newer than this plugin knows, and the expression is sent as written. A known function the firmware lacks says which version it needs.
- Catalog: a form that makes no sense where the cursor is (inside a text; into a blank that wants another type, for example abs( ) into a true-or-false blank; around a selection whose type its first blank cannot take, for example abs( ) around a text) is dimmed with the reason on it, and a tap on Insert says that one sentence instead of inserting. A selected blank is replaced by the form, never wrapped into it.
- Help folds (what it is, what for, without it, how) for the hole assistant and for the checks; texts `guided_*` in both languages of both lines.
- Tests: `expression-guided` (pure rules, texts, wiring of the components) in both lines, `guided-render` (the pieces rendered with a fake model) in the 3.6 line; `expression-builder` updated. The pure modules and the catalogs are byte-identical in both lines; the DWC 3.7 components carry the same changes but were not rendered in a test.

- Friendlier look of the whole plugin (DWC 3.6 line first; the 3.7 line carries the same pieces): every section opens with one head (a soft icon box, the title, one lead line, pills on the right), rounded cards, calmer lines, empty states that say what the section is for and what to do first, a skeleton while a file of the board is read, notes with a dot and a word instead of bare gray lines, a glow on a value that just changed (topic rows, global cards), 44 px targets on a touch screen and rows that wrap on a phone instead of scrolling sideways. New `look.css` (mo-* classes only, on top of the design family), the side bar in four short groups (See, Change, Keep, Check) with a hint under the finger and a count next to Globals, Watch and Alerts (`look-nav.js`), section colors for Alerts and Report. The standalone-Duet line under the banner is gone (the chip in the bar says it); an SBC with its extras off keeps its note.
- Globals, redesigned to be friendly at first sight: a head with the counts (globals, kept after restart, watched); one search and one New button; a row of chips (All, the kinds, Kept after restart, Watched, Changed just now, and the order that cycles on a tap); the groups by the start of the name as before, now with one card per global: the name, the kind chip, the value big and readable, the marks in words (Kept after restart, Watched, in N files, changed N s ago), the quick edit in place (a switch with On / Off for a boolean, a stepper with - and + for a number whose step follows the decimals of the value, Enter or the check prepares the command) and one menu for the rest. The compact density turns the cards into tidy rows. The starred globals show on top in the same favourites strip as the Model section; a tap on one narrows the list to it. Empty: a card that explains what a global is and offers to create the first one; on a board older than RRF 3.4: a calm card that says why. New guided creator in three steps (name checked as typed and against the globals that exist, the type as big choices with one line each and a help fold, the value with the exact command before it is sent; Number decides whole or decimal by what is typed), then "Created, create another". New module `globals-quick.js`, component `GlobalCreator.vue`.
- A global without a value is no longer an error: it gets a calm "No value yet" pill, a dash instead of a value and one line that says who may fill it (from the memory of the usage finder: "A macro sets it: file", "No file read so far sets it", or "Run the usage finder to see which file sets it"). The typed editor never shows a red message on an untouched field: a hint ("This global has no value yet. Type one to set it.") and the Send button simply waits; red comes only after the person typed something wrong or pressed apply (`globals-quick.js` editFeedback, hasNoValue, settersOf, fillerLine). A boolean card no longer shows "Write a value" on opening (its draft started empty).
- The name is shown BEFORE saving: the snapshot and the preset fields come pre-filled with the default name ("Snapshot 2026-11-03 09:05", "Globals 2026-11-03 09:05", numbered when taken), editable, following the scope and the clock until the person writes their own, a cleared field shows the default again, and one line says "It will be saved as: ..." (red with the rule when the name is not valid). The exports say the file name they will download as (snapshots, presets, watch CSV and JSON, the report). New module `name-default.js`.
- Snapshots: what to keep is chosen inside the section: Whole model, or A part of the model with a picker (one-tap chips for what is selected in the Model section, the favourite branches, the parts used before and the roots of the model, plus a search over the branches by name), and a line always says in words what will be saved and about how many values ("Only move.axes - about 24 values"). It works with nothing selected in Model. The list is item rows (name, covers, values, saved when) with Compare with now, Export and Delete; the budget is a quiet pill with the long text in a fold. New module `snapshot-scope.js`, component `BranchPicker.vue`.
- Favourites: a clear strip on top of the Model section whatever the view (a head with the count, readable pills with the name over the live value, one tap to open the detail, the tree icon for the technical tree, the cross to unpin, a gone path says so; empty it explains the star and that starred globals show there too); the star is bigger (36 px, 44 on touch, full-size icon). The Model head says Live or Paused.
- Presets: the same head, pills, item rows with the state as a dot and words ("All as on the machine"), empty state, the name shown before saving. Watch: rows that wrap (path, value big, min and max, the line, the actions), the recent changes as lines with before -> after, empty states, a pill that says where the list is saved. Alerts and Report: the same head and notes, the long help in a fold.
- Texts: every new text under `look_*` in en.json and es.json of both lines; the scope choice "Selected branch" is now "A part of the model" with its help rewritten.
- Tests: `globals-quick`, `name-default`, `snapshot-scope`, `look-nav`, `look-i18n` in both lines; `dwc36/test/look-render.test.js` renders the cards, the editor on a global without a value, the creator, the Globals section (with globals, empty, off), the persistence panel, the favourites strip, the branch picker, the star and the glow of a topic row; the 3.7 render test of the Globals and Snapshots sections updated to the new structure (the create button reads "New global", the scope reads "A part of the model").

## 1.6.4 -- 2026-11-03

- Globals: no false 'type a value' error on boolean rows

## 1.6.3 -- 2026-11-03

- Usage finder: migration copies, unread folders, exists() guards

## 1.6.2 -- 2026-11-03

- Menu icon is a telescope

## 1.6.1 -- 2026-11-02

- Usage section redesign (cards, one search, by global / by file / by macro, detail panel, options menu), default snapshot name

## 1.6.0 -- 2026-11-02

- Snapshots: when no name is typed the snapshot gets one by itself ("Snapshot 2026-11-02 09:05", with the last part of the branch when it is not the whole model, numbered when the name is taken); the field shows it as the placeholder.
- Model Explorer 1.6.0: expression builder, path dictionary, quick diagnosis, search by value, support report, watch export, macro map, in-page alerts

### 1.6.0 details: path dictionary, quick diagnosis, search by value

- Path dictionary, quick diagnosis and search by value (DWC only: no service, no SBC)
- Path dictionary: the detail panel of any path now says what it means, its unit, whether it can be changed and with which G-code (heat.heaters[0].active: M104, M140, M141, G10; fans: M106; tool offsets: G10; axis limits: M208; and so on) and the first RepRapFirmware that has it, with a fold of help. About 175 patterns with wildcards for the indexes cover move, heat, fans, tools, sensors, boards, state, job, network, directories, limits, volumes, inputs, spindles, global, plugins, sbc and messages; the most specific pattern wins; a path below its firmware version says the board is probably too old for it, and with no version reported nothing is hidden; a path the dictionary does not know says so. New modules `path-dictionary.js` and `path-dictionary-data.js`, component `PathMeaning.vue`.
- Quick diagnosis: a first card on the Topics view that gathers everything abnormal in one look, errors first: stepper drivers (stall, overtemperature warning and shutdown, open load, short, error; RRF 3.5 and newer), supply voltage and 12 V rail low or high, processor temperature, heaters in fault, offline or above their limit, temperature sensors that report a fault, filament monitors in error, volumes not mounted (volume 0 is an error), network interfaces disabled or without link, a halted or powered-off machine, a start-up error, error messages in the model and (with the SBC tier) plugins that lost their process. Each line has a fold that says what it means and what to check, and Open. With nothing wrong it says how many checks ran; a check whose branch the model does not have is skipped and not counted. New modules `diagnosis.js`, `diagnosis-rules.js`, `diagnosis-driver.js`, `diagnosis-helpers.js`, component `DiagnosisCard.vue`; `topic-catalog.js` exports `diagnosisTopic()` and the list of cards is unchanged.
- Search by value: the Flat list has a switch Names / Values. Values looks only at what the values are, over the whole model: a word (contains), `=idle` or `"idle"` (equals), `!=0`, `>30`, `>=30`, `<5`, `<=5`, `10..20`, `true`, `false`, `null`, `empty`; a line under the box says how the text was read and an operator without a number says it was not understood. Filters, sort and pages work on the matches. New module `value-search.js`.
- Tests in both lines: `path-dictionary`, `diagnosis`, `value-search`, `part-a-i18n`, `part-a-wiring` (and `part-a-render` for 3.7). The pure modules are byte-identical in both lines.

### 1.6.0 details: support report, watch export, macro map, alerts

- Machine report for support, watch export, macro and parameter map, in-page alerts
- Report section: a markdown text in English (firmware, boards, DWC and DSF versions, SBC yes or no, plugins, sensors, drivers, network state, heaters, volumes, active warnings) ready for the Duet forum or a GitHub issue, copied or downloaded as .md. Built from a fixed list of fields; machine name, hostname, IP addresses, MAC, board serial numbers and file paths are left out unless their own tick box is on (each with its help), user names, passwords and the Wi-Fi name are never read, and free texts are scrubbed.
- Watch export: the watch list as CSV (one column per path, ISO times, numbers, booleans and texts) or JSON, and the Changes events as CSV, over a range (everything, last minute, 5, 15 minutes, last hour).
- Macro map in the Usage section: per macro file its parameters (required or optional, guards such as exists(param.S), defaults, abort when missing), the globals it reads, writes or defines, the macros it calls with M98 and what it passes, who calls it, and a one-line example of how to call it; searchable, with filters. The usage scan keeps the map of each file it reads (memory only).
- Alerts section and banner: rules on any path (above, below, equal to a word, changes to a word) with hysteresis and cooldown, a banner on every section while a rule fires, a list of recent events with recoveries, an optional sound (off by default); saved in this browser. They work only while the page is open: nothing runs on the Pi and nothing is sent to a phone.
- Both lines (3.6 and 3.7) from the same pure modules, with tests for every module, the texts and the rendering.

### 1.6.0 details: usage section and expression builder

- Usage section redesigned to be read at a glance: three big cards (Problems, To check, Everything) with a number, a color and one plain sentence each that filter the list, and a friendly all-clear state when there is no problem; one search box that finds a global or a file by name; three tabs next to each other, By global (one row per global with small bars for created, written and read and a sentence such as "Read in 28 files, nobody creates it"; a click opens every file and line grouped by file, with Open in the tree, Copy the name and Copy file:line), By file (a file always shows what it uses, never an empty no-problems message; a search or a picked file looks at everything) and By macro (the macro map, unchanged). A progress bar shows the file being read. One banner with one button reads the folders that were left out. What to read, the kinds of use and the file filter moved into a folded Options menu. Short animations that stop with the system reduced-motion setting, hover and focus states, empty states with a hint. New module `usage-phrase.js` and the card, file and detail rules in `usage-view.js`; new components `UsageCards.vue`, `UsageRow.vue`, `UsageDetail.vue`, `UsageBanner.vue`, `UsageScanBar.vue` and `UsageOptions.vue`; the pure modules are byte-identical in both lines.
- Expression builder: paths of the model, catalog of what an expression can do, recipes, saved expressions, typed result with plain-words errors, live preview
- The Expression tester section is now a builder, with echo and M409 working as before. Four tabs under the field: Paths (any path of the live model with a search, its type and value now, inserted at the cursor), What you can write (a searchable catalog in groups: operators, text, math, angles, lists and exists(), values and variables, model paths, G-code forms; each entry has a one-line explanation, an example and the first RRF version that has it; what the connected firmware lacks is hidden, with a button to show it marked "needs RRF x.y"; inserting selects the first blank so you type over it, and a selection is wrapped into it), Recipes (ready expressions built from the real paths of the machine: a heater above a limit, an axis inside its limits, a job running and its layer, a global or a default with exists(), the bed temperature) and Saved (favourites kept with a star in this browser, 30 at most).
- Checked while you write, with no call to the board: the value and type of the path under the cursor, an unclosed bracket or quote, a blank left in, a global that does not exist and is not guarded by exists(). A blank left in blocks the command.
- The answer shows its type (number, true or false, text, list, object, no value) and, when the board answers with an error, what it means in plain words with a hint (unknown name, unknown function, bad operator, list position out of range, wrong type, division by zero, unclosed text, malformed expression); the board text stays below.
- Live preview: evaluates again every N seconds, one call at a time, with the page tick as the clock (a hidden page costs nothing). A standalone Duet waits at least 5 s between runs and stops after 60; the SBC tier allows 2 s and 600. It also stops when the board goes offline or the expression stops being valid. Needs no WorkshopService and no SBC.


## 1.5.1 -- 2026-11-02

- Usage finder: definitions always read from 0:/sys, rows with separated parts, maybe-created hint

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
