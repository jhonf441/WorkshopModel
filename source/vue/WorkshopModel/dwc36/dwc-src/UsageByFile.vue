<template>
	<div class="mo-usage-byfile">
		<div v-if="!files.length" class="mo-uempty mo-ufade" role="status">
			<div class="mo-uempty-in">
				<v-icon :size="40">mdi-file-search-outline</v-icon>
				<div class="mo-uempty-title">{{ query ? t('usage_byfile_no_files') : t('usage_byfile_empty') }}</div>
				<div class="mo-faint">{{ t('usage_no_match_hint') }}</div>
			</div>
		</div>
		<div v-else class="mo-ubyfile">
			<div class="mo-ufiles" role="group" :aria-label="t('usage_byfile_files')">
				<button v-for="f in files" :key="f.file" type="button" class="mo-ufile" :aria-pressed="f.file === file ? 'true' : 'false'" @click="picked = f.file">
					<span class="mo-files">{{ f.file }}</span>
					<span class="mo-faint">{{ t('usage_byfile_count', { n: f.globals }) }}</span>
					<span v-if="f.problems" class="wf-state err">{{ t('usage_byfile_problems', { n: f.problems }) }}</span>
				</button>
			</div>
			<div :key="file" class="mo-ufilebody mo-ufade">
				<div class="mo-part">{{ t('usage_byfile_uses', { file, n: uses.length }) }}</div>
				<div v-for="u in uses" :key="u.name" class="mo-ufilerow">
					<button v-if="live.has(u.name)" type="button" class="mo-link mo-key" :title="t('open_in_tree')" @click="$emit('select', 'global.' + u.name)">{{ u.name }}</button>
					<span v-else class="mo-key" :title="t('usage_not_live')">{{ u.name }}</span>
					<span v-if="u.state" class="wf-state" :class="u.state.tone">{{ t(u.state.key) }}</span>
					<usage-lines :path="file" :lines="u.lines" :name="u.name" :open="openOf(u.name)" @open="onOpen(u.name, $event)" />
				</div>
			</div>
		</div>
	</div>
</template>

<script>
'use strict'

// The "By file" tab of the usage finder: the files that were read (narrowed by the search of the section) and, for the one picked,
// every global it uses with its state and the lines, created, written or read (usage-view.js fileView). A file is always picked while
// there is one, so the right side never says "no problems": it says what the file uses. A click on a line opens the file in a small viewer
// (FilePeek.vue) with that line selected; the viewer has its own button to copy "file:line".
import i18n from '../../i18n'
import UsageLines from './UsageLines.vue'
import { REF_KINDS, fileList, filterFiles, fileView } from './usage-view.js'
import { usageState } from './usage-phrase.js'

export default {
	components: { UsageLines },
	props: {
		refs: { type: Array, default: () => [] },
		rows: { type: Array, default: () => [] },
		liveNames: { type: Array, default: () => [] },
		query: { type: String, default: '' }
	},
	data() {
		return { picked: '', peek: null }
	},
	watch: {
		// another file: the viewer of the previous one goes
		file() {
			this.peek = null
		}
	},
	computed: {
		files() {
			return filterFiles(fileList(this.refs, this.rows), this.query)
		},
		file() {
			return this.files.some(f => f.file === this.picked) ? this.picked : (this.files[0] ? this.files[0].file : '')
		},
		live() {
			return new Set(this.liveNames)
		},
		uses() {
			const byName = new Map(this.rows.map(r => [r.name, r]))
			return this.file ? fileView(this.refs, this.file).map(u => ({ name: u.name, state: usageState(byName.get(u.name) || {}), lines: REF_KINDS.flatMap(k => u[k].map(n => ({ kind: k, n }))) })) : []
		}
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		},
		// the viewer of the chips of one global of the file (one open at a time in the whole file)
		openOf(name) {
			return this.peek && this.peek.name === name ? { path: this.file, line: this.peek.line, kind: this.peek.kind } : null
		},
		onOpen(name, open) {
			this.peek = open ? { name, line: open.line, kind: open.kind } : null
		}
	}
}
</script>
