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
		<template v-if="card === 'check'">
			<div v-if="!pending.length && done.length && !query && !file" class="mo-note ok mb-2" role="status"><v-icon small>mdi-check-circle-outline</v-icon><span class="mo-note-text">{{ t('usage2_all_looked') }}</span></div>
			<div v-for="g in groups" :key="g.cause" class="mo-ucause">
				<div class="mo-ucause-head"><span class="mo-part">{{ t('usage2_cause_' + g.cause) }} ({{ g.rows.length }})</span></div>
				<div class="mo-faint mo-ucause-do">{{ t('usage2_cause_' + g.cause + '_do') }}</div>
				<div v-for="r in g.rows" :key="r.name" class="mo-urow mo-ufade">
					<usage-row :row="r" :max="max" :open="open === r.name" @toggle="toggle" />
					<usage-detail v-if="open === r.name" :row="r" @select="onSelect" @review="onReview" @read-folders="$emit('read-folders')" />
				</div>
			</div>
			<div v-if="done.length" class="mo-udone">
				<button type="button" class="mo-udone-head" :aria-expanded="doneOpen ? 'true' : 'false'" @click="doneOpen = !doneOpen"><v-icon small>{{ doneOpen ? 'mdi-chevron-down' : 'mdi-chevron-right' }}</v-icon>{{ t('usage2_reviewed_group', { n: done.length }) }}</button>
				<div v-if="doneOpen">
					<div v-for="r in done" :key="r.name" class="mo-urow mo-ufade">
						<usage-row :row="r" :max="max" :open="open === r.name" @toggle="toggle" />
						<usage-detail v-if="open === r.name" :row="r" @select="onSelect" @review="onReview" @read-folders="$emit('read-folders')" />
					</div>
				</div>
			</div>
		</template>
		<template v-else>
			<div v-for="r in shown" :key="r.name" class="mo-urow mo-ufade">
				<usage-row :row="r" :max="max" :open="open === r.name" @toggle="toggle" />
				<usage-detail v-if="open === r.name" :row="r" @select="onSelect" @review="onReview" @read-folders="$emit('read-folders')" />
			</div>
		</template>
	</div>
</template>

<script>
'use strict'

// The "By global" tab of the usage finder: one row per global (UsageRow.vue) filtered by the card, the search, the kinds and the file
// the section holds; a click opens the detail of that one (UsageDetail.vue) under its row. An empty list says why and how to get
// back (all clear when the problems card is empty, a hint when a search found nothing). The card to check groups by cause with what to do and
// keeps apart what the person marked as reviewed or ignored (usage-review.js), who can undo it.
import i18n from '../../i18n'
import UsageRow from './UsageRow.vue'
import UsageDetail from './UsageDetail.vue'
import { filterRows, maxCount } from './usage-view.js'
import { causeGroups } from './usage-review.js'

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
		return { open: '', doneOpen: false }
	},
	computed: {
		max() {
			return maxCount(this.rows)
		},
		shown() {
			return filterRows(this.rows, { card: this.card, kinds: this.kinds, file: this.file, query: this.query })
		},
		// the card to check: what is left to check, in groups by cause (each says what to do), and apart what the person already looked at
		pending() {
			return this.shown.filter(r => !r.review)
		},
		done() {
			return this.shown.filter(r => r.review)
		},
		groups() {
			return causeGroups(this.pending)
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
		},
		onReview(name, state) {
			this.$emit('review', name, state)
		}
	}
}
</script>
