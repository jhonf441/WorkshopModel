<template>
	<span class="mo-ulines">
		<span class="mo-udetail-lines">
			<button v-for="c in lines" :key="c.kind + c.n" type="button" class="mo-uline-chip" :class="['k-' + c.kind, { on: isOpen(c) }]" :aria-pressed="isOpen(c) ? 'true' : 'false'" :title="t('peek_open', { ref: path + ':' + c.n })" @click="toggle(c)">{{ t('usage_kind_' + c.kind) }} {{ t('usage_detail_line', { n: c.n }) }}</button>
		</span>
		<file-peek v-if="open && open.path === path" class="mo-ulines-peek" :path="open.path" :line="open.line" :name="name" :kind="open.kind" @close="$emit('open', null)" />
	</span>
</template>

<script>
'use strict'

// The ONE piece of chips of usage (ESTANDAR E3): one button per line where a global is created, written or read in a file, and under them the file
// viewer (FilePeek.vue) when one of them is open. GlobalRow (list and dialog), UsageDetail and UsageByFile use it, so a chip looks and behaves the same
// everywhere. It owns nothing: the page keeps `open` ({ path, line, kind } or null) and gets `open` back (null when the same chip is tapped again).
import i18n from '../../i18n'
import FilePeek from './FilePeek.vue'

export default {
	components: { FilePeek },
	props: {
		path: { type: String, required: true },
		lines: { type: Array, default: () => [] }, // [{ kind: 'define' | 'set' | 'read', n }]
		name: { type: String, default: '' },
		open: { type: Object, default: null }
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		},
		isOpen(c) {
			return !!this.open && this.open.path === this.path && this.open.line === c.n
		},
		toggle(c) {
			this.$emit('open', this.isOpen(c) ? null : { path: this.path, line: c.n, kind: c.kind })
		}
	}
}
</script>

<style>
.mo-page .mo-ulines { display: contents; }
.mo-page .mo-ulines-peek { flex: 1 1 100%; }
</style>
