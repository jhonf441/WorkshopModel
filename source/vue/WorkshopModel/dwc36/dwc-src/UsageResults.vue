<template>
	<div class="mo-usage-results">
		<div class="mo-flat-filters">
			<span class="wf-state" :class="counts.problems ? 'err' : 'ok'" role="status">{{ t('usage_problems', { n: counts.problems }) }}</span>
			<span v-if="counts.maybe" class="wf-state warn" :title="t('usage_maybe_help')">{{ t('usage_maybe_n', { n: counts.maybe }) }}</span>
			<span class="wf-state" :title="t('usage_hint_help')">{{ t('usage_hints', { n: counts.hints }) }}</span>
		</div>
		<div v-if="unscanned.length" class="mo-usage-unscanned" role="status">
			<span class="mo-faint">{{ t('usage_unscanned', { n: unscanned.length }) }}</span>
			<v-btn v-for="f in unscanned.slice(0, 6)" :key="f.dir" x-small outlined @click="$emit('scan-folder', f)">{{ t('usage_scan_folder', { dir: f.dir }) }}</v-btn>
		</div>
		<div class="mo-toolbar">
			<v-text-field v-model="query" dense outlined hide-details clearable prepend-inner-icon="mdi-magnify" class="mo-search" :label="t('usage_search')" :placeholder="t('usage_search_hint')" />
			<v-select v-model="file" :items="fileItems" item-text="title" item-value="value" dense outlined hide-details class="mo-field" :label="t('usage_file')" />
		</div>
		<div class="mo-flat-filters" role="group" :aria-label="t('usage_kinds')">
			<v-switch v-model="onlyProblems" dense color="primary" hide-details :label="t(S.problems.label)" />
			<button v-for="k in REF_KINDS" :key="k" type="button" class="wf-cat" :aria-pressed="kinds.indexOf(k) >= 0 ? 'true' : 'false'" @click="toggleKind(k)">{{ t('usage_kind_' + k) }}</button>
		</div>
		<choice-help :choice="S.problems" :title="t('help_how')" class="mb-2" />
		<div v-if="!shown.length" class="mo-faint">{{ onlyProblems ? t('usage_none_problems') : t('usage_no_match') }}</div>
		<div v-for="r in shown" :key="r.name" class="mo-usage-row">
			<button type="button" class="mo-usage-line" :aria-expanded="open.indexOf(r.name) >= 0 ? 'true' : 'false'" @click="toggle(r.name)">
				<v-icon small>{{ open.indexOf(r.name) >= 0 ? 'mdi-chevron-down' : 'mdi-chevron-right' }}</v-icon>
				<span class="mo-key mo-usage-name">{{ r.name }}</span> <span class="mo-faint mo-usage-counts">{{ t('usage_line', { d: r.definedIn, w: r.writtenIn, r: r.readIn }) }}</span> <span v-if="r.problem" class="wf-state err mo-usage-state">{{ t('usage_problem_word') }}</span><span v-else-if="r.maybe" class="wf-state warn mo-usage-state" :title="t('usage_maybe_help')">{{ t('usage_maybe_word') }}</span><span v-else-if="r.hint" class="wf-state mo-usage-state" :title="t('usage_hint_help')">{{ t('usage_hint_word') }}</span>
			</button>
			<div v-if="open.indexOf(r.name) >= 0" class="mo-sub mo-usage-refs">
				<div v-if="r.hint" class="mo-faint mb-1">{{ t('usage_hint_help') }}</div>
				<div v-if="r.maybe" class="mo-faint mb-1">{{ t('usage_maybe_help') }}</div>
				<button v-if="r.live" type="button" class="mo-link mb-1" @click="$emit('select', 'global.' + r.name)">{{ t('open_in_tree') }}</button>
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

<script>
'use strict'

// The result of the usage finder (usage-view.js): the count of real problems and of soft hints, the filters (only problems, on when it
// opens; kinds of use; one file; part of a name), the folders not read with a button each (a name read there may be defined there),
// and one line per global (defined in N files, written in N, read in N) that opens to
// its files with the line numbers and a link to the tree.
import i18n from '../../i18n'
import ChoiceHelp from './ChoiceHelp.vue'
import { SCOPE_SETTINGS } from './usage-scope.js'
import { REF_KINDS, globalRows, filterRows, problemCounts, filesOf } from './usage-view.js'

export default {
	components: { ChoiceHelp },
	props: {
		refs: { type: Array, default: () => [] },
		liveNames: { type: Array, default: () => [] },
		complete: { type: Boolean, default: true },
		unscanned: { type: Array, default: () => [] }
	},
	data() {
		return { query: '', file: '', onlyProblems: true, kinds: [], open: [], S: SCOPE_SETTINGS, REF_KINDS }
	},
	computed: {
		rows() {
			return globalRows(this.refs, this.liveNames, { complete: this.complete })
		},
		counts() {
			return problemCounts(this.rows)
		},
		fileItems() {
			return [{ value: '', title: this.t('usage_all_files') }].concat(filesOf(this.refs).map(f => ({ value: f, title: f })))
		},
		shown() {
			return filterRows(this.rows, { onlyProblems: this.onlyProblems, kinds: this.kinds, file: this.file, query: this.query })
		}
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		},
		toggleKind(k) {
			this.kinds = this.kinds.indexOf(k) >= 0 ? this.kinds.filter(x => x !== k) : this.kinds.concat([k])
		},
		toggle(name) {
			this.open = this.open.indexOf(name) >= 0 ? this.open.filter(x => x !== name) : this.open.concat([name])
		}
	}
}
</script>
