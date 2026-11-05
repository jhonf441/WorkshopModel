<template>
	<div class="mo-sub mo-xb-assist" :class="typeClass" role="status" aria-live="polite">
		<div class="mo-xb-assist-head">
			<span class="mo-part mb-0"><v-icon :size="18" class="mr-1">mdi-form-textbox</v-icon>{{ t('guided_assist') }}</span>
			<span class="mo-faint">{{ t('guided_hole_count', { i: index, n: holes.length }) }}</span>
			<v-btn x-small text :disabled="holes.length < 2" :aria-label="t('guided_prev')" :title="t('guided_prev')" @click="$emit('prev')"><v-icon :size="16">mdi-chevron-left</v-icon></v-btn>
			<v-btn x-small text :disabled="holes.length < 2" :aria-label="t('guided_next')" :title="t('guided_next')" @click="$emit('next')"><v-icon :size="16">mdi-chevron-right</v-icon></v-btn>
		</div>
		<choice-guide :choice="help" :title="t('guided_assist')" />
		<code class="mo-key mo-xb-preview">{{ shown.before }}<mark class="mo-xb-hole">{{ shown.text }}</mark>{{ shown.after }}</code>
		<template v-if="hole">
			<div class="mo-xb-ask">{{ t('guided_hole_' + hole.kind) }}<span v-if="whereText" class="mo-faint"> ({{ whereText }})</span></div>
			<div class="mo-faint">{{ t('guided_hole_' + hole.kind + '_how') }}</div>
			<div v-if="hole.reference" class="mo-faint">{{ t('guided_reference', hole.reference) }}</div>
			<div v-if="rangeText" class="mo-faint">{{ rangeText }}</div>
			<div v-if="hole.choices.length" class="mo-xb-choices">
				<v-btn v-for="c in hole.choices" :key="c.code" x-small outlined class="mo-code-btn" @click="$emit('fill', c.code)">{{ c.code }}<span v-if="c.label" class="mo-faint mo-xb-choice-note">{{ c.label }}</span><span v-else-if="c.note" class="mo-faint mo-xb-choice-note">{{ t('guided_choice_' + c.note) }}</span></v-btn>
			</div>
			<div v-if="hole.input" class="mo-xb-fill">
				<v-text-field ref="fillField" v-model="typed" dense outlined hide-details spellcheck="false" :type="hole.input === 'number' ? 'number' : 'text'" :label="t('guided_type_' + hole.input)" class="mo-xb-fill-field" @keydown.enter.prevent="put" />
				<v-btn small outlined :disabled="!typed.trim()" @click="put">{{ t('guided_put') }}</v-btn>
			</div>
			<v-btn v-if="hole.pick" x-small text @click="$emit('pick', hole.wanted)">{{ t('guided_pick_path') }}</v-btn>
		</template>
		<div v-else class="mo-xb-ask">
			{{ t('guided_left', { n: holes.length, what: shown.text }) }}
			<v-btn x-small text @click="$emit('go', shown)">{{ t('guided_go') }}</v-btn>
		</div>
	</div>
</template>

<script>
'use strict'

// The hole assistant (expression-holes.js): the ONE place that says a blank is still open. The expression is shown with the blank
// marked; for the blank the cursor is on, what goes there, where it sits, the choices this board has (axes, heaters, tools, fans,
// globals, lists, true and false, the value the other side has now) and a field to type a value; previous and next. When the cursor
// is not on a blank it says how many are left and offers to go to the first. Emits `fill` with the snippet to put in the blank,
// `prev`, `next`, `go` with the blank, and `pick` with the type the Paths tab should filter by.
import i18n from '../../i18n'
import ChoiceGuide from './ChoiceGuide.vue'
import { GUIDED_HELP, fillSnippet } from './expression-holes.js'

export default {
	components: { ChoiceGuide },
	props: {
		holes: { type: Array, default: () => [] },
		hole: { type: Object, default: null }
	},
	data() {
		return { typed: '', refocus: false, help: GUIDED_HELP.assist }
	},
	computed: {
		// the colour of the kind the open blank asks for (number, text, true or false, path, list, a part of the machine): the border of the card, the mark and the ask line
		typeClass() {
			return 'mo-xb-k-' + (this.hole && this.hole.kind ? this.hole.kind : 'value')
		},
		shown() {
			return this.hole || this.holes[0] || { before: '', text: '', after: '' }
		},
		index() {
			return Math.max(1, this.holes.findIndex(h => h.start === this.shown.start) + 1)
		},
		whereText() {
			const w = this.hole && this.hole.where
			return w && w.role ? this.t('guided_where_' + w.role, { what: w.what || '', n: w.n || '' }) : ''
		},
		rangeText() {
			const r = this.hole && this.hole.range
			if (!r) return ''
			return r.max === null || r.max === undefined ? this.t('guided_range_min', { min: r.min }) : this.t('guided_range', { min: r.min, max: r.max })
		}
	},
	watch: {
		// a value typed here fills the blank and the person goes on to the next one: the focus goes to its field, no click needed
		hole(h, old) {
			if (!this.refocus) return
			this.refocus = false
			if (!h || (old && h.start === old.start)) return
			this.$nextTick(() => {
				const el = this.$refs.fillField && this.$refs.fillField.$el && this.$refs.fillField.$el.querySelector('input')
				if (el) el.focus()
			})
		}
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		},
		put() {
			const snippet = fillSnippet(this.hole, this.typed)
			if (!snippet) return
			this.typed = ''
			this.refocus = true
			this.$emit('fill', snippet)
		}
	}
}
</script>

<style>
/* The hole assistant: a sub-card under the field; the open blank is marked in the highlight amber of DESIGN.md section 2 */
.mo-page .mo-xb-assist { margin-top: 6px; }
.mo-page .mo-xb-assist-head { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.mo-page .mo-xb-preview { display: block; margin: 6px 0; white-space: pre-wrap; word-break: break-all; }
.mo-page .mo-xb-hole { background: color-mix(in srgb, var(--wf-warn) 30%, transparent); color: inherit; border-radius: 3px; padding: 0 3px; }
.mo-page .mo-xb-ask { font-size: 13px; margin-top: 4px; }
.mo-page .mo-xb-choices { display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0; }
.mo-page .mo-xb-choice-note { margin-left: 4px; }
.mo-page .mo-xb-fill { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 6px 0; }
.mo-page .mo-xb-fill-field { flex: 1 1 160px; max-width: 260px; }
</style>
