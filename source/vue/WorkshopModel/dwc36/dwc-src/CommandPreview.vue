<template>
	<div class="mo-preview">
		<div class="mo-part">{{ t('preview_title') }}</div>
		<v-textarea v-model="text" dense outlined hide-details auto-grow rows="1" spellcheck="false" class="mo-code" :readonly="!editable" :aria-label="t('preview_title')" />
		<div class="mo-faint">{{ preview.count ? t(preview.level === 2 ? 'preview_level2' : 'preview_level1', { n: preview.count }) : t('preview_nothing') }}</div>
		<div v-if="!canSend && disabledReason" class="mo-faint">{{ disabledReason }}</div>
		<div class="mo-actions">
			<span :title="!canSend && disabledTitle ? disabledTitle : null">
				<v-btn small depressed :color="armed ? 'amber darken-3' : 'primary'" :disabled="!canSend || !preview.count || sending" @click="press">
					{{ sending ? t('preview_sending') : (armed ? t('preview_tap_again', { what: preview.lines[0] }) : t('preview_send')) }}
				</v-btn>
			</span>
		</div>
		<div v-if="slow" class="mo-faint" role="status">{{ t('preview_slow') }}</div>
		<div v-if="reply" class="mo-reply" role="status"><span class="mo-faint">{{ t('preview_reply') }}</span> <code>{{ reply }}</code></div>
		<div v-if="error" class="mo-error" role="alert">{{ t('preview_error', { error }) }}</div>
	</div>
</template>

<script>
'use strict'

// The exact G-code before it goes to the board (design item 4): editable, classified by command-preview.js. Level 1 (meta
// commands, reads) is one tap; level 2 (any other G or M code) is the double tap of DESIGN.md: the button turns amber and asks
// "Tap again" for 4 s. Lines are sent one by one; the reply of the board is shown; after 15 s without an answer it says so. While
// it cannot be sent, `disabledReason` is written under the code and `disabledTitle` is the tooltip of the button (one or the other).
import i18n from '../../i18n'
import { sendCode } from './model-host.js'
import { previewOf } from './command-preview.js'
import { ARM_MS, pressArmed } from './armed.js'

const SLOW_MS = 15000

export default {
	props: {
		code: { type: String, default: '' },
		canSend: { type: Boolean, default: true },
		disabledReason: { type: String, default: '' },
		disabledTitle: { type: String, default: '' },
		editable: { type: Boolean, default: true }
	},
	data() {
		return { text: '', armed: false, sending: false, slow: false, reply: '', error: '' }
	},
	computed: {
		preview() {
			return previewOf(this.text)
		}
	},
	watch: {
		code: {
			immediate: true,
			handler(c) {
				this.text = c || ''
				this.reply = ''
				this.error = ''
			}
		}
	},
	beforeDestroy() {
		clearTimeout(this.armTimer)
		clearTimeout(this.slowTimer)
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		},
		press() {
			if (this.preview.level === 1) return this.send()
			const r = pressArmed(this.armedState || null, 'send', Date.now())
			this.armedState = r.state
			this.armed = !r.fire
			clearTimeout(this.armTimer)
			if (r.fire) return this.send()
			this.armTimer = setTimeout(() => {
				this.armedState = null
				this.armed = false
			}, ARM_MS)
		},
		async send() {
			this.sending = true
			this.slow = false
			this.reply = ''
			this.error = ''
			this.slowTimer = setTimeout(() => { this.slow = true }, SLOW_MS)
			try {
				const answers = []
				for (const line of this.preview.lines) {
					const r = await sendCode({ code: line, log: true })
					if (r) answers.push(String(r).trim())
				}
				this.reply = answers.join(' | ') || this.t('preview_ok')
				this.$emit('sent', this.reply)
			} catch (e) {
				this.error = String((e && e.message) || e)
			} finally {
				clearTimeout(this.slowTimer)
				this.slow = false
				this.sending = false
			}
		}
	}
}
</script>
