<template>
	<v-card class="mb-3">
		<v-card-text>
			<div class="mo-part"><v-icon :size="20" class="mr-1">mdi-compare-horizontal</v-icon>{{ t('compare_title') }}</div>
			<div class="mo-faint mb-2">{{ t('compare_help') }}</div>
			<div class="mo-form">
				<v-select :value="from" :items="items" item-text="title" item-value="value" dense outlined hide-details class="mo-field" :label="t('compare_from')" @change="$emit('pick-from', $event)" />
				<v-select :value="to" :items="items" item-text="title" item-value="value" dense outlined hide-details class="mo-field" :label="t('compare_to')" @change="$emit('pick-to', $event)" />
			</div>
			<div v-if="!a || !b" class="mo-faint">{{ t('snapshot_none') }}</div>
			<div v-else-if="from === to" class="mo-faint">{{ t('compare_same') }}</div>
			<template v-else>
				<div class="mo-flat-filters" role="group" :aria-label="t('compare_states')">
					<span class="mo-faint" role="status">{{ t('compare_summary', summary) }}</span>
					<button v-for="s in STATES" :key="s" type="button" class="wf-cat" :aria-pressed="states.indexOf(s) >= 0 ? 'true' : 'false'" @click="toggle(s)">{{ t('diff_' + s) }}</button>
				</div>
				<div v-if="!shown.length" class="mo-faint">{{ t('compare_none') }}</div>
				<div v-else class="mo-flat-scroll">
					<table class="mo-table mo-flat-table">
						<thead><tr><th>{{ t('detail_path') }}</th><th>{{ t('before') }}</th><th>{{ t('after') }}</th><th>{{ t('compare_state') }}</th></tr></thead>
						<tbody>
							<tr v-for="d in page.rows" :key="d.path" :class="'mo-diff-' + d.state">
								<td class="mo-key"><button type="button" class="mo-link" :title="t('open_in_tree')" @click="$emit('select', d.path)">{{ d.path }}</button></td>
								<td class="mo-value">{{ d.before === null ? '-' : d.before }}</td>
								<td class="mo-value">{{ d.after === null ? '-' : d.after }}</td>
								<td>{{ t('diff_' + d.state) }}</td>
							</tr>
						</tbody>
					</table>
				</div>
				<v-btn v-if="page.more" small outlined class="mt-2" @click="pages++">{{ t('flat_more', { n: Math.min(page.more, FLAT_PAGE) }) }}</v-btn>
			</template>
		</v-card-text>
	</v-card>
</template>

<script>
'use strict'

// The comparison of two snapshots, or of a snapshot with the model now (snapshots.js snapshotDiff over change-diff.js diffMaps): what
// changed, what was added and what was removed, filtered by kind with the category pills of the family, FLAT_PAGE rows at a time. The
// model now is read with the scope of the other side, so a snapshot of one branch is compared with that branch only.
import i18n from '../../i18n'
import { liveModel } from './model-host.js'
import { LIVE, makeSnapshot, snapshotDiff, diffSummary } from './snapshots.js'
import { FLAT_PAGE, pageOf } from './flat-list.js'

const STATES = ['changed', 'added', 'removed']

export default {
	props: {
		list: { type: Array, default: () => [] },
		from: { type: String, default: '' },
		to: { type: String, default: '' },
		tick: { type: Number, default: 0 },
		maxLeaves: { type: Number, default: 4000 }
	},
	data() {
		return { states: [], pages: 1, STATES, FLAT_PAGE }
	},
	computed: {
		items() {
			return [{ value: LIVE, title: this.t('snapshot_live') }].concat(this.list.map(s => ({ value: s.name, title: s.name })))
		},
		a() {
			void this.tick
			return this.sideOf(this.from, this.to)
		},
		b() {
			void this.tick
			return this.sideOf(this.to, this.from)
		},
		diff() {
			return this.a && this.b && this.from !== this.to ? snapshotDiff(this.a, this.b) : []
		},
		summary() {
			return diffSummary(this.diff)
		},
		shown() {
			return this.states.length ? this.diff.filter(d => this.states.indexOf(d.state) >= 0) : this.diff
		},
		page() {
			return pageOf(this.shown, this.pages, FLAT_PAGE)
		}
	},
	watch: {
		from() { this.pages = 1 },
		to() { this.pages = 1 },
		states() { this.pages = 1 }
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		},
		saved(name) {
			return this.list.find(s => s.name === name) || null
		},
		// the model now, with the scope of the other side (the whole model when both sides are the model now)
		sideOf(name, other) {
			if (name !== LIVE) return this.saved(name)
			const o = other && other !== LIVE ? this.saved(other) : null
			return makeSnapshot('live', liveModel(), o ? o.scope : '', new Date(), this.maxLeaves)
		},
		toggle(s) {
			this.states = this.states.indexOf(s) >= 0 ? this.states.filter(x => x !== s) : this.states.concat([s])
		}
	}
}
</script>
