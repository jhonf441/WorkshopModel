<template>
	<v-card class="mb-3">
		<v-card-text>
			<div class="mo-part"><v-icon size="20" class="mr-1">mdi-flask-outline</v-icon>{{ t('tester_title') }}</div>
			<div class="mo-faint mb-2">{{ t('tester_help') }}</div>
			<view-tabs :choices="TESTER_MODES" :current="mode" :label="t('tester_mode')" class="mb-2" @pick="mode = $event" />
			<choice-help :choice="modeChoice" :title="t(modeChoice.label)" class="mb-2" />
			<v-text-field ref="field" v-model="text" density="compact" variant="outlined" hide-details spellcheck="false" class="mo-code-field" :label="t('tester_input')" :placeholder="t('tester_input_hint_' + mode)" @keydown.enter.prevent @keydown.tab="onTab" @keyup="remember" @click="remember" @blur="remember" />
			<div class="mo-snippet mt-1">
				<span class="mo-faint">{{ t('tester_examples') }}</span>
				<v-btn v-for="e in examples" :key="e" size="x-small" variant="text" class="mo-code-btn" @click="text = e">{{ e }}</v-btn>
				<v-btn size="x-small" variant="text" :disabled="!text" @click="text = ''">{{ t('tester_clear') }}</v-btn>
				<v-btn size="x-small" variant="text" :disabled="!canKeep" :aria-pressed="kept ? 'true' : 'false'" :title="t(kept ? 'saved_kept' : 'saved_save')" :aria-label="t(kept ? 'saved_kept' : 'saved_save')" @click="toggleKeep"><v-icon size="18">{{ kept ? 'mdi-star' : 'mdi-star-outline' }}</v-icon></v-btn>
			</div>
			<div class="mo-faint mo-xb-cursor" role="status">
				<template v-if="under.path">
					{{ t('pick_cursor') }}: <code class="mo-key">{{ under.path }}</code>
					<template v-if="under.found"><kind-chip :kind="under.kind" /> <span class="mo-value">{{ under.branch ? '' : under.text }}</span></template>
					<template v-else>{{ t('pick_cursor_missing', { path: under.path }) }}</template>
				</template>
				<template v-else>{{ t('pick_cursor_none') }}</template>
			</div>
			<hole-assist v-if="holeList.length" :holes="holeList" :hole="currentHole" @fill="fill" @prev="goHole(prevHole(holeList, currentHole ? currentHole.start : text.length, true))" @next="goHole(nextHole(holeList, currentHole ? currentHole.end : 0, true))" @go="goHole" @pick="pickPath" />
			<div v-if="!command.ok && text.trim() && command.error !== 'placeholder'" class="mo-error" role="alert">{{ t('tester_err_' + command.error) }}</div>
			<template v-if="notes.length">
				<div v-for="n in notes" :key="n.key" :class="n.level === 'error' ? 'mo-error' : 'mo-faint mo-xb-warn'" :role="n.level === 'error' ? 'alert' : 'status'"><span v-if="n.level !== 'error'" class="wf-state" :class="n.level === 'warn' ? 'warn' : 'info'"></span>{{ n.text }}</div>
				<choice-help :choice="checksHelp" :title="t('guided_checks')" />
			</template>

			<div class="mo-part mt-3">{{ t('tester_builder') }}</div>
			<view-tabs :choices="BUILDER_TABS" :current="tab" :label="t('tester_builder')" class="mb-2" @pick="tab = $event" />
			<choice-help :choice="tabChoice" :title="t(tabChoice.label)" class="mb-2" />
			<path-picker v-if="tab === 'paths'" :tick="tick" :wanted="pathWanted" :hole-name="currentHole ? currentHole.text : ''" @insert="put" />
			<catalog-panel v-else-if="tab === 'catalog'" :firmware="firmware" :context="catalogContext" @insert="putExpression" />
			<recipes-panel v-else-if="tab === 'recipes'" :tick="tick" @load="loadRecipe" />
			<saved-panel v-else :items="favorites" @load="loadSaved" @remove="removeSaved" @add="addSaved" />

			<command-preview :code="command.ok ? command.code : ''" :can-send="canSend" :editable="false" :disabled-reason="disabledReason" :disabled-title="disabledTitle" @sent="onSent" />
			<live-control :live="live" :tier="tier" :can-start="canSend" :disabled-title="disabledTitle" @start="start" @stop="live = stopLive(live, 'manual')" />
			<expression-result v-if="result" :result="result" />
			<div class="mo-part mt-3">{{ t('tester_history') }}</div>
			<div v-if="!history.length" class="mo-faint">{{ t('tester_history_none') }}</div>
			<table v-else class="mo-table">
				<tbody>
					<tr v-for="h in history" :key="h.code">
						<td class="mo-key">{{ h.code }}</td>
						<td class="mo-value" :class="{ 'mo-result-bad': !h.ok }">{{ h.text }}</td>
						<td class="mo-row-actions"><v-btn size="x-small" variant="text" @click="reuse(h)">{{ t('tester_use') }}</v-btn></td>
					</tr>
				</tbody>
			</table>
		</v-card-text>
	</v-card>
