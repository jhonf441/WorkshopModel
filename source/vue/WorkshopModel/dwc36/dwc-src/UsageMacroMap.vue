<template>
	<div class="mo-macromap">
		<div v-if="!all.length" class="mo-faint">{{ t('macromap_none') }}</div>
		<div v-else>
			<div class="mo-flat-filters">
				<v-switch v-model="onlyParams" dense color="primary" hide-details :label="t('macromap_only_params')" />
				<v-switch v-model="onlyCalls" dense color="primary" hide-details :label="t('macromap_only_calls')" />
				<span class="mo-faint">{{ t('macromap_count', { n: rows.length }) }}</span>
			</div>
			<choice-help :choice="MACRO_MAP_SETTING" :title="t('help_how')" class="mb-2" />
			<div v-if="!rows.length" class="mo-faint">{{ t('macromap_no_match') }}</div>
			<div v-for="r in shown" :key="r.file" class="mo-usage-row">
				<button type="button" class="mo-usage-line" :aria-expanded="open.indexOf(r.file) >= 0 ? 'true' : 'false'" :title="r.file" @click="toggle(r.file)">
					<v-icon small>{{ open.indexOf(r.file) >= 0 ? 'mdi-chevron-down' : 'mdi-chevron-right' }}</v-icon>
					<span class="mo-key mo-usage-name">{{ r.name }}</span> <span class="mo-faint">{{ t('macromap_summary', { p: r.params.length, g: r.globalsRead.length + r.globalsWritten.length + r.globalsDefined.length, c: r.calls.length }) }}</span>
				</button>
				<div v-if="open.indexOf(r.file) >= 0" class="mo-sub mo-usage-refs">
					<div class="mo-faint">{{ r.file }}</div>
					<div class="mo-part mt-1">{{ t('macromap_example') }}</div>
					<div class="mo-snippet"><code class="mo-snippet-code">{{ r.example }}</code><v-btn x-small text @click="copyLine(r.example)">{{ t('macromap_copy') }}</v-btn></div>
					<div v-if="r.params.length">
						<div class="mo-part mt-1">{{ t('macromap_params') }}</div>
						<ul class="mo-list"><li v-for="p in r.params" :key="p.name"><span class="mo-key">param.{{ p.name }}</span> {{ paramText(p) }}</li></ul>
					</div>
					<div v-for="g in GROUPS" :key="g.key">
						<div v-if="r[g.key].length"><div class="mo-part mt-1">{{ t(g.label) }}</div><div class="mo-files">{{ r[g.key].join(', ') }}</div></div>
					</div>
					<div v-if="r.calls.length">
						<div class="mo-part mt-1">{{ t('macromap_calls') }}</div>
						<ul class="mo-list"><li v-for="(c, i) in r.calls" :key="i"><span class="mo-key">{{ c.target || t('macromap_nothing') }}</span> <span class="mo-faint">{{ callText(c) }}</span></li></ul>
					</div>
					<div v-if="r.calledBy.length"><div class="mo-part mt-1">{{ t('macromap_called_by') }}</div><div class="mo-files">{{ r.calledBy.join(', ') }}</div></div>
					<div v-if="r.aborts.length" class="mo-faint mt-1">{{ t('macromap_aborts', { lines: r.aborts.join(', ') }) }}</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
'use strict'

// The macro map (macro-map.js) over what the usage finder read: per macro file its parameters, globals and calls, narrowed by the search of the page, with the
// line that shows how to call it. The finder keeps the map of each file in its memory (usage-runner.js, needMap).
import i18n from '../../i18n'
import ChoiceHelp from './ChoiceHelp.vue'
import { copyText } from './copy-text.js'
import { macroRows, filterMacroRows, MACRO_MAP_SETTING } from './macro-map.js'

const SHOWN = 200
const GROUPS = [{ key: 'globalsRead', label: 'macromap_globals_read' }, { key: 'globalsWritten', label: 'macromap_globals_written' }, { key: 'globalsDefined', label: 'macromap_globals_defined' }]

export default {
	components: { ChoiceHelp },
	props: {
		files: { type: Map, default: null },
		query: { type: String, default: '' }
	},
	data() {
		return { onlyParams: false, onlyCalls: false, open: [], GROUPS, MACRO_MAP_SETTING }
	},
	computed: {
		all() {
			return macroRows(this.files)
		},
		rows() {
			return filterMacroRows(this.all, { query: this.query, onlyParams: this.onlyParams, onlyCalls: this.onlyCalls })
		},
		shown() {
			return this.rows.slice(0, SHOWN)
		}
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		},
		toggle(file) {
			this.open = this.open.indexOf(file) >= 0 ? this.open.filter(f => f !== file) : this.open.concat([file])
		},
		paramText(p) {
			const bits = [this.t('macromap_need_' + p.need)]
			if (p.defaults.length) bits.push(this.t('macromap_default', { value: p.defaults.join(', ') }))
			if (p.reads) bits.push(this.t('macromap_reads', { n: p.reads }))
			return bits.join(', ')
		},
		callText(c) {
			const bits = []
			if (!c.target && c.expr) bits.push(this.t('macromap_dynamic', { expr: c.expr }))
			if (c.args.length) bits.push(this.t('macromap_passes', { args: c.args.map(a => a.name + a.value).join(' ') }))
			if (c.conditional) bits.push(this.t('macromap_conditional'))
			return bits.join('; ')
		},
		copyLine(text) {
			return copyText(text)
		}
	}
}
</script>
