<template>
	<div class="mo-value-table">
		<table class="mo-table">
			<thead>
				<tr><th>{{ t('detail_index') }}</th><th v-if="table.kind === 'values'">{{ t('value') }}</th><th v-for="c in table.columns" :key="c">{{ c }}</th></tr>
			</thead>
			<tbody>
				<tr v-for="r in table.rows" :key="r.index">
					<td class="mo-key"><button type="button" class="mo-link" :title="t('open_in_tree')" @click="emit('select', r.path)">{{ r.index }}</button></td>
					<td v-for="(c, i) in r.cells" :key="i" class="mo-value">{{ c }}</td>
				</tr>
			</tbody>
		</table>
		<div v-if="table.more" class="mo-faint">{{ t('detail_table_more', { n: table.more }) }}</div>
		<div v-if="table.moreCols" class="mo-faint">{{ t('detail_table_more_cols', { n: table.moreCols }) }}</div>
	</div>
</template>

<script setup>
// An array of the model as a small table (value-table.js): one column of values, or one column per key for a list of objects
// (move.axes, heat.heaters, tools). The index opens that item.
import { i18n } from './dwc-host.js'

defineProps({
	table: { type: Object, required: true }
})
const emit = defineEmits(['select'])

const t = (k, p) => i18n.t('plugins.WorkshopModel.model.' + k, p)
</script>
