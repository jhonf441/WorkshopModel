<template>
	<div class="mo-macromap">
		<div v-if="!all.length" class="mo-faint">{{ t('macromap_none') }}</div>
		<template v-else>
			<div class="mo-flat-filters">
				<v-switch v-model="onlyParams" density="compact" color="primary" hide-details :label="t('macromap_only_params')" />
				<v-switch v-model="onlyCalls" density="compact" color="primary" hide-details :label="t('macromap_only_calls')" />
				<span class="mo-faint">{{ t('macromap_count', { n: rows.length }) }}</span>
			</div>
			<choice-help :choice="MACRO_MAP_SETTING" :title="t('help_how')" class="mb-2" />
			<div v-if="!rows.length" class="mo-faint">{{ t('macromap_no_match') }}</div>
			<div v-for="r in shown" :key="r.file" class="mo-usage-row">
				<button type="button" class="mo-usage-line" :aria-expanded="open.indexOf(r.file) >= 0 ? 'true' : 'false'" :title="r.file" @click="toggle(r.file)">
					<v-icon size="small">{{ open.indexOf(r.file) >= 0 ? 'mdi-chevron-down' : 'mdi-chevron-right' }}</v-icon>
					<span class="mo-key mo-usage-name">{{ r.name }}</span> <span class="mo-faint">{{ t('macromap_summary', { p: r.params.length, g: r.globalsRead.length + r.globalsWritten.length + r.globalsDefined.length, c: r.calls.length }) }}</span>
				</button>
				<div v-if="open.indexOf(r.file) >= 0" class="mo-sub mo-usage-refs">
					<div class="mo-faint">{{ r.file }}</div>
					<div class="mo-part mt-1">{{ t('macromap_example') }}</div>
					<div class="mo-snippet"><code class="mo-snippet-code">{{ r.example }}</code><v-btn size="x-small" variant="text" @click="copyLine(r.example)">{{ t('macromap_copy') }}</v-btn></div>
					<template v-if="r.params.length">
						<div class="mo-part mt-1">{{ t('macromap_params') }}</div>
						<ul class="mo-list"><li v-for="p in r.params" :key="p.name"><span class="mo-key">param.{{ p.name }}</span> {{ paramText(p) }}</li></ul>
					</template>
					<div v-for="g in GROUPS" :key="g.key">
						<template v-if="r[g.key].length"><div class="mo-part mt-1">{{ t(g.label) }}</div><div class="mo-files">{{ r[g.key].join(', ') }}</div></template>
					</div>
					<template v-if="r.calls.length">
						<div class="mo-part mt-1">{{ t('macromap_calls') }}</div>
						<ul class="mo-list"><li v-for="(c, i) in r.calls" :key="i"><span class="mo-key">{{ c.target || t('macromap_nothing') }}</span> <span class="mo-faint">{{ callText(c) }}</span></li></ul>
					</template>
					<template v-if="r.calledBy.length"><div class="mo-part mt-1">{{ t('macromap_called_by') }}</div><div class="mo-files">{{ r.calledBy.join(', ') }}</div></template>
					<div v-if="r.aborts.length" class="mo-faint mt-1">{{ t('macromap_aborts', { lines: r.aborts.join(', ') }) }}</div>
				</div>
			</div>
		</template>
	</div>
</template>

<script setup>
// The macro map (macro-map.js) over what the usage finder read: per macro file its parameters, globals and calls, narrowed by the search of the page, with the
// line that shows how to call it. The finder keeps the map of each file in its memory (usage-runner.js, needMap).
import { computed, ref } from 'vue'
import { i18n } from './dwc-host.js'
import ChoiceHelp from './ChoiceHelp.vue'
import { copyText } from './copy-text.js'
import { macroRows, filterMacroRows, MACRO_MAP_SETTING } from './macro-map.js'

const SHOWN = 200
const GROUPS = [{ key: 'globalsRead', label: 'macromap_globals_read' }, { key: 'globalsWritten', label: 'macromap_globals_written' }, { key: 'globalsDefined', label: 'macromap_globals_defined' }]

const props = defineProps({
	files: { type: Map, default: null },
	query: { type: String, default: '' }
})

const t = (k, p) => i18n.t('plugins.WorkshopModel.model.' + k, p)

const onlyParams = ref(false)
const onlyCalls = ref(false)
const open = ref([])

const all = computed(() => macroRows(props.files))
const rows = computed(() => filterMacroRows(all.value, { query: props.query, onlyParams: onlyParams.value, onlyCalls: onlyCalls.value }))
const shown = computed(() => rows.value.slice(0, SHOWN))

function toggle(file) {
	open.value = open.value.indexOf(file) >= 0 ? open.value.filter(f => f !== file) : open.value.concat([file])
}

function paramText(p) {
	const bits = [t('macromap_need_' + p.need)]
	if (p.defaults.length) bits.push(t('macromap_default', { value: p.defaults.join(', ') }))
	if (p.reads) bits.push(t('macromap_reads', { n: p.reads }))
	return bits.join(', ')
}

function callText(c) {
	const bits = []
	if (!c.target && c.expr) bits.push(t('macromap_dynamic', { expr: c.expr }))
	if (c.args.length) bits.push(t('macromap_passes', { args: c.args.map(a => a.name + a.value).join(' ') }))
	if (c.conditional) bits.push(t('macromap_conditional'))
	return bits.join('; ')
}

function copyLine(text) {
	return copyText(text)
}
</script>
