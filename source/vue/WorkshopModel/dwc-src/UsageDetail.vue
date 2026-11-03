<template>
	<div class="mo-sub mo-udetail mo-ufade" role="region" :aria-label="t('usage_detail_title', { name: row.name })">
		<div class="mo-udetail-head">
			<span class="mo-part">{{ t('usage_detail_title', { name: row.name }) }}</span>
			<span class="mo-udetail-actions">
				<v-btn v-if="row.live" size="small" variant="outlined" @click="emit('select', 'global.' + row.name)"><v-icon size="16" class="mr-1">mdi-file-tree-outline</v-icon>{{ t('open_in_tree') }}</v-btn>
				<v-btn size="small" variant="outlined" @click="copy(row.name)"><v-icon size="16" class="mr-1">mdi-content-copy</v-icon>{{ t('usage_detail_copy_name') }}</v-btn>
			</span>
		</div>
		<div v-if="row.maybe" class="mo-faint mb-1">{{ t('usage_maybe_help') }}</div>
		<div v-else-if="row.hint" class="mo-faint mb-1">{{ t('usage_hint_help') }}</div>
		<div v-if="!groups.length" class="mo-faint">{{ t('usage_detail_no_files') }}</div>
		<div v-for="g in groups" :key="g.file" class="mo-udetail-file">
			<div class="mo-files">{{ g.file }}</div>
			<div class="mo-udetail-lines">
				<button v-for="(x, i) in g.items" :key="i" type="button" class="mo-uline-chip" :class="'k-' + x.kind" :title="t('usage_detail_copy_ref', { ref: g.file + ':' + x.line })" @click="copy(g.file + ':' + x.line)">
					{{ t('usage_kind_' + x.kind) }} {{ t('usage_detail_line', { n: x.line }) }}
				</button>
			</div>
		</div>
		<div v-if="copied" class="mo-faint mt-1" role="status">{{ t('usage_detail_copied', { text: copied }) }}</div>
	</div>
</template>

<script setup>
// The detail of one global: every file that touches it with the lines, grouped by file, in plain words (created, written, read), with
// real actions: open it in the tree, copy its name, copy "file:line" (a click on a line). Says what it copied.
import { computed, ref } from 'vue'
import { i18n } from './dwc-host.js'
import { copyText } from './copy-text.js'
import { refsByFile } from './usage-view.js'

const props = defineProps({
	row: { type: Object, required: true }
})
const emit = defineEmits(['select'])

const t = (k, p) => i18n.t('plugins.WorkshopModel.model.' + k, p)

const copied = ref('')
const groups = computed(() => refsByFile(props.row.refs))

async function copy(text) {
	if (await copyText(text)) copied.value = text
}
</script>
