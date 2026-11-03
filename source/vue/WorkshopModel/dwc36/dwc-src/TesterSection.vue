<template>
	<v-card class="mb-3">
		<v-card-text>
			<div class="mo-part"><v-icon :size="20" class="mr-1">mdi-flask-outline</v-icon>{{ t('tester_title') }}</div>
			<div class="mo-faint mb-2">{{ t('tester_help') }}</div>
			<view-tabs :choices="TESTER_MODES" :current="mode" :label="t('tester_mode')" class="mb-2" @pick="mode = $event" />
			<choice-help :choice="modeChoice" :title="t(modeChoice.label)" class="mb-2" />
			<div class="mo-xb-sticky">
				<v-text-field ref="field" v-model="text" dense outlined hide-details spellcheck="false" class="mo-code-field" :label="t('tester_input')" :placeholder="t('tester_input_hint_' + mode)" @keydown.enter.prevent @keydown.tab="onTab" @keyup="remember" @click="remember" @blur="remember" />
			</div>
			<div class="mo-snippet mt-1">
				<span class="mo-faint">{{ t('tester_examples') }}</span>
				<v-btn v-for="e in examples" :key="e" x-small text class="mo-code-btn" @click="text = e">{{ e }}</v-btn>
				<v-btn x-small text :disabled="!text" @click="text = ''">{{ t('tester_clear') }}</v-btn>
				<v-btn x-small text :disabled="!canKeep" :aria-pressed="kept ? 'true' : 'false'" :title="t(kept ? 'saved_kept' : 'saved_save')" :aria-label="t(kept ? 'saved_kept' : 'saved_save')" @click="toggleKeep"><v-icon :size="18">{{ kept ? 'mdi-star' : 'mdi-star-outline' }}</v-icon></v-btn>
			</div>
			<div class="mo-faint mo-xb-cursor" role="status">
				<template v-if="under.path">
					{{ t('pick_cursor') }}: <code class="mo-key">{{ under.path }}</code>
					<template v-if="under.found"><kind-chip :kind="under.kind" /> <span class="mo-value">{{ under.branch ? '' : under.text }}</span></template>
					<template v-else>{{ t('pick_cursor_missing', { path: under.path }) }}</template>
				</template>
				<template v-else>{{ t('pick_cursor_none') }}</template>
			</div>
			<hole-assist v-if="holeList.length" :holes="holeList" :hole="goal" @fill="fill" @prev="goHole(prevHole(holeList, goal ? goal.start : text.length, true))" @next="goHole(nextHole(holeList, goal ? goal.end : 0, true))" @go="goHole" @pick="pickPath" />
			<div v-if="!command.ok && text.trim() && command.error !== 'placeholder'" class="mo-error" role="alert">{{ t('tester_err_' + command.error) }}</div>
			<template v-if="notes.length">
				<div v-for="n in notes" :key="n.key" :class="n.level === 'error' ? 'mo-error' : 'mo-faint mo-xb-warn'" :role="n.level === 'error' ? 'alert' : 'status'"><span v-if="n.level !== 'error'" class="wf-state" :class="n.level === 'warn' ? 'warn' : 'info'"></span>{{ n.text }}</div>
				<choice-help :choice="checksHelp" :title="t('guided_checks')" />
			</template>

			<div class="mo-part mt-3">{{ t('tester_builder') }}</div>
			<view-tabs :choices="BUILDER_TABS" :current="tab" :label="t('tester_builder')" class="mb-2" @pick="tab = $event" />
			<choice-help :choice="tabChoice" :title="t(tabChoice.label)" class="mb-2" />
			<path-picker v-if="tab === 'paths'" :tick="tick" :wanted="pathWanted" :hole-name="goal ? goal.text : ''" @insert="put" />
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
						<td class="mo-row-actions"><v-btn x-small text @click="reuse(h)">{{ t('tester_use') }}</v-btn></td>
					</tr>
				</tbody>
			</table>
		</v-card-text>
	</v-card>
</template>

