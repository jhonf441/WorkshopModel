<template>
	<div class="mo-gassigned">
		<div class="mo-part">{{ t('globals_assigned') }}</div>
		<div v-if="state === 'unknown'" class="mo-gassigned-row">
			<span class="mo-faint">{{ t('globals_assigned_unknown') }}</span>
			<v-btn x-small outlined @click="$emit('scan')"><v-icon :size="14" class="mr-1">mdi-file-search-outline</v-icon>{{ t('globals_assigned_scan') }}</v-btn>
		</div>
		<div v-else-if="state === 'none'" class="mo-faint">{{ t('globals_assigned_none') }}</div>
		<div v-else class="mo-gassigned-row">
			<button v-for="f in setters.files" :key="f.path" type="button" class="mo-gcard-mark mo-gcard-markbtn mo-gcard-setter" :title="openText(f)" :aria-label="openText(f)" @click="$emit('open', f)">{{ f.path }}<template v-if="f.line">:{{ f.line }}</template></button>
		</div>
	</div>
</template>

<script>
'use strict'

// The block "Set in" of the detail of a global (ESTANDAR E6), the same for a global with a value and for one without: not searched yet (with the
// button that searches), no file sets it, or one button per file that creates or sets it, which opens the viewer at that line.
import i18n from '../../i18n'
import { assignedLine } from './usage-lines.js'

export default {
	props: {
		setters: { type: Object, required: true } // usage-lines.js assignedSetters
	},
	computed: {
		state() {
			return assignedLine(this.setters).state
		}
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		},
		openText(f) {
			return this.t('globals_assigned_open', { file: f.path, n: f.line })
		}
	}
}
</script>

<style>
.mo-page .mo-gassigned { grid-column: 1 / -1; }
.mo-page .mo-gassigned-row { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px; }
</style>
