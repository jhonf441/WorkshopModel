<template>
	<details class="mo-ulegend">
		<summary class="mo-ulegend-sum"><v-icon size="small" class="mr-1">mdi-help-circle-outline</v-icon>{{ t('usage_legend_title') }}</summary>
		<div class="mo-ulegend-body">
			<div class="mo-part">{{ t('usage_legend_kinds') }}</div>
			<ul class="mo-ulegend-list">
				<li v-for="k in KINDS" :key="k"><span class="mo-ulegend-dot" :class="'k-' + k" aria-hidden="true"></span>{{ t('usage_legend_' + k) }}</li>
			</ul>
			<div class="mo-part">{{ t('usage_legend_states') }}</div>
			<ul class="mo-ulegend-list">
				<li v-for="s in STATES" :key="s.key"><span class="wf-state mo-ulegend-chip" :class="s.tone">{{ t('usage_state_' + s.key) }}</span>{{ t('usage_legend_' + s.key) }}</li>
			</ul>
			<div class="mo-part">{{ t('usage_legend_tree_title') }}</div>
			<p class="mo-ulegend-p">{{ t('usage_legend_tree') }}</p>
		</div>
	</details>
</template>

<script setup>
// What the colors and the buttons of the usage finder mean, folded under one line: green / yellow / blue are how a file touches a global (it
// creates it, writes it, reads it), the chips are the states of usageState (usage-phrase.js), and only a global that is alive on the board now can
// be opened in the tree. Pure words: it reads nothing.
import { i18n } from './dwc-host.js'

const KINDS = ['define', 'set', 'read']
const STATES = [{ key: 'problem', tone: 'err' }, { key: 'maybe', tone: 'warn' }, { key: 'hint', tone: '' }]
const t = (k, p) => i18n.t('plugins.WorkshopModel.model.' + k, p)
</script>
