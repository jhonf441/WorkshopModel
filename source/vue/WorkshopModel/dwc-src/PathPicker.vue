<template>
	<div class="mo-xb-panel">
		<v-text-field v-model="query" density="compact" variant="outlined" hide-details spellcheck="false" clearable :label="t('pick_search')" @update:model-value="base = ''" />
		<div v-if="wanted" class="mo-faint mt-1" role="status">
			{{ t('guided_only_type', { type: typeWord, what: holeName }) }}
			<v-btn size="x-small" variant="text" @click="showAll = !showAll">{{ showAll ? t('guided_only_again') : t('guided_show_all') }}</v-btn>
		</div>
		<div v-if="base" class="mo-xb-crumb">
			<v-btn size="x-small" variant="text" @click="base = ''">{{ t('pick_up') }}</v-btn>
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
						<v-btn size="x-small" variant="text" :disabled="!!wanted && !rowFits(r, wanted)" @click="emit('insert', r.path)">{{ t('pick_insert') }}</v-btn>
						<v-btn v-if="r.branch" size="x-small" variant="text" :aria-label="t('pick_down')" :title="t('pick_down')" @click="go(r.path)"><v-icon size="16">mdi-arrow-down-right</v-icon></v-btn>
					</td>
				</tr>
			</tbody>
		</table>
	</div>
</template>

<script setup>
// The paths of the live model to put in the expression (expression-paths.js): search by a word or a part of a path, the first level
// of the model without a search, a tap on the arrow goes down one level. When a blank asks for a type (`wanted`: number, string, bool
// or array) only the paths of that type can be inserted and the others are hidden until Show every path. Emits `insert` with the path.
import { computed, ref } from 'vue'
import { i18n } from './dwc-host.js'
import { liveModel } from './model-host.js'
import KindChip from './KindChip.vue'
import { pathChoices, pathChildren, filterRows, rowFits } from './expression-paths.js'

const props = defineProps({
	tick: { type: Number, default: 0 },
	wanted: { type: String, default: '' },
	holeName: { type: String, default: '' }
})
const emit = defineEmits(['insert'])

const t = (k, p) => i18n.t('plugins.WorkshopModel.model.' + k, p)

const query = ref('')
const base = ref('')
const showAll = ref(false)

const typeWord = computed(() => t('rtype_' + props.wanted))
const rows = computed(() => {
	void props.tick
	const model = liveModel()
	const all = base.value ? pathChildren(model, base.value) : pathChoices(model, query.value)
	return showAll.value ? all : filterRows(all, props.wanted)
})

function go(path) {
	query.value = ''
	base.value = path
}
</script>
