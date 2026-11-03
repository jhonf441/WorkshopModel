<template>
	<div class="mo-bands">
		<svg :width="width" :height="height" :viewBox="'0 0 ' + width + ' ' + height" role="img" :aria-label="t('watch_bands_label')">
			<g v-for="b in drawn" :key="b.from">
				<rect :x="b.x" :y="b.y" :width="b.w" :height="b.h" :style="{ fill: b.fill }" />
				<text v-if="b.w > 36 && !onoff" :x="b.x + 4" :y="height / 2 + 4" class="mo-bands-text">{{ b.label }}</text>
			</g>
		</svg>
		<div class="mo-bands-legend">
			<span v-for="l in legend" :key="l.text" class="mo-bands-item"><span class="mo-bands-box" :style="{ background: l.fill }" />{{ l.label }} <span class="mo-faint">{{ l.time }}</span></span>
		</div>
	</div>
</template>

<script setup>
// The timeline of a watched text or word of the model (state.status, a machine mode): one band per value, as wide as the time it
// lasted, coloured by a stable hash of the text into the badge colours of the design family (plugin-colors.js, white text at 3:1 or
// more), with a legend; or, for a boolean, two levels: on (the colour of "on", success) and off (neutral). watch-render.js builds
// the bands; nothing here chooses a colour of its own.
import { computed } from 'vue'
import { i18n } from './dwc-host.js'
import { PLUGIN_COLORS } from './plugin-colors.js'
import { buildBands, onOffBands, legendOf } from './watch-render.js'
import { humanDuration } from './value-human.js'

const PALETTE = Object.values(PLUGIN_COLORS).map(c => c.badge)
const ON = 'var(--wf-ok)'
const OFF = 'rgba(128, 128, 128, 0.35)'

const props = defineProps({
	events: { type: Array, default: () => [] },
	onoff: { type: Boolean, default: false },
	tick: { type: Number, default: 0 },
	width: { type: Number, default: 160 },
	height: { type: Number, default: 22 }
})

const t = (k, p) => i18n.t('plugins.WorkshopModel.model.' + k, p)

const bands = computed(() => {
	void props.tick
	return props.onoff ? onOffBands(props.events, Date.now()) : buildBands(props.events, Date.now(), undefined, PALETTE.length)
})
const word = text => (props.onoff ? t(text === 'true' ? 'watch_on' : 'watch_off') : text)
const fillOf = b => (props.onoff ? (b.level ? ON : OFF) : PALETTE[b.color % PALETTE.length])
const drawn = computed(() => {
	let x = 0
	return bands.value.map(b => {
		const w = b.frac * props.width
		const low = props.onoff && !b.level
		const out = { from: b.from, x, w, y: low ? props.height * 0.65 : 0, h: low ? props.height * 0.35 : props.height, fill: fillOf(b), label: word(b.text) }
		x += w
		return out
	})
})
const legend = computed(() => legendOf(bands.value).map(l => {
	const d = humanDuration(l.total / 1000)
	return { text: l.text, label: word(l.text), fill: props.onoff ? (l.text === 'true' ? ON : OFF) : PALETTE[l.color % PALETTE.length], time: t(d.key, d.params) }
}))
</script>
