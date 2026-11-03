<template>
	<div class="mo-xb-panel">
		<div class="mo-xb-head">
		<v-text-field v-model="query" dense outlined hide-details spellcheck="false" clearable :label="t('pick_search')" @input="base = ''" />
		<div v-if="wanted" class="mo-faint mt-1" role="status">
			{{ t('guided_only_type', { type: typeWord, what: holeName }) }}
			<v-btn x-small text @click="showAll = !showAll">{{ showAll ? t('guided_only_again') : t('guided_show_all') }}</v-btn>
		</div>
		</div>
		<div v-if="base" class="mo-xb-crumb">
			<v-btn x-small text @click="base = ''">{{ t('pick_up') }}</v-btn>
			<code class="mo-key">{{ base }}</code>
		</div>
		<div v-if="!rows.length" class="mo-faint mt-2">{{ t('pick_none') }}</div>
		<table v-else class="mo-table mt-1">
			<tbody>
				<tr v-for="r in rows" :key="r.path">
					<td class="mo-key">{{ r.path }}</td>
					<td><kind-chip :kind="r.kind" /></td>
					<td class="mo-value">{{ r.branch ? t('pick_size', { n: r.size }) : r.text }}</td>
					<td class="mo-row-actions">
						<v-btn x-small text :disabled="!!wanted && !fits(r)" @click="$emit('insert', r.path)">{{ t('pick_insert') }}</v-btn>
						<v-btn v-if="r.branch" x-small text :aria-label="t('pick_down')" :title="t('pick_down')" @click="go(r.path)"><v-icon :size="16">mdi-arrow-down-right</v-icon></v-btn>
					</td>
				</tr>
			</tbody>
		</table>
	</div>
</template>

<script>
'use strict'

// The paths of the live model to put in the expression (expression-paths.js): search by a word or a part of a path, the first level
// of the model without a search, a tap on the arrow goes down one level. When a blank asks for a type (`wanted`: number, string, bool
// or array) only the paths of that type can be inserted and the others are hidden until Show every path. Emits `insert` with the path.
import i18n from '../../i18n'
import { liveModel } from './model-host.js'
import KindChip from './KindChip.vue'
import { pathChoices, pathChildren, filterRows, rowFits } from './expression-paths.js'

export default {
	components: { KindChip },
	props: {
		tick: { type: Number, default: 0 },
		wanted: { type: String, default: '' },
		holeName: { type: String, default: '' }
	},
	data() {
		return { query: '', base: '', showAll: false }
	},
	computed: {
		typeWord() {
			return this.t('rtype_' + this.wanted)
		},
		rows() {
			void this.tick
			const model = liveModel()
			const all = this.base ? pathChildren(model, this.base) : pathChoices(model, this.query)
			return this.showAll ? all : filterRows(all, this.wanted)
		}
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		},
		fits(row) {
			return rowFits(row, this.wanted)
		},
		go(path) {
			this.query = ''
			this.base = path
		}
	}
}
</script>
