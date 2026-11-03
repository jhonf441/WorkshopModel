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
					<span v-else class="mo-key">{{ u.name }}</span>
					<span v-if="u.state" class="wf-state" :class="u.state.tone">{{ t(u.state.key) }}</span>
					<span class="mo-udetail-lines">
						<button v-for="c in u.lines" :key="c.kind + c.n" type="button" class="mo-uline-chip" :class="'k-' + c.kind" :title="t('usage_detail_copy_ref', { ref: file + ':' + c.n })" @click="copy(file + ':' + c.n)">{{ t('usage_kind_' + c.kind) }} {{ t('usage_detail_line', { n: c.n }) }}</button>
					</span>
				</div>
				<div v-if="copied" class="mo-faint mt-1" role="status">{{ t('usage_detail_copied', { text: copied }) }}</div>
			</div>
		</div>
	</div>
</template>

<script>
'use strict'

// The "By file" tab of the usage finder: the files that were read (narrowed by the search of the section) and, for the one picked,
// every global it uses with its state and the lines, created, written or read (usage-view.js fileView). A file is always picked while
// there is one, so the right side never says "no problems": it says what the file uses. A click on a line copies "file:line".
import i18n from '../../i18n'
import { copyText } from './copy-text.js'
import { REF_KINDS, fileList, filterFiles, fileView } from './usage-view.js'
import { usageState } from './usage-phrase.js'

export default {
	props: {
		refs: { type: Array, default: () => [] },
		rows: { type: Array, default: () => [] },
		liveNames: { type: Array, default: () => [] },
		query: { type: String, default: '' }
	},
	data() {
		return { picked: '', copied: '' }
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
		async copy(text) {
			if (await copyText(text)) this.copied = text
		}
	}
}
</script>
