# WorkshopModel: the contract of a view of the live model

The Model section of Model Explorer (`TreeSection.vue`, both lines) shows the same live object model in several views picked with a
selector of tabs: Topics (default), Flat list, the technical Tree, and the views added later (Columns, Browse, Changes). This file says
what a view receives, what it may emit and how it is registered. `test/view-contract.test.js` (and its 3.6 copy) checks it.

## Files

- One component per view, `<Name>View.vue`, with the SAME name in both lines: `dwc-src/` (DWC 3.7, Vue 3, `<script setup>`) and
  `dwc36/dwc-src/` (DWC 3.6, Vue 2, options API with `export default {` and every child component in `components`).
- Its logic in pure modules (`<name>.js`, no Vue, no DWC), byte-identical in both lines, with a node test in `test/` and the same test
  in `dwc36/test/` (they import `../dwc-src/<name>.js`, so each line tests its own copy).
- Texts: only keys of `plugins.WorkshopModel.model.*` through the helper
  `const t = (k, p) => i18n.t('plugins.WorkshopModel.model.' + k, p)` (3.7: `import { i18n } from './dwc-host.js'`;
  3.6: `import i18n from '../../i18n'` and `t` as a method). New keys of a view built on another branch come as fragments
  `dwc-src/i18n/views2.en.json` and `views2.es.json` (same shape as the catalogs: `{ "model": { ... } }`); the wiring merges them into
  `en.json` / `es.json` of both lines (the catalogs of the two lines are byte-identical) and deletes the fragments. No `|`, no `@`, no
  brace that is not a placeholder `{name}`, no emojis or symbols.
- Look (DESIGN.md): Vuetify components, gray structure icons, neutral outlined chips (a state is a dot + the word: `.wf-state ok|warn|err|info`),
  `.wf-cat` only for filters by category, `.wf-tabs` / `.wf-tab` for a second level, colors only by meaning or theme variables
  (`var(--tp-faint)`, `var(--tp-font-mono)`, `rgba(128,128,128,x)` lines), never a raw color. Own CSS in an unscoped `<style>` of the view
  with selectors `.mo-page .mo-<view>-...` (the page root has the class `mo-page`); never restyle the family (bar, menu, cards, buttons).
- Code, comments and file names in English; small functions, one responsibility per file (tests/estructura.test.js: 100 lines per function,
  800 per file).

## Props (every view declares ALL of them, even the ones it does not use)

TreeSection passes the same set to whichever view is open (`v-bind`), so a prop a view does not declare would fall through to its root
element as an attribute (Vue 3 prints `[object Object]`). Copy this block.

| Prop | Type | Default | What it is |
|---|---|---|---|
| `tick` | Number | 0 | +1 once a second while the page is open (also while paused). Read it (`void props.tick`) in a computed that reads `model`. |
| `model` | Object | null | The live object model, raw (3.7: `toRaw` of the store; 3.6: the Vuex state). Read only. Branches are `ModelObject`, arrays (`ModelCollection`) and `Map` (`global`, `plugins`): walk them with `model-tree.js` `childrenOf` / `model-path.js` `getAtPath`, never by hand. |
| `leaves` | Array | [] | Every leaf of the last sample, model order: `{ path, key, kind, text, value }` (`flat-list.js` `flattenModel`; `kind` from `value-format.js` `kindOf`, `text` its one-line `formatValue`, `value` the plain value or null for an empty branch). A new array each sample; frozen while paused. At most `FLAT_MAX` (6000). |
| `truncated` | Boolean | false | The model had more leaves than `FLAT_MAX`. |
| `changes` | Array | [] | Every change of a leaf since the page opened, newest first, at most `MODEL_CHANGES_CAP` (300): `{ path, before, after, t }` (`model-changes.js`, `change-diff.js`). A path that appears or disappears is not a change. |
| `changeTimes` | Map | new Map() | path -> time in ms of its last change. "Changed recently" = within `RECENT_MS` (60 s) of `Date.now()`. |
| `selected` | String | '' | The selected path ('' = none). |
| `watched` | Array | [] | The paths of the watch list. |
| `pinned` | Array | [] | The favourite paths (pins.js, remembered in this browser; PinnedStrip.vue shows them on top). |
| `density` | String | 'comfortable' | 'comfortable' or 'compact' (density.js, DensitySwitch.vue; the section root also carries the class `mo-density-<value>`). |
| `paused` | Boolean | false | Sampling is paused: `leaves`, `changes` and `changeTimes` do not move. |
| `globalsOk` | Boolean | true | RepRapFirmware 3.4 or newer (`rrf-version.js`, GLOBALS_MIN_RRF, an owner decision): the globals features may be offered. |
| `tier` | Object | `{ sbc: false, extras: false }` | `tier.js` `detectTier()`: SBC-only extras are offered only when `tier.extras`. |

