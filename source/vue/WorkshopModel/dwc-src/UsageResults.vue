<template>
	<div class="mo-usage-results">
		<div class="mo-flat-filters">
			<span class="wf-state" :class="counts.problems ? 'err' : 'ok'" role="status">{{ t('usage_problems', { n: counts.problems }) }}</span>
			<span v-if="counts.maybe" class="wf-state warn" :title="t('usage_maybe_help')">{{ t('usage_maybe_n', { n: counts.maybe }) }}</span>
			<span class="wf-state" :title="t('usage_hint_help')">{{ t('usage_hints', { n: counts.hints }) }}</span>
		</div>
		<div v-if="unscanned.length" class="mo-usage-unscanned" role="status">
			<span class="mo-faint">{{ t('usage_unscanned', { n: unscanned.length }) }}</span>
			<v-btn v-for="f in unscanned.slice(0, 6)" :key="f.dir" size="x-small" variant="outlined" @click="emit('scan-folder', f)">{{ t('usage_scan_folder', { dir: f.dir }) }}</v-btn>
		</div>
		<div class="mo-toolbar">
			<v-text-field v-model="query" density="compact" variant="outlined" hide-details clearable prepend-inner-icon="mdi-magnify" class="mo-search" :label="t('usage_search')" :placeholder="t('usage_search_hint')" />
			<v-select v-model="file" :items="fileItems" item-title="title" item-value="value" density="compact" variant="outlined" hide-details class="mo-field" :label="t('usage_file')" />
		</div>
		<div class="mo-flat-filters" role="group" :aria-label="t('usage_kinds')">
			<v-switch v-model="onlyProblems" density="compact" color="primary" hide-details :label="t(S.problems.label)" />
			<button v-for="k in REF_KINDS" :key="k" type="button" class="wf-cat" :aria-pressed="kinds.indexOf(k) >= 0 ? 'true' : 'false'" @click="toggleKind(k)">{{ t('usage_kind_' + k) }}</button>
		</div>
		<choice-help :choice="S.problems" :title="t('help_how')" class="mb-2" />
		<div v-if="!shown.length" class="mo-faint">{{ onlyProblems ? t('usage_none_problems') : t('usage_no_match') }}</div>
		<div v-for="r in shown" :key="r.name" class="mo-usage-row">
			<button type="button" class="mo-usage-line" :aria-expanded="open.indexOf(r.name) >= 0 ? 'true' : 'false'" @click="toggle(r.name)">
				<v-icon size="small">{{ open.indexOf(r.name) >= 0 ? 'mdi-chevron-down' : 'mdi-chevron-right' }}</v-icon>
				<span class="mo-key mo-usage-name">{{ r.name }}</span> <span class="mo-faint mo-usage-counts">{{ t('usage_line', { d: r.definedIn, w: r.writtenIn, r: r.readIn }) }}</span> <span v-if="r.problem" class="wf-state err mo-usage-state">{{ t('usage_problem_word') }}</span><span v-else-if="r.maybe" class="wf-state warn mo-usage-state" :title="t('usage_maybe_help')">{{ t('usage_maybe_word') }}</span><span v-else-if="r.hint" class="wf-state mo-usage-state" :title="t('usage_hint_help')">{{ t('usage_hint_word') }}</span>
			</button>
			<div v-if="open.indexOf(r.name) >= 0" class="mo-sub mo-usage-refs">
				<div v-if="r.hint" class="mo-faint mb-1">{{ t('usage_hint_help') }}</div>
				<div v-if="r.maybe" class="mo-faint mb-1">{{ t('usage_maybe_help') }}</div>
				<button v-if="r.live" type="button" class="mo-link mb-1" @click="emit('select', 'global.' + r.name)">{{ t('open_in_tree') }}</button>
				<table class="mo-table">
					<thead><tr><th>{{ t('usage_file') }}</th><th>{{ t('usage_line_n') }}</th><th>{{ t('usage_kinds') }}</th></tr></thead>
					<tbody>
						<tr v-for="(x, i) in r.refs" :key="i"><td class="mo-files">{{ x.file }}</td><td class="mo-value">{{ x.line }}</td><td>{{ t('usage_kind_' + x.kind) }}</td></tr>
					</tbody>
				</table>
			</div>
		</div>
	</div>
</template>

<script setup>
// The result of the usage finder (usage-view.js): the count of real problems and of soft hints, the filters (only problems, on when it
// opens; kinds of use; one file; part of a name), the folders not read with a button each (a name read there may be defined there),
// and one line per global (defined in N files, written in N, read in N) that opens to
// its files with the line numbers and a link to the tree.
import { computed, ref } from 'vue'
import { i18n } from './dwc-host.js'
import ChoiceHelp from './ChoiceHelp.vue'
import { SCOPE_SETTINGS } from './usage-scope.js'
import { REF_KINDS, globalRows, filterRows, problemCounts, filesOf } from './usage-view.js'

const props = defineProps({
	refs: { type: Array, default: () => [] },
	liveNames: { type: Array, default: () => [] },
	complete: { type: Boolean, default: true },
	unscanned: { type: Array, default: () => [] }
})
const emit = defineEmits(['select', 'scan-folder'])

const S = SCOPE_SETTINGS
const t = (k, p) => i18n.t('plugins.WorkshopModel.model.' + k, p)

const query = ref('')
const file = ref('')
const onlyProblems = ref(true)
const kinds = ref([])
const open = ref([])

const rows = computed(() => globalRows(props.refs, props.liveNames, { complete: props.complete }))
const counts = computed(() => problemCounts(rows.value))
const fileItems = computed(() => [{ value: '', title: t('usage_all_files') }].concat(filesOf(props.refs).map(f => ({ value: f, title: f }))))
const shown = computed(() => filterRows(rows.value, { onlyProblems: onlyProblems.value, kinds: kinds.value, file: file.value, query: query.value }))

function toggleKind(k) {
	kinds.value = kinds.value.indexOf(k) >= 0 ? kinds.value.filter(x => x !== k) : kinds.value.concat([k])
}
function toggle(name) {
	open.value = open.value.indexOf(name) >= 0 ? open.value.filter(x => x !== name) : open.value.concat([name])
}
</script>
