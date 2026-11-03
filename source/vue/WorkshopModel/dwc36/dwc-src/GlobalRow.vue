<template>
	<article class="mo-gcard" :class="{ 'mo-gcard-kept': item.persistent, 'mo-gcard-open': expanded || editing, 'mo-gcard-novalue': noValue }" :aria-label="item.name">
		<span v-if="flash" :key="item.changedAt" class="mo-gcard-glow" aria-hidden="true"></span>
		<div class="mo-gcard-head">
			<favorite-star :path="item.path" :pinned="pinned" @pin="onPin" @unpin="onUnpin" />
			<span class="mo-gcard-name" :title="item.path">{{ item.name }}</span>
			<kind-chip v-if="!noValue" :info="chip" />
			<span v-else class="mo-pill mo-pill-dot mo-pill-quiet" :title="t('look_card_novalue_help')">{{ t('look_card_novalue') }}</span>
			<v-menu offset-y>
				<template #activator="{ on, attrs }">
					<v-btn small icon v-bind="attrs" :aria-label="t('globals_menu', { name: item.name })" :title="t('globals_menu', { name: item.name })" v-on="on"><v-icon small>mdi-dots-vertical</v-icon></v-btn>
				</template>
				<v-list dense>
					<v-list-item :disabled="!canEdit || !globalsOk" @click="editing = !editing"><v-list-item-icon><v-icon small>mdi-pencil-outline</v-icon></v-list-item-icon><v-list-item-title>{{ t('edit') }}</v-list-item-title></v-list-item>
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
			<button v-else-if="item.summary.long" type="button" class="mo-gcard-more" :aria-expanded="expanded ? 'true' : 'false'" :title="expanded ? t('globals_show_less') : t('globals_show_more')" @click="expanded = !expanded">
				<span class="mo-gcard-value mo-gcard-value-text">{{ item.summary.short }}</span><v-icon small>{{ expanded ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
			</button>
			<span v-else class="mo-gcard-value" :class="{ 'mo-gcard-value-text': item.kind === 'string' }">{{ item.summary.short }}</span>
		</div>
		<div class="mo-gcard-marks">
			<span v-if="item.persistent" class="wf-state ok" :title="t('persist_help')">{{ t('look_card_kept') }}</span>
			<span v-if="item.watched" class="mo-gcard-mark"><v-icon x-small>mdi-eye-outline</v-icon>{{ t('look_card_watched') }}</span>
			<span v-if="item.usedIn !== null" class="mo-gcard-mark" :title="t('globals_used_help')"><v-icon x-small>mdi-file-document-outline</v-icon>{{ t('globals_used_in', { n: item.usedIn }) }}</span>
			<span v-if="ago" class="mo-gcard-mark"><v-icon x-small>mdi-clock-outline</v-icon>{{ t('look_card_changed_ago', { ago: t(ago.key, { n: ago.n }) }) }}</span>
			<span v-if="noValue" class="mo-gcard-mark mo-gcard-hint">{{ t(filler.key, filler.params) }}</span>
		</div>
		<pre v-if="expanded" class="mo-result-text mo-gcard-full">{{ item.summary.full }}</pre>
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

export default {
	components: { KindChip, FavoriteStar, CommandPreview, GlobalEditor },
	props: {
		item: { type: Object, required: true },
		pinned: { type: Array, default: () => [] },
		canEdit: { type: Boolean, default: true },
		globalsOk: { type: Boolean, default: true },
		tick: { type: Number, default: 0 },
		usageCache: { type: Map, default: () => new Map() }
	},
	data() {
		// the draft starts as the live value: an untouched card never shows a command, let alone a red message (globals-quick.js)
		return { expanded: false, editing: false, draft: editText(this.item.value), armed: false }
	},
	computed: {
		now() {
			void this.tick
			return Date.now()
		},
		chip() {
			return kindInfo(this.item.value, this.item.path)
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
		filler() {
			return fillerLine(this.noValue ? settersOf(this.usageCache, this.item.name) : null)
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
