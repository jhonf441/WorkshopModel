<template>
	<div class="mo-sub mo-udetail mo-ufade" role="region" :aria-label="t('usage_detail_title', { name: row.name })">
		<div class="mo-udetail-head">
			<span class="mo-part">{{ t('usage_detail_title', { name: row.name }) }}</span>
			<span class="mo-udetail-actions">
				<v-btn v-if="row.live" small outlined @click="$emit('select', 'global.' + row.name)"><v-icon :size="16" class="mr-1">mdi-file-tree-outline</v-icon>{{ t('open_in_tree') }}</v-btn>
				<v-btn small outlined @click="copy(row.name)"><v-icon :size="16" class="mr-1">mdi-content-copy</v-icon>{{ t('usage_detail_copy_name') }}</v-btn>
			</span>
		</div>
		<div v-if="!row.live" class="mo-faint mb-1">{{ t('usage_not_live') }}</div>
		<div v-if="row.maybe" class="mo-faint mb-1">{{ t('usage_maybe_help') }}</div>
		<div v-else-if="row.hint" class="mo-faint mb-1">{{ t('usage_hint_help') }}</div>
		<div v-if="!groups.length" class="mo-faint">{{ t('usage_detail_no_files') }}</div>
		<div v-for="g in groups" :key="g.file" class="mo-udetail-file">
			<div class="mo-files">{{ g.file }}</div>
			<usage-lines :path="g.file" :lines="linesOf(g.items)" :name="row.name" :open="peek" @open="peek = $event" />
		</div>
		<div v-if="copied" class="mo-faint mt-1" role="status">{{ t('usage_detail_copied', { text: copied }) }}</div>
	</div>
</template>

<script>
'use strict'

// The detail of one global: every file that touches it with the lines, grouped by file, in plain words (created, written, read), with
// real actions: open it in the tree, copy its name, and a click on a line opens the file in a small viewer (FilePeek.vue) with that line selected
// (it has its own button to copy "file:line"). Says what it copied.
import i18n from '../../i18n'
import { copyText } from './copy-text.js'
import { refsByFile } from './usage-view.js'
import UsageLines from './UsageLines.vue'
import { linesOfItems } from './usage-lines.js'

export default {
	components: { UsageLines },
	props: {
		row: { type: Object, required: true }
	},
	data() {
		return { copied: '', peek: null }
	},
	computed: {
		groups() {
			return refsByFile(this.row.refs)
		}
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		},
		async copy(text) {
			if (await copyText(text)) this.copied = text
		},
		linesOf(items) {
			return linesOfItems(items)
		}
	}
}
</script>
