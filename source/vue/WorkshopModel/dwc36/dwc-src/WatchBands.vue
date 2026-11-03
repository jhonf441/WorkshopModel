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

<script>
'use strict'

// The timeline of a watched text or word of the model (state.status, a machine mode): one band per value, as wide as the time it
// lasted, coloured by a stable hash of the text into the badge colours of the design family (plugin-colors.js, white text at 3:1 or
// more), with a legend; or, for a boolean, two levels: on (the colour of "on", success) and off (neutral). watch-render.js builds
// the bands; nothing here chooses a colour of its own.
import i18n from '../../i18n'
import { PLUGIN_COLORS } from './plugin-colors.js'
import { buildBands, onOffBands, legendOf } from './watch-render.js'
import { humanDuration } from './value-human.js'

const PALETTE = Object.values(PLUGIN_COLORS).map(c => c.badge)
const ON = 'var(--wf-ok)'
const OFF = 'rgba(128, 128, 128, 0.35)'

export default {
	props: {
		events: { type: Array, default: () => [] },
		onoff: { type: Boolean, default: false },
		tick: { type: Number, default: 0 },
		width: { type: Number, default: 160 },
		height: { type: Number, default: 22 }
	},
	computed: {
		bands() {
			void this.tick
			return this.onoff ? onOffBands(this.events, Date.now()) : buildBands(this.events, Date.now(), undefined, PALETTE.length)
		},
		drawn() {
			let x = 0
			return this.bands.map(b => {
				const w = b.frac * this.width
				const low = this.onoff && !b.level
				const out = { from: b.from, x, w, y: low ? this.height * 0.65 : 0, h: low ? this.height * 0.35 : this.height, fill: this.fillOf(b), label: this.word(b.text) }
				x += w
				return out
			})
		},
		legend() {
			return legendOf(this.bands).map(l => {
				const d = humanDuration(l.total / 1000)
				return { text: l.text, label: this.word(l.text), fill: this.onoff ? (l.text === 'true' ? ON : OFF) : PALETTE[l.color % PALETTE.length], time: this.t(d.key, d.params) }
			})
		}
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		},
		word(text) {
			return this.onoff ? this.t(text === 'true' ? 'watch_on' : 'watch_off') : text
		},
		fillOf(b) {
			return this.onoff ? (b.level ? ON : OFF) : PALETTE[b.color % PALETTE.length]
		}
	}
}
</script>
