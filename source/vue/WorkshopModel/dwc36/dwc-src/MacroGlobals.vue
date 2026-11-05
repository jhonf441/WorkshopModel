<template>
	<div class="mo-macroglobals">
		<div class="mo-part mt-1">{{ label }}</div>
		<div class="mo-files">
			<span v-for="n in names" :key="n" class="mo-macroglobal">
				<button type="button" class="mo-link mo-key" :aria-expanded="opened === n ? 'true' : 'false'" :title="t('macromap_global_toggle', { name: n, file })" @click="toggle(n)">{{ n }}</button>
			</span>
		</div>
		<div v-if="opened" class="mo-udetail-lines">
			<usage-lines :path="file" :lines="lines" :name="opened" :open="peek" @open="peek = $event" />
		</div>
	</div>
</template>

<script>
'use strict'

// One group of globals of a macro in the macro map (reads, writes or defines): each name is a button that opens the lines of that macro where it
// uses the global, with the shared chips (UsageLines.vue: yellow edge for create/set, blue for read) and the file viewer under them. The lines come
// from the memory of the usage finder, which the parent passes down (`cache`).
import i18n from '../../i18n'
import UsageLines from './UsageLines.vue'
import { linesInFile } from './usage-lines.js'

export default {
	components: { UsageLines },
	props: {
		file: { type: String, required: true },
		label: { type: String, default: '' },
		names: { type: Array, default: () => [] },
		cache: { type: Map, default: null }
	},
	data() {
		return { opened: '', peek: null }
	},
	computed: {
		lines() {
			return this.opened ? linesInFile(this.cache, this.file, this.opened) : []
		}
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		},
		toggle(name) {
			this.opened = this.opened === name ? '' : name
			this.peek = null
		}
	}
}
</script>
