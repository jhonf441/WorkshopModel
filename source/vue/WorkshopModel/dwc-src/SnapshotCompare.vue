<template>
	<v-card class="mb-3">
		<v-card-text>
			<div class="mo-part"><v-icon size="20" class="mr-1">mdi-compare-horizontal</v-icon>{{ t('compare_title') }}</div>
			<div class="mo-faint mb-2">{{ t('compare_help') }}</div>
			<div class="mo-form">
				<v-select :model-value="from" :items="items" item-title="title" item-value="value" density="compact" variant="outlined" hide-details class="mo-field" :label="t('compare_from')" @update:model-value="emit('pick-from', $event)" />
				<v-select :model-value="to" :items="items" item-title="title" item-value="value" density="compact" variant="outlined" hide-details class="mo-field" :label="t('compare_to')" @update:model-value="emit('pick-to', $event)" />
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
								<td class="mo-key"><button type="button" class="mo-link" :title="t('open_in_tree')" @click="emit('select', d.path)">{{ d.path }}</button></td>
								<td class="mo-value">{{ d.before === null ? '-' : d.before }}</td>
								<td class="mo-value">{{ d.after === null ? '-' : d.after }}</td>
								<td>{{ t('diff_' + d.state) }}</td>
							</tr>
						</tbody>
					</table>
				</div>
				<v-btn v-if="page.more" size="small" variant="outlined" class="mt-2" @click="pages++">{{ t('flat_more', { n: Math.min(page.more, FLAT_PAGE) }) }}</v-btn>
			</template>
		</v-card-text>
	</v-card>
</template>

<script setup>
// The comparison of two snapshots, or of a snapshot with the model now (snapshots.js snapshotDiff over change-diff.js diffMaps): what
// changed, what was added and what was removed, filtered by kind with the category pills of the family, FLAT_PAGE rows at a time. The
// model now is read with the scope of the other side, so a snapshot of one branch is compared with that branch only.
import { computed, ref, watch } from 'vue'
import { i18n } from './dwc-host.js'
import { liveModel } from './model-host.js'
import { LIVE, makeSnapshot, snapshotDiff, diffSummary } from './snapshots.js'
import { FLAT_PAGE, pageOf } from './flat-list.js'

const STATES = ['changed', 'added', 'removed']

const props = defineProps({
	list: { type: Array, default: () => [] },
	from: { type: String, default: '' },
	to: { type: String, default: '' },
	tick: { type: Number, default: 0 },
	maxLeaves: { type: Number, default: 4000 }
})
const emit = defineEmits(['pick-from', 'pick-to', 'select'])

const t = (k, p) => i18n.t('plugins.WorkshopModel.model.' + k, p)

const states = ref([])
const pages = ref(1)

const items = computed(() => [{ value: LIVE, title: t('snapshot_live') }].concat(props.list.map(s => ({ value: s.name, title: s.name }))))
const saved = name => props.list.find(s => s.name === name) || null
// the model now, with the scope of the other side (the whole model when both sides are the model now)
function sideOf(name, other) {
	if (name !== LIVE) return saved(name)
	const o = other && other !== LIVE ? saved(other) : null
	return makeSnapshot('live', liveModel(), o ? o.scope : '', new Date(), props.maxLeaves)
}
const a = computed(() => {
	void props.tick
	return sideOf(props.from, props.to)
})
const b = computed(() => {
	void props.tick
	return sideOf(props.to, props.from)
})
const diff = computed(() => (a.value && b.value && props.from !== props.to ? snapshotDiff(a.value, b.value) : []))
const summary = computed(() => diffSummary(diff.value))
const shown = computed(() => (states.value.length ? diff.value.filter(d => states.value.indexOf(d.state) >= 0) : diff.value))
const page = computed(() => pageOf(shown.value, pages.value, FLAT_PAGE))

watch([() => props.from, () => props.to, states], () => { pages.value = 1 })

function toggle(s) {
	states.value = states.value.indexOf(s) >= 0 ? states.value.filter(x => x !== s) : states.value.concat([s])
}
</script>
