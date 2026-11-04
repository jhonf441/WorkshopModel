<template>
	<article class="mo-gcard" :class="{ 'mo-gcard-kept': item.persistent, 'mo-gcard-open': expanded || editing, 'mo-gcard-novalue': noValue, 'mo-gcard-click': !detail, 'mo-gcard-detail': detail }" :aria-label="item.name" @click="onRowClick">
		<span v-if="flash" :key="item.changedAt" class="mo-gcard-glow" aria-hidden="true"></span>
		<div class="mo-gcard-head">
			<favorite-star :path="item.path" :pinned="pinned" @pin="onPin" @unpin="onUnpin" />
			<span class="mo-gcard-name" :title="hoverText">{{ item.name }}</span>
			<kind-chip v-if="!noValue" :info="chip" />
			<span v-else class="mo-pill mo-pill-dot mo-pill-quiet" :title="t('look_card_novalue_help')">{{ t('look_card_novalue') }}</span>
		</div>
		<div class="mo-gcard-menu">
			<v-menu offset-y>
				<template #activator="{ on, attrs }">
					<v-btn small icon v-bind="attrs" :aria-label="t('globals_menu', { name: item.name })" :title="t('globals_menu', { name: item.name })" v-on="on"><v-icon small>mdi-dots-vertical</v-icon></v-btn>
				</template>
				<v-list dense>
					<v-list-item v-if="!detail" @click="$emit('detail', item.name)"><v-list-item-icon><v-icon small>mdi-text-box-search-outline</v-icon></v-list-item-icon><v-list-item-title>{{ t('globals_detail_open') }}</v-list-item-title></v-list-item>
					<v-list-item v-if="detail" :disabled="!canEdit || !globalsOk" @click="editing = !editing"><v-list-item-icon><v-icon small>mdi-pencil-outline</v-icon></v-list-item-icon><v-list-item-title>{{ t('edit') }}</v-list-item-title></v-list-item>
					<v-list-item @click="$emit('select', item.path)"><v-list-item-icon><v-icon small>mdi-file-tree</v-icon></v-list-item-icon><v-list-item-title>{{ t('open_in_tree') }}</v-list-item-title></v-list-item>
					<v-list-item @click="$emit(item.watched ? 'unwatch' : 'watch', item.path)"><v-list-item-icon><v-icon small>{{ item.watched ? 'mdi-eye-off-outline' : 'mdi-eye-outline' }}</v-icon></v-list-item-icon><v-list-item-title>{{ item.watched ? t('watch_remove') : t('watch_add') }}</v-list-item-title></v-list-item>
					<v-list-item @click="$emit(item.pinned ? 'unpin' : 'pin', item.path)"><v-list-item-icon><v-icon small>{{ item.pinned ? 'mdi-star' : 'mdi-star-outline' }}</v-icon></v-list-item-icon><v-list-item-title>{{ item.pinned ? t('pin_remove', { path: item.path }) : t('pin_add', { path: item.path }) }}</v-list-item-title></v-list-item>
				</v-list>
			</v-menu>
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
		<div class="mo-gcard-marks">
			<span v-if="item.persistent" class="wf-state ok" :title="t('persist_help')">{{ t('look_card_kept') }}</span>
			<span v-if="item.watched" class="mo-gcard-mark"><v-icon x-small>mdi-eye-outline</v-icon>{{ t('look_card_watched') }}</span>
			<span v-if="item.usedIn !== null && !detail" class="mo-gcard-mark"><v-icon x-small>mdi-file-document-outline</v-icon>{{ t('globals_used_in', { n: item.usedIn }) }}</span>
			<button v-else-if="item.usedIn !== null" type="button" class="mo-gcard-mark mo-gcard-markbtn" :aria-expanded="showFiles ? 'true' : 'false'" :title="t('globals_used_help')" @click="showFiles = !showFiles"><v-icon x-small>mdi-file-document-outline</v-icon>{{ t('globals_used_in', { n: item.usedIn }) }}<v-icon x-small>{{ showFiles ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon></button>
			<button v-else-if="detail" type="button" class="mo-gcard-mark mo-gcard-markbtn mo-gcard-scan" :title="t('globals_scan_help')" @click="$emit('scan-usage')"><v-icon x-small>mdi-file-search-outline</v-icon>{{ t('globals_scan') }}</button>
			<span v-if="ago" class="mo-gcard-mark"><v-icon x-small>mdi-clock-outline</v-icon>{{ t('look_card_changed_ago', { ago: t(ago.key, { n: ago.n }) }) }}</span>
			<span v-if="noValue && setterFiles.length && detail" class="mo-gcard-mark mo-gcard-hint">{{ t('look_card_filler_open') }}
				<button v-for="f in setterFiles" :key="f" type="button" class="mo-gcard-markbtn mo-gcard-setter" :title="t('look_card_setter_open', { file: f })" @click="openSetter(f)">{{ f }}</button>
			</span>
			<span v-else-if="noValue" class="mo-gcard-mark mo-gcard-hint">{{ t(filler.key, filler.params) }}</span>
		</div>
		<div v-if="detail && showFiles" class="mo-gfiles mo-fade-in">
			<div class="mo-part">{{ t('globals_used_where') }}</div>
			<div v-if="!usageFiles.length" class="mo-faint">{{ t('globals_used_none') }}</div>
			<ul v-else class="mo-gfiles-list">
				<li v-for="f in usageFiles" :key="f.path" class="mo-gfile">
					<code class="mo-gfile-path mo-files" :title="f.path">{{ f.path }}</code>
					<span class="mo-udetail-lines">
						<button v-for="c in chipsOf(f)" :key="c.kind + c.n" type="button" class="mo-uline-chip" :class="['k-' + c.kind, { on: peek && peek.path === f.path && peek.line === c.n }]" :aria-pressed="peek && peek.path === f.path && peek.line === c.n ? 'true' : 'false'" :title="t('usage_open_line', { n: c.n })" @click="openLine(f.path, c.n)">{{ t('usage_kind_' + c.kind) }} {{ t('usage_detail_line', { n: c.n }) }}</button>
					</span>
					<span v-if="f.guarded" class="mo-faint">{{ t('globals_used_guarded', { n: f.guarded }) }}</span>
					<file-peek v-if="peek && peek.path === f.path" class="mo-gfile-peek" :path="peek.path" :line="peek.line" :name="item.name" @close="peek = null" />
				</li>
			</ul>
		</div>
		<pre v-if="detail && item.summary.long" class="mo-result-text mo-gcard-full">{{ item.summary.full }}</pre>
		<div v-if="quickResult" class="mo-gcard-preview mo-fade-in">
			<div v-if="feedback.level === 'error'" class="mo-error" role="alert">{{ t(feedback.key) }}</div>
			<command-preview v-else :code="quickResult.code" :can-send="canEdit && globalsOk" :editable="false" @sent="onSent" />
		</div>
		<global-editor v-if="editing" class="mo-gcard-edit mo-fade-in" :name="item.name" :exists="true" :value="item.value" :can-edit="canEdit" :globals-ok="globalsOk" :persistent="item.persistent" :show-persist="true" @persist="onPersist" />
	</article>
</template>

<script>
'use strict'

// One global of the Globals section as a card (a tidy row in the compact density): the star, the name, the kind as a chip (or a calm
// "no value yet" pill), the value big and readable, the marks in words (kept after restart, watched, in how many files, changed N s
// ago), and the quick edit in place: a switch for a boolean and a stepper for a number (globals-quick.js: the step follows the
// decimals), which prepares the exact command in the command preview (one tap more to send, the rules of command-preview.js). A card
// glows for a moment when its value changes. The menu holds the rest: the full typed editor, open in the tree, watch, favourite.
import i18n from '../../i18n'
import KindChip from './KindChip.vue'
import FavoriteStar from './FavoriteStar.vue'
import CommandPreview from './CommandPreview.vue'
import GlobalEditor from './GlobalEditor.vue'
import { kindInfo } from './value-kind.js'
import { editCommand, editText } from './globals-typing.js'
import { quickKind, stepped, recentlyChanged, changedAgo, hasNoValue, editFeedback, settersOf, fillerLine } from './globals-quick.js'
import FilePeek from './FilePeek.vue'
import { usageOf } from './usage-view.js'

export default {
	components: { KindChip, FavoriteStar, CommandPreview, GlobalEditor, FilePeek },
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
		// the files that give a value to a global that has none yet, as buttons that open the file at the line of the assignment (at most 3)
		setterFiles() {
			return this.noValue ? settersOf(this.usageCache, this.item.name).files.slice(0, 3) : []
		},
		filler() {
			return fillerLine(this.noValue ? settersOf(this.usageCache, this.item.name) : null)
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
		// every use of this global in a file as one chip per line, like the By file tab of Usage: kind (created, written, read) and line, in file order
		chipsOf(f) {
			const out = []
			for (const kind of ['define', 'set', 'read']) for (const n of f[kind]) out.push({ kind, n })
			return out.sort((x, y) => x.n - y.n).slice(0, 40)
		},
		// the file that sets it, open in the small viewer at its first define or set line
		// a click on the row (not on a control inside it) opens the detail of this global
		onRowClick(ev) {
			if (this.detail) return
			const t = ev && ev.target
			if (t && t.closest && t.closest('button, input, a, label, .v-input, .v-menu__content, .v-list, .mo-gcard-menu, .mo-gcard-stepper, .mo-gcard-switch, .mo-gcard-edit')) return
			this.$emit('detail', this.item.name)
		},
		openSetter(path) {
			const f = usageOf(this.usageCache, this.item.name).find(x => x.path === path)
			const lines = f ? f.define.concat(f.set).sort((a, b) => a - b) : []
			this.showFiles = true
			this.peek = { path, line: lines.length ? lines[0] : 0 }
			this.showPeek()
		},
		openLine(path, line) {
			this.peek = this.peek && this.peek.path === path && this.peek.line === line ? null : { path, line }
			if (this.peek) this.showPeek()
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
@media (prefers-reduced-motion: reduce) { .mo-page .mo-gcard-glow { animation: none; background: rgba(251, 140, 0, 0.18); } }
</style>
