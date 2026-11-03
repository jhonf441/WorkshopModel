<template>
	<v-card class="mb-3">
		<v-card-text>
			<details class="mo-persist" :open="isOpen" @toggle="onToggle">
				<summary class="mo-part"><v-icon size="20" class="mr-1">mdi-content-save-outline</v-icon>{{ t('persist_title') }}<span class="mo-faint ml-2">{{ line }}</span></summary>
				<div class="mo-faint mb-2">{{ t('persist_text') }}</div>
				<div v-if="persist === null" class="mo-faint">{{ t('persist_reading') }}</div>
				<template v-else>
					<div>{{ persist.length ? t('persist_count', { n: persist.length }) : t('persist_none') }} <code>{{ PERSIST_MACRO }}</code></div>
					<ul v-if="persist.length" class="mo-list">
						<li v-for="e in persist" :key="e.name" :class="{ 'mo-persist-stale': attention.stale.indexOf(e.name) >= 0 }"><code>global {{ e.name }} = {{ e.literal }}</code></li>
					</ul>
					<div v-if="attention.stale.length" class="wf-state warn mt-1" role="status">{{ t('persist_attention_stale', { n: attention.stale.length }) }}</div>
					<div v-if="persist.length" class="mt-1" :class="configIncludes ? 'mo-ok' : 'mo-warn'" role="status">
						<v-icon size="small" :color="configIncludes ? 'success' : 'warning'">{{ configIncludes ? 'mdi-check-circle-outline' : 'mdi-alert-outline' }}</v-icon>
						{{ configIncludes === null ? t('persist_include_unknown') : (configIncludes ? t('persist_include_ok') : t('persist_include_missing')) }}
						<code>{{ INCLUDE_LINE }}</code>
						<v-btn size="x-small" variant="text" @click="copyLine">{{ copied ? t('copied') : t('copy') }}</v-btn>
					</div>
					<div class="mo-actions mt-2">
						<v-btn size="small" variant="outlined" :disabled="!canEdit || !persist.length" @click="emit('update-persist')">{{ t('persist_update') }}</v-btn>
					</div>
					<div class="mo-faint mt-1">{{ t('persist_update_help') }}</div>
					<div class="mo-faint mt-1">{{ t('cannot_delete_text') }}</div>
				</template>
			</details>
		</v-card-text>
	</v-card>
</template>

<script setup>
// The persistence macro (persist-macro.js) as a folded panel: one line says how it is, and it opens by itself only when something
// needs the person (a kept global whose saved value is not the live one, or a config.g that does not call the macro:
// persistAttention); once the person opens or closes it, their choice stays.
import { computed, ref } from 'vue'
import { i18n } from './dwc-host.js'
import { PERSIST_MACRO, INCLUDE_LINE } from './persist-macro.js'
import { copyText } from './copy-text.js'

const props = defineProps({
	persist: { type: Array, default: null },
	configIncludes: { type: Boolean, default: null },
	attention: { type: Object, default: () => ({ stale: [], missingInclude: false, open: false }) },
	canEdit: { type: Boolean, default: true }
})
const emit = defineEmits(['update-persist'])

const t = (k, p) => i18n.t('plugins.WorkshopModel.model.' + k, p)
const copied = ref(false)
const chosen = ref(null) // null until the person opens or closes the panel

const isOpen = computed(() => (chosen.value === null ? props.attention.open : chosen.value))
const line = computed(() => {
	const a = props.attention
	if (a.missingInclude) return t('persist_attention_include')
	if (a.stale.length) return t('persist_attention_stale', { n: a.stale.length })
	return props.persist && props.persist.length ? t('persist_panel_ok', { n: props.persist.length }) : ''
})

function onToggle(e) {
	const open = !!(e && e.target && e.target.open)
	if (open !== isOpen.value) chosen.value = open
}
async function copyLine() {
	copied.value = await copyText(INCLUDE_LINE)
	setTimeout(() => { copied.value = false }, 1500)
}
</script>
