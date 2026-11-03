<template>
	<button type="button" class="mo-uline" :aria-expanded="open ? 'true' : 'false'" @click="$emit('toggle', row.name)">
		<v-icon small>{{ open ? 'mdi-chevron-down' : 'mdi-chevron-right' }}</v-icon>
		<span class="mo-key mo-usage-name">{{ row.name }}</span>
		<span v-if="state" class="wf-state mo-usage-state" :class="state.tone">{{ t(state.key) }}</span>
		<span class="mo-uchips">
			<span v-for="k in kinds" :key="k.kind" class="mo-uchip" :class="['k-' + k.kind, { zero: !k.n }]" :title="t('usage_kind_' + k.kind) + ': ' + k.n">
				<span class="mo-uchip-text">{{ t('usage_kind_' + k.kind) }} <b>{{ k.n }}</b></span>
				<span class="mo-uchip-track"><i class="mo-uchip-bar" :style="{ width: k.width + '%' }"></i></span>
			</span>
		</span>
		<span class="mo-faint mo-usage-phrase">{{ phrase }}</span>
	</button>
</template>

<script>
'use strict'

// One global of the usage finder as one line: its name, a state chip when something is wrong, three small bars (created, written,
// read, drawn against the widest count of the list) and one plain sentence. The line opens the detail (UsageDetail.vue).
import i18n from '../../i18n'
import { barWidth } from './usage-view.js'
import { usagePhrase, usageState } from './usage-phrase.js'

export default {
	props: {
		row: { type: Object, required: true },
		max: { type: Number, default: 0 },
		open: { type: Boolean, default: false }
	},
	computed: {
		state() {
			return usageState(this.row)
		},
		phrase() {
			return usagePhrase(this.t, this.row)
		},
		kinds() {
			return [['define', this.row.definedIn], ['set', this.row.writtenIn], ['read', this.row.readIn]].map(([kind, n]) => ({ kind, n, width: barWidth(n, this.max) }))
		}
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		}
	}
}
</script>
