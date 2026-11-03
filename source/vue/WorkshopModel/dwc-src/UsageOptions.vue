<template>
	<details class="wf-more mo-uoptions">
		<summary>{{ t('usage_options') }}</summary>
		<div v-if="files.length" class="mo-uopt-block">
			<div class="mo-part">{{ t('usage_options_show') }}</div>
			<div class="mo-faint mb-1">{{ t('usage_options_show_hint') }}</div>
			<div class="mo-flat-filters" role="group" :aria-label="t('usage_kinds')">
				<button v-for="k in REF_KINDS" :key="k" type="button" class="wf-cat" :aria-pressed="kinds.indexOf(k) >= 0 ? 'true' : 'false'" @click="toggleKind(k)">{{ t('usage_kind_' + k) }}</button>
			</div>
			<v-select :model-value="file" :items="fileItems" item-title="title" item-value="value" density="compact" variant="outlined" hide-details class="mo-field mt-2" :label="t('usage_only_file')" @update:model-value="emit('update:file', $event || '')" />
		</div>
		<div class="mo-uopt-block">
			<usage-scope :scope="scope" :folders="folders" @update:scope="emit('update:scope', $event)" />
			<div class="mo-faint mt-2">{{ t('usage_budget', { files: budget.files, kb: Math.round(budget.bytesPerFile / 1024) }) }} <span v-if="!tier.extras">{{ t('usage_budget_standalone') }}</span></div>
			<div class="mo-faint">{{ tier.extras ? t('usage_cache_sbc') : t('usage_cache_browser') }}</div>
		</div>
	</details>
</template>

<script setup>
// The technical side of the usage finder, folded away: the kinds of use and the one file the "By global" list shows, what to read
// (UsageScope.vue) and what the budget and the memory of the scan are. It holds nothing: it says what was picked to the section.
import { computed } from 'vue'
import { i18n } from './dwc-host.js'
import UsageScope from './UsageScope.vue'
import { REF_KINDS } from './usage-view.js'

const props = defineProps({
	scope: { type: Object, required: true },
	folders: { type: Array, default: () => [] },
	kinds: { type: Array, default: () => [] },
	file: { type: String, default: '' },
	files: { type: Array, default: () => [] },
	budget: { type: Object, default: () => ({ files: 0, bytesPerFile: 0 }) },
	tier: { type: Object, default: () => ({ extras: false }) }
})
const emit = defineEmits(['update:scope', 'update:kinds', 'update:file'])

const t = (k, p) => i18n.t('plugins.WorkshopModel.model.' + k, p)

const fileItems = computed(() => [{ value: '', title: t('usage_all_files') }].concat(props.files.map(f => ({ value: f, title: f }))))

function toggleKind(k) {
	emit('update:kinds', props.kinds.indexOf(k) >= 0 ? props.kinds.filter(x => x !== k) : props.kinds.concat([k]))
}
</script>