</template>

<script setup>
// The expression builder (expression-tester.js and the expression-*.js modules): an expression or a path, ONE command that only reads
// (echo or M409). It is built with the paths of the live model, the catalog of what an expression can do, ready recipes and the
// saved ones; checked while it is written (the lint and the type checker of expression-types.js: a problem blocks Send with its
// reason, a warning only says); the blanks of a form are filled one by one with the hole assistant (HoleAssist.vue, the one place
// that says a blank is open; Send carries the same sentence as its tooltip); sent through the command preview with one tap, or
// re-evaluated every N seconds (the live preview, one call at a time). The answer is shown with its type, an error with what it
// means. A path chosen with Test in the detail panel arrives as `prefill`.
import { computed, nextTick, ref, watch } from 'vue'
import { i18n } from './dwc-host.js'
import { liveModel, sendCode } from './model-host.js'
import ViewTabs from './ViewTabs.vue'
import ChoiceHelp from './ChoiceHelp.vue'
import CommandPreview from './CommandPreview.vue'
import KindChip from './KindChip.vue'
import PathPicker from './PathPicker.vue'
import CatalogPanel from './CatalogPanel.vue'
import RecipesPanel from './RecipesPanel.vue'
import SavedPanel from './SavedPanel.vue'
import LiveControl from './LiveControl.vue'
import ExpressionResult from './ExpressionResult.vue'
import HoleAssist from './HoleAssist.vue'
import { TESTER_MODES, testerCommand, pushHistory, isModelPath } from './expression-tester.js'
import { BUILDER_TABS, DEFAULT_BUILDER_TAB } from './expression-builder.js'
import { insertAt, holesOf, isPlaceholder, pathAtCursor } from './expression-insert.js'
import { lintExpression, lintBlocks } from './expression-lint.js'
import { checkExpression } from './expression-types.js'
import { describeHoles, holeAt, nextHole, prevHole, insideString, GUIDED_HELP } from './expression-holes.js'
import { valueAt } from './expression-paths.js'
import { describeReply, RESULT_TYPES } from './expression-result.js'
import { newLive, startLive, stopLive, liveDue, liveSent, liveDone, liveStopReason } from './expression-live.js'
import { loadFavorites, saveFavorites, addFavorite, removeFavorite, hasFavorite, isFavoritesFull } from './expression-favorites.js'
import { firmwareVersionOf } from './rrf-version.js'
import { detectTier } from './tier.js'
import { choiceOf } from './view-choices.js'
import { getAtPath } from './model-path.js'
import { isBranch } from './value-format.js'
import { previewOf } from './command-preview.js'

const EXAMPLES = { echo: ['state.status', '#move.axes', 'move.axes[0].userPosition', 'floor(state.upTime / 60)'], m409: ['state', 'move.axes[0]', 'heat.heaters[0]'] }

const props = defineProps({
	tick: { type: Number, default: 0 },
	connected: { type: Boolean, default: false },
	prefill: { type: String, default: '' }
})

const t = (k, p) => i18n.t('plugins.WorkshopModel.model.' + k, p)
const storage = () => (typeof localStorage === 'undefined' ? null : localStorage)
// a type of expression-types.js in words
const word = type => (RESULT_TYPES.indexOf(type) >= 0 ? t('rtype_' + type) : type === 'path' ? t('guided_need_path') : String(type || ''))

const field = ref(null)
const mode = ref('echo')
const text = ref('')
const tab = ref(DEFAULT_BUILDER_TAB)
const result = ref(null)
const history = ref([])
const favorites = ref(loadFavorites(storage()))
const live = ref(newLive())
const selection = ref(null)
const cursor = ref(0)
const pathWanted = ref('')
const checksHelp = GUIDED_HELP.checks

