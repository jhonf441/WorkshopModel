<template>
	<svg :width="width" :height="height" :viewBox="'0 0 ' + width + ' ' + height" class="mo-spark" aria-hidden="true">
		<path v-if="d" :d="d" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
		<line v-else x1="0" :y1="height / 2" :x2="width" :y2="height / 2" stroke="currentColor" stroke-width="1" stroke-dasharray="2 3" />
		<circle v-for="(p, i) in points" :key="i" :cx="p.x" :cy="p.y" r="3" class="mo-spark-mark" />
	</svg>
</template>

<script>
'use strict'

// The small line of a watched value: the whole series scaled to the box, newest sample on the right (watch-series.js), with a dot on
// every sudden jump when the marks are asked (watch-render.js jumpMarkers / markerPoints).
import { sparklinePath } from './watch-series.js'
import { markerPoints } from './watch-render.js'

export default {
	props: {
		series: { type: Array, default: () => [] },
		width: { type: Number, default: 120 },
		height: { type: Number, default: 28 },
		marks: { type: Array, default: () => [] }
	},
	computed: {
		d() {
			return sparklinePath(this.series, this.width, this.height)
		},
		points() {
			return markerPoints(this.series, this.marks, this.width, this.height)
		}
	}
}
</script>
