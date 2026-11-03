<template>
	<article class="mo-gcard" :class="{ 'mo-gcard-kept': item.persistent, 'mo-gcard-open': expanded || editing, 'mo-gcard-novalue': noValue }" :aria-label="item.name">
		<span v-if="flash" :key="item.changedAt" class="mo-gcard-glow" aria-hidden="true"></span>
		<div class="mo-gcard-head">
			<favorite-star :path="item.path" :pinned="pinned" @pin="emit('pin', $event)" @unpin="emit('unpin', $event)" />
			<span class="mo-gcard-name" :title="item.path">{{ item.name }}</span>
			<kind-chip v-if="!noValue" :info="chip" />
			<span v-else class="mo-pill mo-pill-dot mo-pill-quiet" :title="t('look_card_novalue_help')">{{ t('look_card_novalue') }}</span>
			<v-menu>
				<template #activator="{ props: menu }">
					<v-btn size="small" variant="text" icon="mdi-dots-vertical" v-bind="menu" :aria-label="t('globals_menu', { name: item.name })" :title="t('globals_menu', { name: item.name })" />
				</template>
				<v-list density="compact">
					<v-list-item :disabled="!canEdit || !globalsOk" :title="t('edit')" prepend-icon="mdi-pencil-outline" @click="editing = !editing" />
					<v-list-item :title="t('open_in_tree')" prepend-icon="mdi-file-tree" @click="emit('select', item.path)" />
					<v-list-item :title="item.watched ? t('watch_remove') : t('watch_add')" :prepend-icon="item.watched ? 'mdi-eye-off-outline' : 'mdi-eye-outline'" @click="emit(item.watched ? 'unwatch' : 'watch', item.path)" />
					<v-list-item :title="item.pinned ? t('pin_remove', { path: item.path }) : t('pin_add', { path: item.path })" :prepend-icon="item.pinned ? 'mdi-star' : 'mdi-star-outline'" @click="emit(item.pinned ? 'unpin' : 'pin', item.path)" />
				</v-list>
			</v-menu>
		</div>
		<div class="mo-gcard-body">
			<label v-if="quick === 'bool'" class="mo-gcard-switch">
				<v-switch :model-value="draftBool" density="compact" color="success" hide-details inset :aria-label="t('globals_quick_label', { name: item.name })" @update:model-value="setDraft($event ? 'true' : 'false')" />
				<span class="mo-gcard-value">{{ draftBool ? t('look_card_on') : t('look_card_off') }}</span>
			</label>
			<div v-else-if="quick === 'number'" class="mo-gcard-stepper" role="group" :aria-label="t('globals_quick_label', { name: item.name })">
				<button type="button" class="mo-gcard-step" :aria-label="t('look_card_minus', { name: item.name })" :title="t('look_card_minus', { name: item.name })" @click="step(-1)"><v-icon size="small">mdi-minus</v-icon></button>
				<v-text-field :model-value="draft" density="compact" variant="outlined" hide-details inputmode="decimal" class="mo-gcard-num" :aria-label="t('globals_quick_label', { name: item.name })" @update:model-value="typeNumber($event)" @keydown.enter="arm" />
				<button type="button" class="mo-gcard-step" :aria-label="t('look_card_plus', { name: item.name })" :title="t('look_card_plus', { name: item.name })" @click="step(1)"><v-icon size="small">mdi-plus</v-icon></button>
				<button v-if="draft !== current && !armed" type="button" class="mo-gcard-step mo-gcard-apply" :aria-label="t('look_card_apply')" :title="t('look_card_apply')" @click="arm"><v-icon size="small">mdi-check</v-icon></button>
			</div>
			<span v-else-if="noValue" class="mo-gcard-value mo-gcard-value-text mo-faint">{{ t('unit_none') }}</span>
			<button v-else-if="item.summary.long" type="button" class="mo-gcard-more" :aria-expanded="expanded ? 'true' : 'false'" :title="expanded ? t('globals_show_less') : t('globals_show_more')" @click="expanded = !expanded">
				<span class="mo-gcard-value mo-gcard-value-text">{{ item.summary.short }}</span><v-icon size="small">{{ expanded ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
			</button>
			<span v-else class="mo-gcard-value" :class="{ 'mo-gcard-value-text': item.kind === 'string' }">{{ item.summary.short }}</span>
		</div>
		<div class="mo-gcard-marks">
			<span v-if="item.persistent" class="wf-state ok" :title="t('persist_help')">{{ t('look_card_kept') }}</span>
			<span v-if="item.watched" class="mo-gcard-mark"><v-icon size="x-small">mdi-eye-outline</v-icon>{{ t('look_card_watched') }}</span>
			<span v-if="item.usedIn !== null" class="mo-gcard-mark" :title="t('globals_used_help')"><v-icon size="x-small">mdi-file-document-outline</v-icon>{{ t('globals_used_in', { n: item.usedIn }) }}</span>
			<span v-if="ago" class="mo-gcard-mark"><v-icon size="x-small">mdi-clock-outline</v-icon>{{ t('look_card_changed_ago', { ago: t(ago.key, { n: ago.n }) }) }}</span>
			<span v-if="noValue" class="mo-gcard-mark mo-gcard-hint">{{ t(filler.key, filler.params) }}</span>
		</div>
		<pre v-if="expanded" class="mo-result-text mo-gcard-full">{{ item.summary.full }}</pre>
		<div v-if="quickResult" class="mo-gcard-preview mo-fade-in">
			<div v-if="feedback.level === 'error'" class="mo-error" role="alert">{{ t(feedback.key) }}</div>
			<command-preview v-else :code="quickResult.code" :can-send="canEdit && globalsOk" :editable="false" @sent="onSent" />
		</div>
		<global-editor v-if="editing" class="mo-gcard-edit mo-fade-in" :name="item.name" :exists="true" :value="item.value" :can-edit="canEdit" :globals-ok="globalsOk" :persistent="item.persistent" :show-persist="true" @persist="(n, l) => emit('persist', n, l)" />
	</article>
</template>

<script setup>
// One global of the Globals section as a card (a tidy row in the compact density): the star, the name, the kind as a chip (or a calm
// "no value yet" pill), the value big and readable, the marks in words (kept after restart, watched, in how many files, changed N s
// ago), and the quick edit in place: a switch for a boolean and a stepper for a number (globals-quick.js: the step follows the
// decimals), which prepares the exact command in the command preview (one tap more to send, the rules of command-preview.js). A card
// glows for a moment when its value changes. The menu holds the rest: the full typed editor, open in the tree, watch, favourite.
import { computed, ref, watch } from 'vue'
import { i18n } from './dwc-host.js'
import KindChip from './KindChip.vue'
import FavoriteStar from './FavoriteStar.vue'
import CommandPreview from './CommandPreview.vue'
import GlobalEditor from './GlobalEditor.vue'
import { kindInfo } from './value-kind.js'
import { editCommand, editText } from './globals-typing.js'
import { quickKind, stepped, recentlyChanged, changedAgo, hasNoValue, editFeedback, settersOf, fillerLine } from './globals-quick.js'

const props = defineProps({
	item: { type: Object, required: true },
	pinned: { type: Array, default: () => [] },
	canEdit: { type: Boolean, default: true },
	globalsOk: { type: Boolean, default: true },
	tick: { type: Number, default: 0 },
	usageCache: { type: Map, default: () => new Map() }
})
const emit = defineEmits(['select', 'watch', 'unwatch', 'pin', 'unpin', 'persist'])

const t = (k, p) => i18n.t('plugins.WorkshopModel.model.' + k, p)

const expanded = ref(false)
const editing = ref(false)
// the draft starts as the live value: an untouched card never shows a command, let alone a red message (globals-quick.js)
const draft = ref(editText(props.item.value))
const armed = ref(false)

const now = computed(() => {
	void props.tick
	return Date.now()
})
const chip = computed(() => kindInfo(props.item.value, props.item.path))
const noValue = computed(() => hasNoValue(props.item.value))
const current = computed(() => editText(props.item.value))
const quick = computed(() => (props.globalsOk && !noValue.value ? quickKind(props.item.kind, props.canEdit) : ''))
const draftBool = computed(() => draft.value === 'true')
const pending = computed(() => draft.value !== '' && draft.value !== current.value && (quick.value === 'bool' || armed.value))
const quickResult = computed(() => (pending.value ? editCommand(props.item.name, props.item.kind, draft.value, true) : null))
// the quick edit is always a change the person made (a tap, a key): its message may be red
const feedback = computed(() => editFeedback(true, quickResult.value, true))
const flash = computed(() => recentlyChanged(props.item.changedAt, now.value))
const ago = computed(() => changedAgo(props.item.changedAt, now.value))
const filler = computed(() => fillerLine(noValue.value ? settersOf(props.usageCache, props.item.name) : null))

// a new value from the machine resets the draft unless the person is changing it
watch(current, v => {
	if (!pending.value) draft.value = v
}, { immediate: true })

function setDraft(v) {
	draft.value = v
}
// typing a number: the command waits for Enter or the check, so a half-written number is not judged
function typeNumber(v) {
	draft.value = v === null || v === undefined ? '' : String(v)
	armed.value = false
}
function arm() {
	armed.value = true
}
// one tap of the stepper: the new number and its command at once
function step(dir) {
	draft.value = stepped(props.item.kind, draft.value, dir)
	armed.value = true
}
function onSent() {
	armed.value = false
}
</script>

<style>
/* GlobalRow: the glow of a value that just changed is an overlay that is born again on every change, so the animation restarts */
.mo-page .mo-gcard-glow { position: absolute; inset: 0; border-radius: inherit; pointer-events: none; animation: mo-glow 2.4s ease-out; }
@media (prefers-reduced-motion: reduce) { .mo-page .mo-gcard-glow { animation: none; background: rgba(251, 140, 0, 0.18); } }
</style>