const modeChoice = computed(() => choiceOf(TESTER_MODES, mode.value) || TESTER_MODES[0])
const tabChoice = computed(() => choiceOf(BUILDER_TABS, tab.value) || BUILDER_TABS[0])
const examples = computed(() => EXAMPLES[mode.value] || [])
const firmware = computed(() => {
	void props.tick
	return firmwareVersionOf(liveModel()) || ''
})
const tier = computed(() => {
	void props.tick
	return detectTier(liveModel())
})
const command = computed(() => {
	const e = text.value.trim()
	const branch = mode.value === 'm409' && isModelPath(e) && isBranch(getAtPath(liveModel(), e))
	return testerCommand(mode.value, text.value, branch)
})
const warnings = computed(() => {
	void props.tick
	return mode.value === 'echo' ? lintExpression(text.value, liveModel()) : []
})
// the type checker runs only on an expression whose brackets and quotes are whole
const check = computed(() => {
	void props.tick
	if (mode.value !== 'echo' || lintBlocks(warnings.value)) return null
	return checkExpression(text.value, { model: liveModel(), firmware: firmware.value })
})
const notes = computed(() => {
	const out = warnings.value.map(w => ({ level: w.kind === 'global_missing' ? 'warn' : 'error', text: t('lint_' + w.kind, { what: w.what }), key: 'lint_' + w.kind + w.what }))
	for (const f of check.value ? check.value.findings : []) {
		const key = 'guided_check_' + f.kind + (f.kind === 'path_missing' && f.closest ? '_closest' : '')
		out.push({ level: f.level, key: f.kind + f.start, text: t(key, { what: f.what, op: f.op, need: word(f.need), got: word(f.got), left: word(f.left), right: word(f.right), n: f.n, max: f.max, version: f.version, closest: f.closest }) })
	}
	return out
})
const blocked = computed(() => notes.value.filter(n => n.level === 'error').length)
const holeList = computed(() => {
	void props.tick
	return describeHoles(text.value, check.value, liveModel())
})
const currentHole = computed(() => holeAt(holeList.value, selection.value))
const catalogContext = computed(() => {
	const sel = selection.value
	const chosen = sel && sel.end > sel.start ? text.value.slice(sel.start, sel.end) : ''
	const selected = chosen && !isPlaceholder(chosen) ? { text: chosen, type: checkExpression(chosen, { model: liveModel(), firmware: firmware.value }).type } : null
	return { inString: insideString(text.value, cursor.value), hole: currentHole.value, selection: selected }
})
const canSend = computed(() => props.connected && command.value.ok && !blocked.value)
const disabledReason = computed(() => (!props.connected ? t('tester_offline') : blocked.value ? t('guided_blocked', { n: blocked.value }) : ''))
const disabledTitle = computed(() => (command.value.error === 'placeholder' && holeList.value.length ? t('tester_err_placeholder', { what: holeList.value[0].text }) : ''))
const under = computed(() => {
	void props.tick
	const path = pathAtCursor(text.value, cursor.value)
	return Object.assign({ path }, valueAt(liveModel(), path))
})
const kept = computed(() => hasFavorite(favorites.value, mode.value, text.value))
const canKeep = computed(() => kept.value || (command.value.ok && !isFavoritesFull(favorites.value)))

watch(() => props.prefill, p => {
	if (p) text.value = p
}, { immediate: true })
watch(command, () => { result.value = null })
watch(currentHole, h => { if (!h) pathWanted.value = '' })

