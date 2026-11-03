<template>
	<div class="mo-density-switch" role="group" :aria-label="t('density_label')">
		<button v-for="c in choices" :key="c.id" type="button" class="mo-density-switch-btn" :class="{ 'mo-density-switch-on': c.id === value }" :aria-pressed="c.id === value ? 'true' : 'false'" :title="t(c.what)" @click="emit('pick', c.id)">
			<v-icon size="small" class="mo-density-switch-icon">{{ c.icon }}</v-icon>{{ t(c.label) }}
		</button>
	</div>
</template>

<script setup>
// The density switch of the Model section: comfortable or compact rows (density.js). It only says what was picked; the section
// keeps the value (saveDensity) and hands it to the views as the `density` prop.
import { computed } from 'vue'
import { i18n } from './dwc-host.js'
import { DENSITY_CHOICES, normalizeDensity } from './density.js'

const props = defineProps({
	current: { type: String, default: '' }
})
const emit = defineEmits(['pick'])

const t = (k, p) => i18n.t('plugins.WorkshopModel.model.' + k, p)

const choices = DENSITY_CHOICES
const value = computed(() => normalizeDensity(props.current))
</script>

<style>
/* DensitySwitch: two segments; the chosen one has the accent border and tint of a selection (DESIGN.md section 2) */
.mo-page .mo-density-switch { display: inline-flex; flex-wrap: wrap; border: 1px solid var(--wf-line); border-radius: 6px; overflow: hidden; }
.mo-page .mo-density-switch-btn { display: inline-flex; align-items: center; gap: 6px; min-height: 32px; padding: 4px 10px; border: 0; background: transparent; color: inherit; font: inherit; font-size: 13px; cursor: pointer; }
.mo-page .mo-density-switch-btn + .mo-density-switch-btn { border-left: 1px solid var(--wf-line); }
.mo-page .mo-density-switch-btn:focus-visible { outline: 2px solid var(--wf-accent); outline-offset: -2px; }
.mo-page .mo-density-switch-on { background: color-mix(in srgb, var(--wf-accent) 16%, transparent); font-weight: 600; }
.mo-page .mo-density-switch-icon { color: var(--wf-icon); }
@media (pointer: coarse) { .mo-page .mo-density-switch-btn { min-height: 44px; } }
</style>
