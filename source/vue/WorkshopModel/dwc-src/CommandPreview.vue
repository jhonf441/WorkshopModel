<template>
	<div class="mo-preview">
		<div class="mo-part">{{ t('preview_title') }}</div>
		<v-textarea v-model="text" density="compact" variant="outlined" hide-details auto-grow rows="1" spellcheck="false" class="mo-code" :readonly="!editable" :aria-label="t('preview_title')" />
		<div class="mo-faint">{{ preview.count ? t(preview.level === 2 ? 'preview_level2' : 'preview_level1', { n: preview.count }) : t('preview_nothing') }}</div>
		<div v-if="!canSend && disabledReason" class="mo-faint">{{ disabledReason }}</div>
		<div class="mo-actions">
			<v-btn size="small" variant="flat" :color="armed ? 'amber-darken-3' : 'primary'" :disabled="!canSend || !preview.count || sending" @click="press">
				{{ sending ? t('preview_sending') : (armed ? t('preview_tap_again', { what: preview.lines[0] }) : t('preview_send')) }}
			</v-btn>
		</div>
		<div v-if="slow" class="mo-faint" role="status">{{ t('preview_slow') }}</div>
		<div v-if="reply" class="mo-reply" role="status"><span class="mo-faint">{{ t('preview_reply') }}</span> <code>{{ reply }}</code></div>
		<div v-if="error" class="mo-error" role="alert">{{ t('preview_error', { error }) }}</div>
	</div>
</template>

<script setup>
// The exact G-code before it goes to the board (design item 4): editable, classified by command-preview.js. Level 1 (meta
// commands, reads) is one tap; level 2 (any other G or M code) is the double tap of DESIGN.md: the button turns amber and asks
// "Tap again" for 4 s. Lines are sent one by one; the reply of the board is shown; after 15 s without an answer it says so.
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { i18n } from './dwc-host.js'
import { sendCode } from './model-host.js'
import { previewOf } from './command-preview.js'
import { ARM_MS, pressArmed } from './armed.js'

const SLOW_MS = 15000

const props = defineProps({
	code: { type: String, default: '' },
	canSend: { type: Boolean, default: true },
	disabledReason: { type: String, default: '' },
	editable: { type: Boolean, default: true }
})
const emit = defineEmits(['sent'])

const t = (k, p) => i18n.t('plugins.WorkshopModel.model.' + k, p)

const text = ref('')
const armed = ref(false)
const sending = ref(false)
const slow = ref(false)
const reply = ref('')
const error = ref('')
let armedState = null
let armTimer = null
let slowTimer = null

watch(() => props.code, c => {
	text.value = c || ''
	reply.value = ''
	error.value = ''
}, { immediate: true })

const preview = computed(() => previewOf(text.value))

function press() {
	if (preview.value.level === 1) return send()
	const r = pressArmed(armedState, 'send', Date.now())
	armedState = r.state
	armed.value = !r.fire
	clearTimeout(armTimer)
	if (r.fire) return send()
	armTimer = setTimeout(() => {
		armedState = null
		armed.value = false
	}, ARM_MS)
}

async function send() {
	sending.value = true
	slow.value = false
	reply.value = ''
	error.value = ''
	slowTimer = setTimeout(() => { slow.value = true }, SLOW_MS)
	try {
		const answers = []
		for (const line of preview.value.lines) {
			const r = await sendCode({ code: line, log: true })
			if (r) answers.push(String(r).trim())
		}
		reply.value = answers.join(' | ') || t('preview_ok')
		emit('sent', reply.value)
	} catch (e) {
		error.value = String((e && e.message) || e)
	} finally {
		clearTimeout(slowTimer)
		slow.value = false
		sending.value = false
	}
}

onBeforeUnmount(() => {
	clearTimeout(armTimer)
	clearTimeout(slowTimer)
})
</script>
