<template>
	<div class="mo-sub mo-xb-assist" role="status" aria-live="polite">
		<div class="mo-xb-assist-head">
			<span class="mo-part mb-0"><v-icon size="18" class="mr-1">mdi-form-textbox</v-icon>{{ t('guided_assist') }}</span>
			<span class="mo-faint">{{ t('guided_hole_count', { i: index, n: holes.length }) }}</span>
			<v-btn size="x-small" variant="text" :disabled="holes.length < 2" :aria-label="t('guided_prev')" :title="t('guided_prev')" @click="emit('prev')"><v-icon size="16">mdi-chevron-left</v-icon></v-btn>
			<v-btn size="x-small" variant="text" :disabled="holes.length < 2" :aria-label="t('guided_next')" :title="t('guided_next')" @click="emit('next')"><v-icon size="16">mdi-chevron-right</v-icon></v-btn>
		</div>
		<choice-help :choice="help" :title="t('guided_assist')" />
		<code class="mo-key mo-xb-preview">{{ shown.before }}<mark class="mo-xb-hole">{{ shown.text }}</mark>{{ shown.after }}</code>
		<template v-if="hole">
			<div class="mo-xb-ask">{{ t('guided_hole_' + hole.kind) }}<span v-if="whereText" class="mo-faint"> ({{ whereText }})</span></div>
			<div class="mo-faint">{{ t('guided_hole_' + hole.kind + '_how') }}</div>
			<div v-if="hole.reference" class="mo-faint">{{ t('guided_reference', hole.reference) }}</div>
			<div v-if="rangeText" class="mo-faint">{{ rangeText }}</div>
			<div v-if="hole.choices.length" class="mo-xb-choices">
				<v-btn v-for="c in hole.choices" :key="c.code" size="x-small" variant="outlined" class="mo-code-btn" @click="emit('fill', c.code)">{{ c.code }}<span v-if="c.label" class="mo-faint mo-xb-choice-note">{{ c.label }}</span><span v-else-if="c.note" class="mo-faint mo-xb-choice-note">{{ t('guided_choice_' + c.note) }}</span></v-btn>
			</div>
			<div v-if="hole.input" class="mo-xb-fill">
				<v-text-field v-model="typed" density="compact" variant="outlined" hide-details spellcheck="false" :type="hole.input === 'number' ? 'number' : 'text'" :label="t('guided_type_' + hole.input)" class="mo-xb-fill-field" @keydown.enter.prevent="put" />
				<v-btn size="small" variant="outlined" :disabled="!typed.trim()" @click="put">{{ t('guided_put') }}</v-btn>
			</div>
			<v-btn v-if="hole.pick" size="x-small" variant="text" @click="emit('pick', hole.wanted)">{{ t('guided_pick_path') }}</v-btn>
		</template>
		<div v-else class="mo-xb-ask">
			{{ t('guided_left', { n: holes.length, what: shown.text }) }}
			<v-btn size="x-small" variant="text" @click="emit('go', shown)">{{ t('guided_go') }}</v-btn>
		</div>
	</div>
</template>

<script setup>
// The hole assistant (expression-holes.js): the ONE place that says a blank is still open. The expression is shown with the blank
// marked; for the blank the cursor is on, what goes there, where it sits, the choices this board has (axes, heaters, tools, fans,
// globals, lists, true and false, the value the other side has now) and a field to type a value; previous and next. When the cursor
// is not on a blank it says how many are left and offers to go to the first. Emits `fill` with the snippet to put in the blank,
// `prev`, `next`, `go` with the blank, and `pick` with the type the Paths tab should filter by.
import { computed, ref } from 'vue'
import { i18n } from './dwc-host.js'
import ChoiceHelp from './ChoiceHelp.vue'
import { GUIDED_HELP, fillSnippet } from './expression-holes.js'

const props = defineProps({
	holes: { type: Array, default: () => [] },
	hole: { type: Object, default: null }
})
const emit = defineEmits(['fill', 'prev', 'next', 'go', 'pick'])

const t = (k, p) => i18n.t('plugins.WorkshopModel.model.' + k, p)

const help = GUIDED_HELP.assist
const typed = ref('')

const shown = computed(() => props.hole || props.holes[0] || { before: '', text: '', after: '' })
const index = computed(() => Math.max(1, props.holes.findIndex(h => h.start === shown.value.start) + 1))
const whereText = computed(() => {
	const w = props.hole && props.hole.where
	return w && w.role ? t('guided_where_' + w.role, { what: w.what || '', n: w.n || '' }) : ''
})
const rangeText = computed(() => {
	const r = props.hole && props.hole.range
	if (!r) return ''
	return r.max === null || r.max === undefined ? t('guided_range_min', { min: r.min }) : t('guided_range', { min: r.min, max: r.max })
})

function put() {
	const snippet = fillSnippet(props.hole, typed.value)
	if (!snippet) return
	typed.value = ''
	emit('fill', snippet)
}
</script>

<style>
/* The hole assistant: a sub-card under the field; the open blank is marked in the highlight amber of DESIGN.md section 2 */
.mo-page .mo-xb-assist { margin-top: 6px; }
.mo-page .mo-xb-assist-head { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.mo-page .mo-xb-preview { display: block; margin: 6px 0; white-space: pre-wrap; word-break: break-all; }
.mo-page .mo-xb-hole { background: rgba(255, 143, 0, 0.3); color: inherit; border-radius: 3px; padding: 0 3px; }
.mo-page .mo-xb-ask { font-size: 13px; margin-top: 4px; }
.mo-page .mo-xb-choices { display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0; }
.mo-page .mo-xb-choice-note { margin-left: 4px; }
.mo-page .mo-xb-fill { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 6px 0; }
.mo-page .mo-xb-fill-field { flex: 1 1 160px; max-width: 260px; }
</style>
