<template>
	<div class="wf-seg mo-density-switch" role="group" :aria-label="t('density_label')">
		<button v-for="c in choices" :key="c.id" type="button" class="wf-btn mo-density-switch-btn" :class="{ 'mo-density-switch-on': c.id === value }" :aria-pressed="c.id === value ? 'true' : 'false'" :title="t(c.what)" @click="$emit('pick', c.id)">
			<v-icon small class="mo-density-switch-icon">{{ c.icon }}</v-icon>{{ t(c.label) }}
		</button>
	</div>
</template>

<script>
'use strict'

// The density switch of the Model section: comfortable or compact rows (density.js). It only says what was picked; the section
// keeps the value (saveDensity) and hands it to the views as the `density` prop.
import i18n from '../../i18n'
import { DENSITY_CHOICES, normalizeDensity } from './density.js'

export default {
	props: {
		current: { type: String, default: '' }
	},
	data() {
		return { choices: DENSITY_CHOICES }
	},
	computed: {
		value() {
			return normalizeDensity(this.current)
		}
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		}
	}
}
</script>

<style>
/* DensitySwitch: the segments of the family (.wf-seg, 32 px buttons with a 40 px touch area, the chosen one filled; redesign 2026-11-23): only the
   icon colour is the plugin's */
.mo-page .mo-density-switch { flex: none; }
.mo-page .mo-density-switch-btn { padding: 0 10px; font-size: 13px; }
.mo-page .mo-density-switch-icon { color: var(--wf-icon); }
.mo-page .mo-density-switch-on .mo-density-switch-icon { color: inherit; }
</style>
