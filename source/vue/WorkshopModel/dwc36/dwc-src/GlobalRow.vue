<template>
	<article class="mo-gcard" :class="{ 'mo-gcard-kept': item.persistent, 'mo-gcard-open': expanded || editing, 'mo-gcard-novalue': noValue, 'mo-gcard-click': !detail, 'mo-gcard-detail': detail }" :aria-label="item.name" @click="onRowClick">
		<span v-if="flash" :key="item.changedAt" class="mo-gcard-glow" aria-hidden="true"></span>
		<div class="mo-gcard-head">
			<favorite-star :path="item.path" :pinned="pinned" @pin="onPin" @unpin="onUnpin" />
			<span class="mo-gcard-name" :title="hoverText">{{ item.name }}</span>
			<kind-chip v-if="!noValue" :info="chip" />
			<template v-else><span class="mo-pill mo-pill-dot mo-pill-quiet">{{ t('look_card_novalue') }}</span><help-tip :title="t('look_card_novalue')" :what="t('look_card_novalue_help')" /></template>
		</div>
		<div v-if="!detail" class="mo-gcard-watch">
			<v-btn small text :aria-pressed="item.watched ? 'true' : 'false'" :aria-label="(item.watched ? t('watch_remove') : t('watch_add')) + ': ' + item.name" @click="$emit(item.watched ? 'unwatch' : 'watch', item.path)"><v-icon small left>{{ item.watched ? 'mdi-eye-off-outline' : 'mdi-eye-outline' }}</v-icon>{{ item.watched ? t('watch_remove') : t('watch_add') }}</v-btn>
		</div>
		<div class="mo-gcard-body">
			<label v-if="quick === 'bool'" class="mo-gcard-switch">
				<v-switch :input-value="draftBool" dense inset color="success" hide-details :aria-label="t('globals_quick_label', { name: item.name })" @change="setDraft($event ? 'true' : 'false')" />
				<span class="mo-gcard-value">{{ draftBool ? t('look_card_on') : t('look_card_off') }}</span>
			</label>
			<div v-else-if="quick === 'number'" class="mo-gcard-stepper" role="group" :aria-label="t('globals_quick_label', { name: item.name })">
				<button type="button" class="mo-gcard-step" :aria-label="t('look_card_minus', { name: item.name })" :title="t('look_card_minus', { name: item.name })" @click="step(-1)"><v-icon small>mdi-minus</v-icon></button>
				<v-text-field :value="draft" dense outlined hide-details inputmode="decimal" class="mo-gcard-num" :aria-label="t('globals_quick_label', { name: item.name })" @input="typeNumber($event)" @keydown.enter="arm" />
				<button type="button" class="mo-gcard-step" :aria-label="t('look_card_plus', { name: item.name })" :title="t('look_card_plus', { name: item.name })" @click="step(1)"><v-icon small>mdi-plus</v-icon></button>
				<button v-if="draft !== current && !armed" type="button" class="mo-gcard-step mo-gcard-apply" :aria-label="t('look_card_apply')" :title="t('look_card_apply')" @click="arm"><v-icon small>mdi-check</v-icon></button>
			</div>
			<span v-else-if="noValue" class="mo-gcard-value mo-gcard-value-text mo-faint">{{ t('unit_none') }}</span>
			<span v-else-if="!(detail && item.summary.long)" class="mo-gcard-value" :class="{ 'mo-gcard-value-text': item.kind === 'string' }" :title="hoverText">{{ item.summary.short }}</span>
		</div>
		<pre v-if="detail && item.summary.long" class="mo-result-text mo-gcard-full">{{ item.summary.full }}</pre>
		<div class="mo-gcard-marks">
			<template v-if="item.persistent"><span class="wf-state ok">{{ t('look_card_kept') }}</span><help-tip :title="t('look_card_kept')" :what="t('persist_help')" /></template>
			<span v-if="item.watched" class="mo-gcard-mark"><v-icon x-small>mdi-eye-outline</v-icon>{{ t('look_card_watched') }}</span>
			<span v-if="item.usedIn !== null && !detail" class="mo-gcard-mark"><v-icon x-small>mdi-file-document-outline</v-icon>{{ t('globals_used_in', { n: item.usedIn }) }}</span>
			<button v-else-if="item.usedIn !== null" type="button" class="mo-gcard-mark mo-gcard-markbtn" :aria-expanded="showFiles ? 'true' : 'false'" @click="showFiles = !showFiles"><v-icon x-small>mdi-file-document-outline</v-icon>{{ t('globals_used_in', { n: item.usedIn }) }}<v-icon x-small>{{ showFiles ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon></button><help-tip v-if="detail" :title="t('globals_used_in', { n: item.usedIn })" :what="t('globals_used_help')" />
			<span v-if="ago" class="mo-gcard-mark"><v-icon x-small>mdi-clock-outline</v-icon>{{ t('look_card_changed_ago', { ago: t(ago.key, { n: ago.n }) }) }}</span>
			<span v-if="!detail" class="mo-gcard-mark"><v-icon x-small>mdi-pencil-box-outline</v-icon>{{ t('globals_assigned') }}: {{ assignedText }}</span>
		</div>
		<assigned-in v-if="detail" :setters="setters" @open="openSetter" @scan="$emit('scan-usage')" />
		<div v-if="detail && showFiles" class="mo-gfiles mo-fade-in">
			<div class="mo-part">{{ t('globals_used_where') }}</div>
			<div v-if="!usageFiles.length" class="mo-faint">{{ t('globals_used_none') }}</div>
			<ul v-else class="mo-gfiles-list">
				<li v-for="f in usageFiles" :key="f.path" class="mo-gfile">
					<code class="mo-gfile-path mo-files" :title="f.path">{{ f.path }}</code>
					<usage-lines :path="f.path" :lines="linesOf(f)" :name="item.name" :open="peek" @open="onOpen" />
					<span v-if="f.guarded" class="mo-faint">{{ t('globals_used_guarded', { n: f.guarded }) }}</span>
				</li>
			</ul>
		</div>
		<div v-if="quickResult" class="mo-gcard-preview mo-fade-in">
			<div v-if="feedback.level === 'error'" class="mo-error" role="alert">{{ t(feedback.key) }}</div>
			<command-preview v-else :code="quickResult.code" :can-send="canEdit && globalsOk" :disabled-reason="canEdit ? '' : readOnlyLine(t('read_only'))" :editable="false" @sent="onSent" />
		</div>
		<global-editor v-if="editing" class="mo-gcard-edit mo-fade-in" :name="item.name" :exists="true" :value="item.value" :can-edit="canEdit" :globals-ok="globalsOk" :persistent="item.persistent" :show-persist="true" @persist="onPersist" />
		<div v-if="detail" class="mo-gdetail-actions">
			<div class="wf-actions">
				<v-btn small outlined :aria-pressed="editing ? 'true' : 'false'" :disabled="!canEdit || !globalsOk" @click="editing = !editing"><v-icon small left>mdi-pencil-outline</v-icon>{{ t('edit_value_open') }}</v-btn>
				<v-btn small outlined @click="$emit('select', item.path)"><v-icon small left>mdi-file-tree</v-icon>{{ t('open_in_tree') }}</v-btn>
				<v-btn small outlined @click="$emit(item.watched ? 'unwatch' : 'watch', item.path)"><v-icon small left>{{ item.watched ? 'mdi-eye-off-outline' : 'mdi-eye-outline' }}</v-icon>{{ item.watched ? t('watch_remove') : t('watch_add') }}</v-btn>
			</div>
			<lock-reason min="technician" />
		</div>
	</article>
</template>

<script>
'use strict'
import { readOnlyNote } from './read-only-note.js'

// One global of the Globals section as a card (a tidy row in the compact density): the star, the name, the kind as a chip (or a calm
// "no value yet" pill), the value big and readable, the marks in words (kept after restart, watched, in how many files, changed N s
// ago), and the quick edit in place: a switch for a boolean and a stepper for a number (globals-quick.js: the step follows the
// decimals), which prepares the exact command in the command preview (one tap more to send, the rules of command-preview.js). A card
// glows for a moment when its value changes. Actions (one place each): the star favourites, a click on the row opens the detail, Watch is a visible button in the list; the typed editor and Open in the tree are buttons of the detail.
import i18n from '../../i18n'
import KindChip from './KindChip.vue'
import FavoriteStar from './FavoriteStar.vue'
import CommandPreview from './CommandPreview.vue'
import GlobalEditor from './GlobalEditor.vue'
import { kindInfo } from './value-kind.js'
import { editCommand, editText } from './globals-typing.js'
import { quickKind, stepped, recentlyChanged, changedAgo, hasNoValue, editFeedback } from './globals-quick.js'
import UsageLines from './UsageLines.vue'
import AssignedIn from './AssignedIn.vue'
import LockReason from './LockReason.vue' // vue/_shared36
import HelpTip from './HelpTip.vue' // vue/_shared36
import { usageOf } from './usage-view.js'
import { linesOfFile, assignedSetters, assignedLine, assignedSummary } from './usage-lines.js'

export default {
	mixins: [readOnlyNote],
	components: { KindChip, FavoriteStar, CommandPreview, GlobalEditor, UsageLines, AssignedIn, LockReason, HelpTip },
	props: {
		item: { type: Object, required: true },
		pinned: { type: Array, default: () => [] },
		canEdit: { type: Boolean, default: true },
		globalsOk: { type: Boolean, default: true },
		tick: { type: Number, default: 0 },
		usageCache: { type: Map, default: () => new Map() },
		detail: { type: Boolean, default: false } // inside the detail dialog: everything open; in the list: a clean row that opens the dialog
	},
	data() {
		// the draft starts as the live value: an untouched card never shows a command, let alone a red message (globals-quick.js)
		return { expanded: false, editing: false, draft: editText(this.item.value), armed: false, showFiles: this.detail, peek: null }
	},
	computed: {
		now() {
			void this.tick
			return Date.now()
		},
		chip() {
			return kindInfo(this.item.value, this.item.path)
		},
		// what the pointer shows over the name or the value: the path and, when the value is long, all of it (the card itself shows the basics)
		hoverText() {
			const full = this.item.summary && this.item.summary.full
			return full && full !== this.item.summary.short ? this.item.path + String.fromCharCode(10) + full : this.item.path
		},
		noValue() {
			return hasNoValue(this.item.value)
		},
		current() {
			return editText(this.item.value)
		},
		quick() {
			return this.globalsOk && !this.noValue ? quickKind(this.item.kind, this.canEdit) : ''
		},
		draftBool() {
			return this.draft === 'true'
		},
		pending() {
			return this.draft !== '' && this.draft !== this.current && (this.quick === 'bool' || this.armed)
		},
		quickResult() {
			return this.pending ? editCommand(this.item.name, this.item.kind, this.draft, true) : null
		},
		// the quick edit is always a change the person made (a tap, a key): its message may be red
		feedback() {
			return editFeedback(true, this.quickResult, true)
		},
		flash() {
			return recentlyChanged(this.item.changedAt, this.now)
		},
		ago() {
			return changedAgo(this.item.changedAt, this.now)
		},
		// where the global is created or set (E6): for every global, with a value or without
		setters() {
			return assignedSetters(this.usageCache, this.item.name)
		},
		assignedText() {
			const s = assignedSummary(assignedLine(this.setters))
			return s.text || this.t(s.key, s.params)
		},
		// only worked out when the list is open: every file of the memory of the usage finder is looked through
		usageFiles() {
			return this.showFiles ? usageOf(this.usageCache, this.item.name) : []
		}
	},
	watch: {
		// a new value from the machine resets the draft unless the person is changing it
		current: {
			immediate: true,
			handler(v) {
				if (!this.pending) this.draft = v
			}
		}
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		},
		// every use of this global in a file as one chip per line, like the By file tab of Usage (usage-lines.js)
		linesOf(f) {
			return linesOfFile(f)
		},
		// a click on the row (not on a control inside it) opens the detail of this global
		onRowClick(ev) {
			if (this.detail) return
			const t = ev && ev.target
			if (t && t.closest && t.closest('button, input, a, label, .v-input, .mo-gcard-watch, .mo-gcard-stepper, .mo-gcard-switch, .mo-gcard-edit')) return
			this.$emit('detail', this.item.name)
		},
		// the file that sets it, open in the small viewer at its first define or set line
		openSetter(f) {
			const u = usageOf(this.usageCache, this.item.name).find(x => x.path === f.path)
			this.showFiles = true
			this.peek = { path: f.path, line: f.line, kind: u && u.define.indexOf(f.line) >= 0 ? 'define' : 'set' }
			this.showPeek()
		},
		// a chip of UsageLines: its viewer opens (or closes when null)
		onOpen(open) {
			this.peek = open
			if (open) this.showPeek()
		},
		// the viewer opens under the file of the chip: in a long list that is below the part of the dialog the person sees, so it is brought into view
		showPeek() {
			this.$nextTick(() => {
				const el = this.$el && this.$el.querySelector && this.$el.querySelector('.mo-gfile-peek')
				if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
			})
		},
		setDraft(v) {
			this.draft = v
		},
		// typing a number: the command waits for Enter or the check, so a half-written number is not judged
		typeNumber(v) {
			this.draft = v === null || v === undefined ? '' : String(v)
			this.armed = false
		},
		arm() {
			this.armed = true
		},
		// one tap of the stepper: the new number and its command at once
		step(dir) {
			this.draft = stepped(this.item.kind, this.draft, dir)
			this.armed = true
		},
		onSent() {
			this.armed = false
		},
		onPin(path) {
			this.$emit('pin', path)
		},
		onUnpin(path) {
			this.$emit('unpin', path)
		},
		onPersist(name, literal) {
			this.$emit('persist', name, literal)
		}
	}
}
</script>

<style>
/* GlobalRow: the glow of a value that just changed is an overlay that is born again on every change, so the animation restarts */
.mo-page .mo-gcard-glow { position: absolute; inset: 0; border-radius: inherit; pointer-events: none; animation: mo-glow 2.4s ease-out; }
.mo-page .mo-gdetail-actions { margin-top: 10px; }
.mo-page .mo-gdetail-actions .wf-actions { display: flex; flex-wrap: wrap; gap: 8px; }
@media (prefers-reduced-motion: reduce) { .mo-page .mo-gcard-glow { animation: none; background: rgba(251, 140, 0, 0.18); } }
</style>