function inputEl() {
	const root = field.value && field.value.$el
	return root && root.querySelector ? root.querySelector('input') : null
}
function remember() {
	const el = inputEl()
	if (!el) return
	selection.value = { start: el.selectionStart, end: el.selectionEnd }
	cursor.value = el.selectionStart
}
async function select(start, end) {
	await nextTick()
	const el = inputEl()
	if (!el) return
	el.focus()
	el.setSelectionRange(start, end)
	remember()
}
// the snippet goes where the cursor is; its first blank is selected, or else the next blank of the text, so filling goes on
async function put(snippet) {
	const r = insertAt(text.value, selection.value || { start: text.value.length, end: text.value.length }, snippet)
	text.value = r.text
	let sel = { start: r.start, end: r.end }
	if (r.start === r.end) {
		const next = nextHole(holesOf(r.text), r.end, true)
		if (next) sel = { start: next.start, end: next.end }
	}
	await select(sel.start, sel.end)
}
function putExpression(snippet) {
	mode.value = 'echo'
	put(snippet)
}
function fill(snippet) {
	if (currentHole.value) selection.value = { start: currentHole.value.start, end: currentHole.value.end }
	put(snippet)
}
function goHole(h) {
	if (h) select(h.start, h.end)
}
// Tab from a selected blank goes to the next one (Shift+Tab to the previous); from anywhere else it leaves the field as usual
function onTab(e) {
	const h = currentHole.value
	if (!h) return
	const target = e.shiftKey ? prevHole(holeList.value, h.start, false) : nextHole(holeList.value, h.end, false)
	if (!target) return
	e.preventDefault()
	goHole(target)
}
function pickPath(wanted) {
	pathWanted.value = wanted || ''
	tab.value = 'paths'
}
function loadRecipe(r) {
	mode.value = r.mode
	text.value = r.code
}
function loadSaved(x) {
	mode.value = x.mode
	text.value = x.text
}
function removeSaved(x) {
	favorites.value = removeFavorite(favorites.value, x.mode, x.text)
	saveFavorites(storage(), favorites.value)
}
// a recipe file brought in through the Saved tab (RecipeImport.vue)
function addSaved(x) {
	favorites.value = addFavorite(favorites.value, x)
	saveFavorites(storage(), favorites.value)
}
function toggleKeep() {
	const e = text.value.trim()
	favorites.value = kept.value ? removeFavorite(favorites.value, mode.value, e) : addFavorite(favorites.value, { mode: mode.value, text: e })
	saveFavorites(storage(), favorites.value)
}

function onSent(reply) {
	const r = describeReply(mode.value, reply, text.value)
	result.value = r
	history.value = pushHistory(history.value, { code: command.value.code, mode: mode.value, input: text.value.trim(), ok: r.ok, text: r.text.split('\n')[0] })
}
function reuse(h) {
	mode.value = h.mode
	text.value = h.input
}

// ---- the live preview: the page's tick is the clock; one evaluation at a time ----
function start(seconds) {
	live.value = startLive(live.value, seconds, tier.value)
	step()
}
watch(() => props.tick, step)
async function step() {
	if (!live.value.on) return
	const reason = liveStopReason(live.value, { connected: props.connected, valid: canSend.value && previewOf(command.value.code).level === 1, tier: tier.value })
	if (reason) {
		live.value = stopLive(live.value, reason)
		return
	}
	if (!liveDue(live.value, Date.now())) return
	live.value = liveSent(live.value, Date.now())
	const sent = { mode: mode.value, text: text.value }
	try {
		const reply = await sendCode({ code: command.value.code, log: false })
		result.value = describeReply(sent.mode, reply, sent.text)
		if (!result.value.ok) live.value = stopLive(live.value, 'error')
	} catch (e) {
		live.value = stopLive(live.value, 'error')
	}
	live.value = liveDone(live.value)
}
</script>

<style>
/* The expression builder: the panels, the entries of the catalog and the live row; lines and gray only (DESIGN.md section 3) */
.mo-page .mo-xb-panel { border: 1px solid rgba(128, 128, 128, 0.25); border-radius: 8px; padding: 8px 10px; margin-bottom: 8px; max-height: 360px; overflow: auto; }
.mo-page .mo-xb-groups { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
.mo-page .mo-xb-entry { padding: 6px 0; border-bottom: 1px solid rgba(128, 128, 128, 0.15); font-size: 13px; }
.mo-page .mo-xb-entry-head { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.mo-page .mo-xb-off { opacity: 0.6; }
.mo-page .mo-xb-code { display: block; white-space: normal; word-break: break-all; }
.mo-page .mo-xb-crumb { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
.mo-page .mo-xb-typed { display: flex; align-items: center; gap: 8px; }
.mo-page .mo-xb-cursor { min-height: 28px; margin-top: 4px; }
.mo-page .mo-xb-warn { margin: 2px 0; }
.mo-page .mo-xb-live { margin-top: 12px; }
.mo-page .mo-xb-live-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 6px 0; }
.mo-page .mo-xb-select { border: 1px solid rgba(128, 128, 128, 0.5); border-radius: 4px; padding: 4px 8px; min-height: 32px; background: transparent; color: inherit; }
</style>