<script>
'use strict'

// The expression builder (expression-tester.js and the expression-*.js modules): an expression or a path, ONE command that only reads
// (echo or M409). It is built with the paths of the live model, the catalog of what an expression can do, ready recipes and the
// saved ones; checked while it is written (the lint and the type checker of expression-types.js: a problem blocks Send with its
// reason, a warning only says); the blanks of a form are filled one by one with the hole assistant (HoleAssist.vue, the one place
// that says a blank is open; Send carries the same sentence as its tooltip); sent through the command preview with one tap, or
// re-evaluated every N seconds (the live preview, one call at a time). The answer is shown with its type, an error with what it
// means. A path chosen with Test in the detail panel arrives as `prefill`.
import i18n from '../../i18n'
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
import { describeHoles, holeAt, targetHole, nextHole, prevHole, insideString, GUIDED_HELP } from './expression-holes.js'
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
const storage = () => (typeof localStorage === 'undefined' ? null : localStorage)

export default {
	components: { ViewTabs, ChoiceHelp, CommandPreview, KindChip, PathPicker, CatalogPanel, RecipesPanel, SavedPanel, LiveControl, ExpressionResult, HoleAssist },
	props: {
		tick: { type: Number, default: 0 },
		connected: { type: Boolean, default: false },
		prefill: { type: String, default: '' }
	},
	data() {
		return {
			mode: 'echo', text: '', tab: DEFAULT_BUILDER_TAB, result: null, history: [], favorites: loadFavorites(storage()), live: newLive(),
			selection: null, cursor: 0, pathWanted: '', checksHelp: GUIDED_HELP.checks, TESTER_MODES, BUILDER_TABS
		}
	},
	computed: {
		modeChoice() {
			return choiceOf(TESTER_MODES, this.mode) || TESTER_MODES[0]
		},
		tabChoice() {
			return choiceOf(BUILDER_TABS, this.tab) || BUILDER_TABS[0]
		},
		examples() {
			return EXAMPLES[this.mode] || []
		},
		firmware() {
			void this.tick
			return firmwareVersionOf(liveModel()) || ''
		},
		tier() {
			void this.tick
			return detectTier(liveModel())
		},
		command() {
			const e = this.text.trim()
			const branch = this.mode === 'm409' && isModelPath(e) && isBranch(getAtPath(liveModel(), e))
			return testerCommand(this.mode, this.text, branch)
		},
		warnings() {
			void this.tick
			return this.mode === 'echo' ? lintExpression(this.text, liveModel()) : []
		},
		// the type checker runs only on an expression whose brackets and quotes are whole
		check() {
			void this.tick
			if (this.mode !== 'echo' || lintBlocks(this.warnings)) return null
			return checkExpression(this.text, { model: liveModel(), firmware: this.firmware })
		},
		notes() {
			const out = this.warnings.map(w => ({ level: w.kind === 'global_missing' ? 'warn' : 'error', text: this.t('lint_' + w.kind, { what: w.what }), key: 'lint_' + w.kind + w.what }))
			for (const f of this.check ? this.check.findings : []) {
				const key = 'guided_check_' + f.kind + (f.kind === 'path_missing' && f.closest ? '_closest' : '')
				out.push({ level: f.level, key: f.kind + f.start, text: this.t(key, { what: f.what, op: f.op, need: this.word(f.need), got: this.word(f.got), left: this.word(f.left), right: this.word(f.right), n: f.n, max: f.max, version: f.version, closest: f.closest }) })
			}
			return out
		},
		blocked() {
			return this.notes.filter(n => n.level === 'error').length
		},
		holeList() {
			void this.tick
			return describeHoles(this.text, this.check, liveModel())
		},
		currentHole() {
			return holeAt(this.holeList, this.selection)
		},
		// the blank an insertion goes to: the one under the cursor, else the next open one (never beside an open blank)
		goal() {
			return targetHole(this.holeList, this.selection, this.cursor)
		},
		catalogContext() {
			const sel = this.selection
			const chosen = sel && sel.end > sel.start ? this.text.slice(sel.start, sel.end) : ''
			const selected = chosen && !isPlaceholder(chosen) ? { text: chosen, type: checkExpression(chosen, { model: liveModel(), firmware: this.firmware }).type } : null
			return { inString: insideString(this.text, this.cursor), hole: this.goal, selection: selected }
		},
		canSend() {
			return this.connected && this.command.ok && !this.blocked
		},
		disabledReason() {
			return !this.connected ? this.t('tester_offline') : this.blocked ? this.t('guided_blocked', { n: this.blocked }) : ''
		},
		disabledTitle() {
			return this.command.error === 'placeholder' && this.holeList.length ? this.t('tester_err_placeholder', { what: this.holeList[0].text }) : ''
		},
		under() {
			void this.tick
			const path = pathAtCursor(this.text, this.cursor)
			return Object.assign({ path }, valueAt(liveModel(), path))
		},
		kept() {
			return hasFavorite(this.favorites, this.mode, this.text)
		},
		canKeep() {
			return this.kept || (this.command.ok && !isFavoritesFull(this.favorites))
		}
	},
	watch: {
		prefill: {
			immediate: true,
			handler(p) {
				if (p) this.text = p
			}
		},
		text() {
			this.result = null
		},
		mode() {
			this.result = null
		},
		goal(h) {
			if (!h) this.pathWanted = ''
		},
		tick() {
			this.step()
		}
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		},
		// a type of expression-types.js in words
		word(type) {
			return RESULT_TYPES.indexOf(type) >= 0 ? this.t('rtype_' + type) : type === 'path' ? this.t('guided_need_path') : String(type || '')
		},
		stopLive,
		nextHole,
		prevHole,
		inputEl() {
			const root = this.$refs.field && this.$refs.field.$el
			return root && root.querySelector ? root.querySelector('input') : null
		},
		remember() {
			const el = this.inputEl()
			if (!el) return
			this.selection = { start: el.selectionStart, end: el.selectionEnd }
			this.cursor = el.selectionStart
		},
		async select(start, end) {
			await this.$nextTick()
			const el = this.inputEl()
			if (!el) return
			el.focus()
			el.setSelectionRange(start, end)
			this.remember()
		},
		// the snippet goes where the cursor is; its first blank is selected, or else the next blank of the text, so filling goes on
		async put(snippet) {
			let at = this.selection || { start: this.text.length, end: this.text.length }
			const goal = this.goal
			if (goal && at.start === at.end) at = { start: goal.start, end: goal.end }
			const r = insertAt(this.text, at, snippet)
			this.text = r.text
			let sel = { start: r.start, end: r.end }
			if (r.start === r.end) {
				const next = nextHole(holesOf(r.text), r.end, true)
				if (next) sel = { start: next.start, end: next.end }
			}
			await this.select(sel.start, sel.end)
		},
		putExpression(snippet) {
			this.mode = 'echo'
			this.put(snippet)
		},
		fill(snippet) {
			if (this.goal) this.selection = { start: this.goal.start, end: this.goal.end }
			this.put(snippet)
		},
		goHole(h) {
			if (h) this.select(h.start, h.end)
		},
		// Tab from a selected blank goes to the next one (Shift+Tab to the previous); from anywhere else it leaves the field as usual
		onTab(e) {
			const h = this.currentHole
			if (!h) return
			const target = e.shiftKey ? prevHole(this.holeList, h.start, false) : nextHole(this.holeList, h.end, false)
			if (!target) return
			e.preventDefault()
			this.goHole(target)
		},
		pickPath(wanted) {
			this.pathWanted = wanted || ''
			this.tab = 'paths'
		},
		loadRecipe(r) {
			this.mode = r.mode
			this.text = r.code
		},
		loadSaved(x) {
			this.mode = x.mode
			this.text = x.text
		},
		removeSaved(x) {
			this.favorites = removeFavorite(this.favorites, x.mode, x.text)
			saveFavorites(storage(), this.favorites)
		},
		// a recipe file brought in through the Saved tab (RecipeImport.vue)
		addSaved(x) {
			this.favorites = addFavorite(this.favorites, x)
			saveFavorites(storage(), this.favorites)
		},
		toggleKeep() {
			const e = this.text.trim()
			this.favorites = this.kept ? removeFavorite(this.favorites, this.mode, e) : addFavorite(this.favorites, { mode: this.mode, text: e })
			saveFavorites(storage(), this.favorites)
		},
		onSent(reply) {
			const r = describeReply(this.mode, reply, this.text)
			this.result = r
			this.history = pushHistory(this.history, { code: this.command.code, mode: this.mode, input: this.text.trim(), ok: r.ok, text: r.text.split('\n')[0] })
		},
		reuse(h) {
			this.mode = h.mode
			this.text = h.input
		},
		// the live preview: the page's tick is the clock; one evaluation at a time
		start(seconds) {
			this.live = startLive(this.live, seconds, this.tier)
			this.step()
		},
		async step() {
			if (!this.live.on) return
			const valid = this.canSend && previewOf(this.command.code).level === 1
			const reason = liveStopReason(this.live, { connected: this.connected, valid, tier: this.tier })
			if (reason) {
				this.live = stopLive(this.live, reason)
				return
			}
			if (!liveDue(this.live, Date.now())) return
			this.live = liveSent(this.live, Date.now())
			const sent = { mode: this.mode, text: this.text }
			try {
				const reply = await sendCode({ code: this.command.code, log: false })
				this.result = describeReply(sent.mode, reply, sent.text)
				if (!this.result.ok) this.live = stopLive(this.live, 'error')
			} catch (e) {
				this.live = stopLive(this.live, 'error')
			}
			this.live = liveDone(this.live)
		}
	}
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
/* what is being built stays in view: the expression field sticks under the DWC bar while the page scrolls, and the search and the groups of each
   list stick to the top of the list's own scroll (the groups and the search never scroll away) */
