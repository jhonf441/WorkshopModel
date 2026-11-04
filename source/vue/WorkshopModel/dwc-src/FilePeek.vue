<template>
	<div class="mo-peek mo-fade-in" role="region" :aria-label="t('peek_title', { path })">
		<div class="mo-peek-head">
			<code class="mo-peek-path" :title="path">{{ path }}</code>
			<span v-if="line" class="mo-faint">{{ t('peek_at', { n: line }) }}</span>
			<span class="mo-peek-actions">
				<v-btn size="x-small" variant="outlined" @click="copy"><v-icon size="14" class="mr-1">mdi-content-copy</v-icon>{{ t('peek_copy') }}</v-btn>
				<v-btn size="x-small" variant="text" @click="emit('close')">{{ t('close') }}</v-btn>
			</span>
		</div>
		<div v-if="state === 'loading'" class="mo-faint" role="status">{{ t('peek_loading') }}</div>
		<div v-else-if="state === 'missing'" class="mo-faint" role="status">{{ t('peek_missing') }}</div>
		<div v-else-if="state === 'error'" class="mo-error" role="alert">{{ t('peek_error') }}</div>
		<template v-else>
			<div v-if="view.cut" class="mo-faint">{{ t('peek_window', { from: view.from, to: view.to, total: view.total }) }}</div>
			<div ref="box" class="mo-peek-box" tabindex="0" :aria-label="t('peek_box')">
				<div v-for="r in view.rows" :key="r.n" class="mo-peek-row" :class="{ hit: r.hit }" :ref="el => { if (r.hit) hit = el }">
					<span class="mo-peek-n">{{ r.n }}</span>
					<span class="mo-peek-text"><template v-for="(p, i) in parts(r)" :key="i"><mark v-if="p.mark" class="mo-peek-mark">{{ p.text }}</mark><template v-else>{{ p.text }}</template></template></span>
				</div>
			</div>
		</template>
		<div v-if="copied" class="mo-faint" role="status">{{ t('usage_detail_copied', { text: copied }) }}</div>
	</div>
</template>

<script setup>
// The small viewer of the usage finder: a click on "line N" of a file opens the file here with that line selected and the global marked inside it,
// so the use is seen in its place instead of only a number. It reads the file once and only when it opens; the file is not changed.
import { computed, nextTick, ref, watch } from 'vue'
import { i18n } from './dwc-host.js'
import { readText } from './model-host.js'
import { copyText } from './copy-text.js'
import { peekRows, splitMark } from './file-peek.js'

const props = defineProps({
	path: { type: String, required: true },
	line: { type: Number, default: 0 },
	name: { type: String, default: '' } // the global to mark inside the line
})
const emit = defineEmits(['close'])

const t = (k, p) => i18n.t('plugins.WorkshopModel.model.' + k, p)
const state = ref('loading')
const text = ref('')
const copied = ref('')
const box = ref(null)
let hit = null
const view = computed(() => peekRows(text.value, props.line))

const parts = row => (row.hit ? splitMark(row.text, props.name) : [{ text: row.text, mark: false }])

// the line of the use in the middle of the box (the box scrolls, not the page)
function reveal() {
	if (box.value && hit) box.value.scrollTop = Math.max(0, hit.offsetTop - box.value.clientHeight / 2 + hit.clientHeight / 2)
}

async function load() {
	state.value = 'loading'
	copied.value = ''
	try {
		const t0 = await readText(props.path)
		if (t0 === null) {
			state.value = 'missing'
			return
		}
		text.value = t0
		state.value = 'ready'
		nextTick(reveal)
	} catch (e) {
		state.value = 'error'
	}
}

async function copy() {
	const ref0 = props.path + (props.line ? ':' + props.line : '')
	if (await copyText(ref0)) copied.value = ref0
}

watch(() => props.path, load, { immediate: true })
watch(() => props.line, () => nextTick(reveal))
</script>
