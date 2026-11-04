<template>
	<div class="mo-flow" role="group" :aria-label="t('guided_flow_title')">
		<div class="mo-flow-row">
			<span class="mo-flow-label">{{ t('guided_flow_open_title') }}</span>
			<span v-if="!open.length" class="mo-faint">{{ t('guided_flow_open_none') }}</span>
			<template v-else>
				<span v-for="b in open" :key="b.start" class="mo-flow-open"><code>{{ b.open }}</code><span class="mo-faint">{{ t('guided_flow_open_at', { at: b.start + 1 }) }}</span></span>
				<v-btn size="x-small" variant="outlined" class="mo-code-btn" :title="t('guided_flow_close_all_help')" @click="emit('insert', closers)">{{ t('guided_flow_close_all', { closers }) }}</v-btn>
			</template>
		</div>
		<div class="mo-flow-row mo-flow-hint" role="status">{{ t('guided_flow_expect_' + expectKey) }}</div>
		<div v-for="g in groups" :key="g.id" class="mo-flow-row">
			<span class="mo-flow-label">{{ t('guided_flow_group_' + g.id) }}</span>
			<v-btn v-for="c in g.chips" :key="c.id" size="x-small" variant="outlined" class="mo-code-btn mo-flow-chip" :class="{ 'mo-flow-off': !c.ok }" :aria-disabled="c.ok ? 'false' : 'true'" :title="c.ok ? t('guided_flow_insert', { what: c.insert.trim() }) : t('guided_flow_why_' + c.reason)" @click="c.ok && emit('insert', c.insert)">{{ c.insert.trim() }}</v-btn>
		</div>
		<ul v-if="steps.length" class="mo-flow-steps" :aria-label="t('guided_flow_review')">
			<li v-for="s in steps" :key="s.id" class="mo-flow-step" :class="'is-' + s.state">
				<v-icon size="x-small">{{ s.state === 'ok' ? 'mdi-check-circle-outline' : s.state === 'todo' ? 'mdi-progress-clock' : 'mdi-alert-circle-outline' }}</v-icon>
				<span>{{ stepText(s) }}</span>
			</li>
		</ul>
	</div>
</template>

<script setup>
// The panel under the expression field that follows what is being written: which brackets are still open (and a button that closes them all),
// what goes now (a value or an operator), the buttons that fit there, on and with their pointers, and the ones that do not, off and saying
// why, and a step by step review (quotes, brackets, ending, blanks). It only reads the text and the cursor (expression-flow.js) and asks for
// an insertion; the field, the type checker and Send stay where they were.
import { computed } from 'vue'
import { i18n } from './dwc-host.js'
import { nextSteps, closeAll, reviewSteps } from './expression-flow.js'

const props = defineProps({
	text: { type: String, default: '' },
	cursor: { type: Number, default: 0 }
})
const emit = defineEmits(['insert'])

const t = (k, p) => i18n.t('plugins.WorkshopModel.model.' + k, p)
const flow = computed(() => nextSteps(props.text, props.cursor))
const open = computed(() => flow.value.structure.stack)
const closers = computed(() => closeAll(props.text))
const expectKey = computed(() => (flow.value.inString ? 'string' : flow.value.structure.expect))
const groups = computed(() => ['close', 'open', 'operator', 'value'].map(id => ({ id, chips: flow.value.chips.filter(c => c.group === id) })).filter(g => g.chips.length))
const steps = computed(() => reviewSteps(props.text))

function stepText(s) {
	const key = 'guided_flow_check_' + s.id + '_' + s.state + (s.id === 'brackets' && s.state === 'bad' && !s.wanted ? '_none' : '')
	return t(key, { what: s.what, wanted: s.wanted })
}
</script>
