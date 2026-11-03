<template>
	<v-card class="mb-3">
		<v-card-text>
			<div class="mo-part"><v-icon :size="20" class="mr-1">mdi-flask-outline</v-icon>{{ t('tester_title') }}</div>
			<div class="mo-faint mb-2">{{ t('tester_help') }}</div>
			<view-tabs :choices="TESTER_MODES" :current="mode" :label="t('tester_mode')" class="mb-2" @pick="mode = $event" />
			<choice-help :choice="modeChoice" :title="t(modeChoice.label)" class="mb-2" />
			<v-text-field v-model="text" dense outlined hide-details spellcheck="false" class="mo-code-field" :label="t('tester_input')" :placeholder="t('tester_input_hint_' + mode)" @keydown.enter.prevent />
			<div class="mo-snippet mt-1">
				<span class="mo-faint">{{ t('tester_examples') }}</span>
				<v-btn v-for="e in examples" :key="e" x-small text class="mo-code-btn" @click="text = e">{{ e }}</v-btn>
			</div>
			<div v-if="!command.ok && text.trim()" class="mo-error" role="alert">{{ t('tester_err_' + command.error) }}</div>
			<command-preview :code="command.ok ? command.code : ''" :can-send="connected && command.ok" :editable="false" :disabled-reason="connected ? '' : t('tester_offline')" @sent="onSent" />
			<div v-if="result" class="mo-sub mt-2" role="status">
				<div class="mo-part">{{ result.ok ? t('tester_result') : t('tester_result_error') }}</div>
				<pre class="mo-result-text" :class="{ 'mo-result-bad': !result.ok }">{{ result.text }}</pre>
			</div>
			<div class="mo-part mt-3">{{ t('tester_history') }}</div>
			<div v-if="!history.length" class="mo-faint">{{ t('tester_history_none') }}</div>
			<table v-else class="mo-table">
				<tbody>
					<tr v-for="h in history" :key="h.code">
						<td class="mo-key">{{ h.code }}</td>
						<td class="mo-value" :class="{ 'mo-result-bad': !h.ok }">{{ h.text }}</td>
						<td class="mo-row-actions"><v-btn x-small text @click="reuse(h)">{{ t('tester_use') }}</v-btn></td>
					</tr>
				</tbody>
			</table>
		</v-card-text>
	</v-card>
</template>

<script>
'use strict'

// The expression tester (expression-tester.js): an expression or a path, ONE command that only reads (echo or M409), sent through the
// command preview with one tap, the answer of the board shown in place and kept in a short history of this visit. A path chosen with
// Test in the detail panel arrives as `prefill`.
import i18n from '../../i18n'
import { liveModel } from './model-host.js'
import ViewTabs from './ViewTabs.vue'
import ChoiceHelp from './ChoiceHelp.vue'
import CommandPreview from './CommandPreview.vue'
import { TESTER_MODES, testerCommand, parseReply, pushHistory, isModelPath } from './expression-tester.js'
import { choiceOf } from './view-choices.js'
import { getAtPath } from './model-path.js'
import { isBranch } from './value-format.js'

const EXAMPLES = { echo: ['state.status', '#move.axes', 'move.axes[0].userPosition', 'floor(state.upTime / 60)'], m409: ['state', 'move.axes[0]', 'heat.heaters[0]'] }

export default {
	components: { ViewTabs, ChoiceHelp, CommandPreview },
	props: {
		tick: { type: Number, default: 0 },
		connected: { type: Boolean, default: false },
		prefill: { type: String, default: '' }
	},
	data() {
		return { mode: 'echo', text: '', result: null, history: [], TESTER_MODES }
	},
	computed: {
		modeChoice() {
			return choiceOf(TESTER_MODES, this.mode) || TESTER_MODES[0]
		},
		examples() {
			return EXAMPLES[this.mode] || []
		},
		command() {
			const e = this.text.trim()
			const branch = this.mode === 'm409' && isModelPath(e) && isBranch(getAtPath(liveModel(), e))
			return testerCommand(this.mode, this.text, branch)
		}
	},
	watch: {
		prefill: {
			immediate: true,
			handler(p) {
				if (p) this.text = p
			}
		},
		text() {
			this.result = null
		},
		mode() {
			this.result = null
		}
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		},
		onSent(reply) {
			const r = parseReply(this.mode, reply)
			this.result = r
			this.history = pushHistory(this.history, { code: this.command.code, mode: this.mode, input: this.text.trim(), ok: r.ok, text: r.text.split('\n')[0] })
		},
		reuse(h) {
			this.mode = h.mode
			this.text = h.input
		}
	}
}
</script>