.mo-page .mo-xb-sticky { position: sticky; top: 64px; z-index: 6; background: var(--wf-surface); padding: 6px 0 2px; }
.mo-page .mo-xb-head { position: sticky; top: -8px; z-index: 3; background: var(--wf-surface); padding: 8px 0 2px; }
@media (max-width: 959px) { .mo-page .mo-xb-sticky { top: 56px; } }
/* the blank asks for a type: each type has its colour (number blue, text green, true or false orange, path teal, list purple, a part of the machine red) */
.mo-page .mo-xb-assist { --mo-xb-c: rgba(128, 128, 128, 0.7); border-left: 4px solid var(--mo-xb-c); }
.mo-page .mo-xb-k-number, .mo-page .mo-xb-k-angle, .mo-page .mo-xb-k-index { --mo-xb-c: #1e88e5; }
.mo-page .mo-xb-k-text, .mo-page .mo-xb-k-file, .mo-page .mo-xb-k-name, .mo-page .mo-xb-k-letter { --mo-xb-c: #43a047; }
.mo-page .mo-xb-k-bool { --mo-xb-c: #fb8c00; }
.mo-page .mo-xb-k-path, .mo-page .mo-xb-k-global { --mo-xb-c: #00acc1; }
.mo-page .mo-xb-k-array { --mo-xb-c: #8e24aa; }
.mo-page .mo-xb-k-axis, .mo-page .mo-xb-k-heater, .mo-page .mo-xb-k-tool, .mo-page .mo-xb-k-fan { --mo-xb-c: #e53935; }
.mo-page .mo-xb-assist mark.mo-xb-hole { background: color-mix(in srgb, var(--mo-xb-c) 35%, transparent); box-shadow: inset 0 -2px 0 var(--mo-xb-c); }
.mo-page .mo-xb-assist .mo-xb-ask { font-weight: 600; }
.mo-page .mo-xb-assist .mo-xb-ask::before { content: ''; display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; background: var(--mo-xb-c); }
</style>
