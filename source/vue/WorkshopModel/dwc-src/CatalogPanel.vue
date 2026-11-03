<template>
	<div class="mo-xb-panel">
		<v-text-field v-model="query" density="compact" variant="outlined" hide-details spellcheck="false" clearable :label="t('catalog_search')" />
		<div class="mo-xb-groups">
			<button v-for="g in groups" :key="g" type="button" class="wf-cat mo-xb-group" :class="{ on: group === g }" :aria-pressed="group === g ? 'true' : 'false'" @click="group = g">{{ g === 'all' ? t('catalog_all') : t('exg_' + g) }}</button>
		</div>
		<div v-if="!known" class="mo-faint">{{ t('catalog_unknown') }}</div>
		<div v-if="hidden" class="mo-faint">
			{{ t('catalog_hidden', { n: hidden }) }}
			<v-btn size="x-small" variant="text" @click="showNewer = !showNewer">{{ showNewer ? t('catalog_hide_newer') : t('catalog_show_newer') }}</v-btn>
		</div>
		<div v-if="unfit && !refused" class="mo-faint" role="status">{{ t('guided_fit_some', { n: unfit }) }}</div>
		<div v-if="refused" class="mo-error" role="alert">{{ refused }}</div>
		<div v-if="!items.length" class="mo-faint mt-2">{{ t('catalog_none') }}</div>
		<div v-for="x in items" :key="x.entry.id" class="mo-xb-entry" :class="{ 'mo-xb-off': x.support.state === 'newer' || !x.fit.ok }">
			<div class="mo-xb-entry-head">
				<code class="mo-key">{{ x.entry.template }}</code>
				<span v-if="x.support.state === 'newer'" class="wf-state warn"><span class="wf-dot warn"></span>{{ t('catalog_needs', { version: x.support.since }) }}</span>
				<span v-else-if="x.entry.since !== '3.0'" class="mo-faint">{{ t('catalog_since', { version: x.support.since }) }}</span>
				<v-btn v-if="x.entry.use === 'expression'" size="x-small" variant="text" :disabled="x.support.state === 'newer'" :title="x.fit.ok ? null : reasonOf(x)" @click="insert(x)">{{ t('catalog_insert') }}</v-btn>
				<v-btn v-else size="x-small" variant="text" @click="copy(x.entry)">{{ copied === x.entry.id ? t('catalog_copied') : t('catalog_copy') }}</v-btn>
			</div>
			<div>{{ t('expr_' + x.entry.id) }}</div>
			<div class="mo-faint">{{ t('catalog_example') }}: <code class="mo-key">{{ x.entry.example }}</code></div>
			<div v-if="x.entry.use === 'gcode'" class="mo-faint">{{ t('catalog_gcode_note') }}</div>
		</div>
	</div>
</template>

<script setup>
// What an expression can do (expression-catalog.js): groups and a search; each entry says what it does, shows a worked example and
// puts its pattern in the expression. What the firmware of the board lacks is hidden (a button shows it, marked). A form that makes
// no sense where the cursor is (inside a text, into a blank that asks for something else, around a selection of another type:
// expression-holes.js fitOfInsert) is dimmed and a tap on Insert says why in one sentence instead of inserting. Emits `insert`.
import { computed, ref, watch } from 'vue'
import { i18n } from './dwc-host.js'
import { CATALOG_GROUPS, catalogFor, lackedCount } from './expression-catalog.js'
import { fitOfInsert } from './expression-holes.js'
import { RESULT_TYPES } from './expression-result.js'
import { parseVersion } from './rrf-version.js'
import { copyText } from './copy-text.js'

const props = defineProps({
	firmware: { type: String, default: '' },
	context: { type: Object, default: null }
})
const emit = defineEmits(['insert'])

const t = (k, p) => i18n.t('plugins.WorkshopModel.model.' + k, p)
const word = type => (RESULT_TYPES.indexOf(type) >= 0 ? t('rtype_' + type) : type === 'path' ? t('guided_need_path') : String(type || ''))

const groups = ['all'].concat(CATALOG_GROUPS)
const query = ref('')
const group = ref('all')
const showNewer = ref(false)
const copied = ref('')
const refused = ref('')

const known = computed(() => !!parseVersion(props.firmware))
const hidden = computed(() => lackedCount(props.firmware))
const items = computed(() => catalogFor({ group: group.value, query: query.value, firmware: props.firmware, showNewer: showNewer.value, text: id => t('expr_' + id) }).map(x => Object.assign({ fit: x.entry.use === 'expression' ? fitOfInsert(x.entry, props.context) : { ok: true } }, x)))
const unfit = computed(() => items.value.filter(x => !x.fit.ok).length)

watch(() => props.context, () => { refused.value = '' })

function reasonOf(x) {
	return t('guided_fit_' + x.fit.reason, { form: x.entry.template, need: word(x.fit.need), got: word(x.fit.got) })
}
function insert(x) {
	if (!x.fit.ok) {
		refused.value = reasonOf(x)
		return
	}
	refused.value = ''
	emit('insert', x.entry.template)
}
async function copy(entry) {
	if (await copyText(entry.example)) copied.value = entry.id
}
</script>
