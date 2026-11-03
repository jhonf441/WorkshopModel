<template>
	<div class="mo-usage-results">
		<div v-if="!shown.length" class="mo-uempty mo-ufade" role="status">
			<div v-if="card === 'problems' && !query && !file" class="mo-uempty-in">
				<v-icon :size="56" class="mo-uclear-icon">mdi-check-circle-outline</v-icon>
				<div class="mo-uempty-title">{{ t('usage_clear_title') }}</div>
				<div class="mo-faint">{{ t('usage_clear_text') }}</div>
			</div>
			<div v-else class="mo-uempty-in">
				<v-icon :size="40">mdi-text-search-variant</v-icon>
				<div class="mo-uempty-title">{{ card === 'check' && !query && !file ? t('usage_check_empty') : t('usage_no_match') }}</div>
				<div class="mo-faint">{{ t('usage_no_match_hint') }}</div>
			</div>
			<v-btn v-if="card !== 'all' || query || file" small outlined class="mt-2" @click="$emit('reset')">{{ t('usage_show_everything') }}</v-btn>
		</div>
		<div v-for="r in shown" :key="r.name" class="mo-urow mo-ufade">
			<usage-row :row="r" :max="max" :open="open === r.name" @toggle="toggle" />
			<usage-detail v-if="open === r.name" :row="r" @select="onSelect" />
		</div>
	</div>
</template>

<script>
'use strict'

// The "By global" tab of the usage finder: one row per global (UsageRow.vue) filtered by the card, the search, the kinds and the file
// the section holds; a click opens the detail of that one (UsageDetail.vue) under its row. An empty list says why and how to get
// back (all clear when the problems card is empty, a hint when a search found nothing).
import i18n from '../../i18n'
import UsageRow from './UsageRow.vue'
import UsageDetail from './UsageDetail.vue'
import { filterRows, maxCount } from './usage-view.js'

export default {
	components: { UsageRow, UsageDetail },
	props: {
		rows: { type: Array, default: () => [] },
		card: { type: String, default: 'all' },
		query: { type: String, default: '' },
		kinds: { type: Array, default: () => [] },
		file: { type: String, default: '' }
	},
	data() {
		return { open: '' }
	},
	computed: {
		max() {
			return maxCount(this.rows)
		},
		shown() {
			return filterRows(this.rows, { card: this.card, kinds: this.kinds, file: this.file, query: this.query })
		}
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		},
		toggle(name) {
			this.open = this.open === name ? '' : name
		},
		onSelect(path) {
			this.$emit('select', path)
		}
	}
}
</script>
