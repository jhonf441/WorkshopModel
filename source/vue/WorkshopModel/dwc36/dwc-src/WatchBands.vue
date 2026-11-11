<template>
	<div class="mo-bands">
		<svg :width="width" :height="height" :viewBox="'0 0 ' + width + ' ' + height" role="img" :aria-label="t('watch_bands_label')">
			<g v-for="b in drawn" :key="b.from">
				<rect :x="b.x" y="0" :width="b.w" :height="height" :style="{ fill: b.fill }" />
				<text v-if="b.w > 36 && !onoff" :x="b.x + 4" :y="height / 2 + 4" class="mo-bands-text">{{ b.label }}</text>
			</g>
		</svg>
		<div class="mo-bands-legend">
			<span v-for="l in legendShown" :key="l.text" class="mo-bands-item" :title="l.label"><span class="mo-bands-box" :style="{ background: l.fill }" /><span class="mo-bands-word">{{ l.label }}</span><span class="mo-faint mo-bands-time">{{ l.time }}</span></span>
			<button v-if="legend.length > LEGEND_ROWS" type="button" class="mo-link mo-bands-more" :aria-expanded="showAll ? 'true' : 'false'" @click="showAll = !showAll">{{ showAll ? t('watch_legend_less') : t('watch_legend_more', { n: legend.length - LEGEND_ROWS }) }}</button>
		</div>
	</div>
</template>

<script>
'use strict'

// The timeline of a watched text or word of the model (state.status, a machine mode): one band per value, as wide as the time it
// lasted, coloured by a stable hash of the text into the badge colours of the design family (plugin-colors.js, white text at 3:1 or
// more), with a legend; or, for a boolean, a band per state in the two colours of on and off (look-tokens.js: on is the success green,
// off the neutral gray). Every band is as tall as the box, and the box is the one of every graph of the watch list (WATCH_GRAPH), so the
// rows line up. watch-render.js builds the bands; nothing here chooses a colour of its own.
import i18n from '../../i18n'
import { PLUGIN_COLORS } from './plugin-colors.js'
import { buildBands, onOffBands, legendOf } from './watch-render.js'
import { humanDuration } from './value-human.js'
import { boolColor, WATCH_GRAPH } from './look-tokens.js'

const PALETTE = Object.values(PLUGIN_COLORS).map(c => c.badge)

const LEGEND_ROWS = 5

export default {
	props: {
		events: { type: Array, default: () => [] },
		onoff: { type: Boolean, default: false },
		tick: { type: Number, default: 0 },
		width: { type: Number, default: WATCH_GRAPH.width },
		height: { type: Number, default: WATCH_GRAPH.height }
	},
	data() {
		return { showAll: false, LEGEND_ROWS }
	},
	computed: {
		legendShown() {
			return this.showAll ? this.legend : this.legend.slice(0, LEGEND_ROWS)
		},
		bands() {
			void this.tick
			return this.onoff ? onOffBands(this.events, Date.now()) : buildBands(this.events, Date.now(), undefined, PALETTE.length)
		},
		drawn() {
			let x = 0
			return this.bands.map(b => {
				const w = b.frac * this.width
				const out = { from: b.from, x, w, fill: this.fillOf(b), label: this.word(b.text) }
				x += w
				return out
			})
		},
		legend() {
			return legendOf(this.bands).map(l => {
				const d = humanDuration(l.total / 1000)
				return { text: l.text, label: this.word(l.text), fill: this.onoff ? boolColor(l.text === 'true') : PALETTE[l.color % PALETTE.length], time: this.t(d.key, d.params) }
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
			return this.onoff ? boolColor(!!b.level) : PALETTE[b.color % PALETTE.length]
		}
	}
}
</script>
