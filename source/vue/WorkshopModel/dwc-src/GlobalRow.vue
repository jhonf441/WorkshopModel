<template>
	<div class="mo-grow" :class="{ 'mo-grow-open': expanded || editing }">
		<div class="mo-grow-line">
			<favorite-star :path="item.path" :pinned="pinned" @pin="emit('pin', $event)" @unpin="emit('unpin', $event)" />
			<span class="mo-key mo-grow-name">{{ item.name }}</span>
			<kind-chip :info="chip" />
			<button v-if="item.summary.long" type="button" class="mo-link mo-value mo-grow-value" :aria-expanded="expanded ? 'true' : 'false'" :title="expanded ? t('globals_show_less') : t('globals_show_more')" @click="expanded = !expanded">{{ item.summary.short }}</button>
			<span v-else class="mo-value mo-grow-value">{{ item.summary.short }}</span>
			<v-icon v-if="item.persistent" size="small" class="mo-grow-icon" :title="t('persist_switch')">mdi-content-save-outline</v-icon>
			<span v-if="item.usedIn !== null" class="wf-pill" :title="t('globals_used_help')">{{ t('globals_used_in', { n: item.usedIn }) }}</span>
			<span class="mo-grow-spacer" />
			<v-switch v-if="quick === 'bool'" :model-value="draftBool" density="compact" color="primary" hide-details class="mo-grow-quick" :aria-label="t('globals_quick_label', { name: item.name })" @update:model-value="setDraft($event ? 'true' : 'false')" />
			<v-text-field v-else-if="quick === 'number'" v-model="draft" density="compact" variant="outlined" hide-details class="mo-grow-quick mo-grow-num" :aria-label="t('globals_quick_label', { name: item.name })" @keydown.enter="armed = true" />
			<v-menu>
				<template #activator="{ props: menu }">
					<v-btn size="x-small" variant="text" icon="mdi-dots-vertical" v-bind="menu" :aria-label="t('globals_menu', { name: item.name })" :title="t('globals_menu', { name: item.name })" />
				</template>
				<v-list density="compact">
					<v-list-item :disabled="!canEdit || !globalsOk" :title="t('edit')" @click="editing = !editing" />
					<v-list-item :title="t('open_in_tree')" @click="emit('select', item.path)" />
					<v-list-item :title="item.watched ? t('watch_remove') : t('watch_add')" @click="emit(item.watched ? 'unwatch' : 'watch', item.path)" />
					<v-list-item :title="item.pinned ? t('pin_remove', { path: item.path }) : t('pin_add', { path: item.path })" @click="emit(item.pinned ? 'unpin' : 'pin', item.path)" />
				</v-list>
			</v-menu>
		</div>
		<pre v-if="expanded" class="mo-result-text mo-grow-full">{{ item.summary.full }}</pre>
		<div v-if="quickResult" class="mo-grow-more">
			<div v-if="!quickResult.ok" class="mo-error" role="alert">{{ t('err_' + quickResult.error) }}</div>
			<command-preview v-else :code="quickResult.code" :can-send="canEdit && globalsOk" :editable="false" @sent="onSent" />
		</div>
		<global-editor v-if="editing" class="mo-grow-more" :name="item.name" :exists="true" :value="item.value" :can-edit="canEdit" :globals-ok="globalsOk" :persistent="item.persistent" :show-persist="true" @persist="(n, l) => emit('persist', n, l)" />
	</div>
</template>

<script setup>
// One global in the Globals section: the star of the favourites, the name, the kind as a chip, the value in short (a tap shows all of
// a long text, an array or an object), the save icon when it is kept across reboots, in how many files the usage finder saw it, a
// quick edit for a boolean (a switch) and a number (a field, Enter) that prepares the exact command in the command preview (one tap,
// the rules of command-preview.js), and one menu with the rest: edit (the full typed editor), open in the tree, watch, favourite.
import { computed, ref, watch } from 'vue'
import { i18n } from './dwc-host.js'
import KindChip from './KindChip.vue'
import FavoriteStar from './FavoriteStar.vue'
import CommandPreview from './CommandPreview.vue'
import GlobalEditor from './GlobalEditor.vue'
import { kindInfo } from './value-kind.js'
import { editCommand, editText } from './globals-typing.js'

const props = defineProps({
	item: { type: Object, required: true },
	pinned: { type: Array, default: () => [] },
	canEdit: { type: Boolean, default: true },
	globalsOk: { type: Boolean, default: true }
})
const emit = defineEmits(['select', 'watch', 'unwatch', 'pin', 'unpin', 'persist'])

const t = (k, p) => i18n.t('plugins.WorkshopModel.model.' + k, p)

const expanded = ref(false)
const editing = ref(false)
const draft = ref('')
const armed = ref(false)

const chip = computed(() => kindInfo(props.item.value, props.item.path))
const current = computed(() => editText(props.item.value))
const quick = computed(() => {
	if (!props.canEdit || !props.globalsOk) return ''
	if (props.item.kind === 'bool') return 'bool'
	return props.item.kind === 'int' || props.item.kind === 'float' ? 'number' : ''
})
const draftBool = computed(() => draft.value === 'true')
const pending = computed(() => draft.value !== current.value && (quick.value === 'bool' || armed.value))
const quickResult = computed(() => (pending.value ? editCommand(props.item.name, props.item.kind, draft.value, true) : null))

// a new value from the machine resets the draft unless the person is changing it
watch(current, v => {
	if (!pending.value) draft.value = v
}, { immediate: true })
watch(draft, () => { if (quick.value === 'number') armed.value = false })

function setDraft(v) {
	draft.value = v
}
function onSent() {
	armed.value = false
}
</script>
