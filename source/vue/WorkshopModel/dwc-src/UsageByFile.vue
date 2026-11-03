<template>
	<div class="mo-usage-byfile">
		<v-select v-model="file" :items="files" density="compact" variant="outlined" hide-details class="mo-field mb-2" :label="t('usage_file')" />
		<div v-if="file && !rows.length" class="mo-faint">{{ t('usage_byfile_none') }}</div>
		<table v-else-if="rows.length" class="mo-table">
			<thead><tr><th>{{ t('key') }}</th><th>{{ t('usage_kind_define') }}</th><th>{{ t('usage_kind_set') }}</th><th>{{ t('usage_kind_read') }}</th></tr></thead>
			<tbody>
				<tr v-for="r in rows" :key="r.name">
					<td class="mo-key"><button v-if="live.has(r.name)" type="button" class="mo-link" :title="t('open_in_tree')" @click="emit('select', 'global.' + r.name)">{{ r.name }}</button><template v-else>{{ r.name }}</template></td>
					<td class="mo-value">{{ r.define.join(', ') }}</td>
					<td class="mo-value">{{ r.set.join(', ') }}</td>
					<td class="mo-value">{{ r.read.join(', ') }}</td>
				</tr>
			</tbody>
		</table>
	</div>
</template>

<script setup>
// The usage finder by file (usage-view.js fileView): pick one of the files read and see which globals it defines, writes or reads,
// with the line numbers.
import { computed, ref, watch } from 'vue'
import { i18n } from './dwc-host.js'
import { filesOf, fileView } from './usage-view.js'

const props = defineProps({
	refs: { type: Array, default: () => [] },
	liveNames: { type: Array, default: () => [] }
})
const emit = defineEmits(['select'])

const t = (k, p) => i18n.t('plugins.WorkshopModel.model.' + k, p)

const file = ref('')
const files = computed(() => filesOf(props.refs))
const live = computed(() => new Set(props.liveNames))
const rows = computed(() => (file.value ? fileView(props.refs, file.value) : []))

watch(files, list => {
	if (list.indexOf(file.value) < 0) file.value = list[0] || ''
}, { immediate: true })
</script>