3.7: `defineProps({ tick: { type: Number, default: 0 }, model: { type: Object, default: null }, leaves: { type: Array, default: () => [] }, truncated: { type: Boolean, default: false }, changes: { type: Array, default: () => [] }, changeTimes: { type: Map, default: () => new Map() }, selected: { type: String, default: '' }, watched: { type: Array, default: () => [] }, pinned: { type: Array, default: () => [] }, density: { type: String, default: 'comfortable' }, paused: { type: Boolean, default: false }, globalsOk: { type: Boolean, default: true }, tier: { type: Object, default: () => ({ sbc: false, extras: false }) } })`.
3.6: the same object as `props: { ... }`.

## Events (a view emits only these; all are optional)

| Event | Payload | What the section does |
|---|---|---|
| `select` | path | Selects it; a `split` view shows its detail beside the view. |
| `open` | path | Opens it in the technical Tree view (switches the view, unfolds the branches down to it). |
| `watch` / `unwatch` | path | Adds it to / removes it from the watch list. |
| `pin` / `unpin` | path | Adds it to / removes it from the favourites (pins.js). |
| `clear-changes` | none | Forgets the recorded changes (the Changes view). |

3.7: `defineEmits(['select', 'open', 'watch', 'unwatch', 'pin', 'unpin', 'clear-changes'])`. 3.6: `this.$emit('select', path)` etc. Emit only
the names of this table.

## Registration (done by the wiring, not by the view)

1. `view-choices.js` `VIEW_CHOICES`: `choice('<id>', 'mdi-<icon>', 'full' | 'split')`. The author supplies the help keys of the choice in the
   fragment: `view_<id>` (the tab label), `view_<id>_what`, `view_<id>_why`, `view_<id>_missing`, `view_<id>_help` (DESIGN.md section 7).
2. `TreeSection.vue` of both lines: the component in `VIEW_COMPONENTS` (3.7: `{ <id>: <Name>View }`; 3.6: registered in `components`
   and named in `VIEW_COMPONENTS`).
3. Pieces that are not views (density switch, favourites strip, type chip) are plain components with their own small props, wired by
   hand into the section toolbar: suggested `DensitySwitch.vue` (props `current`; event `pick` with the id; choices and the storage key
   in a pure module with the same help keys), `PinnedStrip.vue` (props `pinned`, `tick`, `model`; events `select`, `open`, `unpin`;
   storage in a pure `pins.js`), `KindChip.vue` (prop `kind`, a neutral outlined chip with a gray icon). localStorage keys in English,
   prefixed `workshopModel`.

## Limits

- At most `FLAT_PAGE` (200) rows on screen at once (`flat-list.js` `pageOf`, a "Show more" button); the model can have thousands of leaves.
- Nothing is written to the machine by a view; a command goes through `CommandPreview.vue` (one tap for meta commands and reads, double tap
  for any other G or M code).
- A view works on a standalone Duet: no Pi-side process, no SBC-only file. What needs the SBC is offered only with `tier.extras`.
