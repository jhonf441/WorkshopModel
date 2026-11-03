<template>
	<details class="wf-more mo-uoptions">
		<summary>{{ t('usage_options') }}</summary>
		<div v-if="files.length" class="mo-uopt-block">
			<div class="mo-part">{{ t('usage_options_show') }}</div>
			<div class="mo-faint mb-1">{{ t('usage_options_show_hint') }}</div>
			<div class="mo-flat-filters" role="group" :aria-label="t('usage_kinds')">
				<button v-for="k in REF_KINDS" :key="k" type="button" class="wf-cat" :aria-pressed="kinds.indexOf(k) >= 0 ? 'true' : 'false'" @click="toggleKind(k)">{{ t('usage_kind_' + k) }}</button>
			</div>
			<v-select :value="file" :items="fileItems" item-text="title" item-value="value" dense outlined hide-details class="mo-field mt-2" :label="t('usage_only_file')" @change="$emit('update:file', $event || '')" />
		</div>
		<div class="mo-uopt-block">
			<usage-scope :scope="scope" :folders="folders" @update:scope="$emit('update:scope', $event)" />
			<div class="mo-faint mt-2">{{ t('usage_budget', { files: budget.files, kb: Math.round(budget.bytesPerFile / 1024) }) }} <span v-if="!tier.extras">{{ t('usage_budget_standalone') }}</span></div>
			<div class="mo-faint">{{ tier.extras ? t('usage_cache_sbc') : t('usage_cache_browser') }}</div>
		</div>
	</details>
</template>

<script>
'use strict'

// The technical side of the usage finder, folded away: the kinds of use and the one file the "By global" list shows, what to read
// (UsageScope.vue) and what the budget and the memory of the scan are. It holds nothing: it says what was picked to the section.
import i18n from '../../i18n'
import UsageScope from './UsageScope.vue'
import { REF_KINDS } from './usage-view.js'

export default {
	components: { UsageScope },
	props: {
		scope: { type: Object, required: true },
		folders: { type: Array, default: () => [] },
		kinds: { type: Array, default: () => [] },
		file: { type: String, default: '' },
		files: { type: Array, default: () => [] },
		budget: { type: Object, default: () => ({ files: 0, bytesPerFile: 0 }) },
		tier: { type: Object, default: () => ({ extras: false }) }
	},
	data() {
		return { REF_KINDS }
	},
	computed: {
		fileItems() {
			return [{ value: '', title: this.t('usage_all_files') }].concat(this.files.map(f => ({ value: f, title: f })))
		}
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		},
		toggleKind(k) {
			this.$emit('update:kinds', this.kinds.indexOf(k) >= 0 ? this.kinds.filter(x => x !== k) : this.kinds.concat([k]))
		}
	}
}
</script>
