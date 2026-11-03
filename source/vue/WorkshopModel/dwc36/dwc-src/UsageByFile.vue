<template>
	<div class="mo-usage-byfile">
		<v-select v-model="file" :items="files" dense outlined hide-details class="mo-field mb-2" :label="t('usage_file')" />
		<div v-if="file && !rows.length" class="mo-faint">{{ t('usage_byfile_none') }}</div>
		<table v-else-if="rows.length" class="mo-table">
			<thead><tr><th>{{ t('key') }}</th><th>{{ t('usage_kind_define') }}</th><th>{{ t('usage_kind_set') }}</th><th>{{ t('usage_kind_read') }}</th></tr></thead>
			<tbody>
				<tr v-for="r in rows" :key="r.name">
					<td class="mo-key"><button v-if="live.has(r.name)" type="button" class="mo-link" :title="t('open_in_tree')" @click="$emit('select', 'global.' + r.name)">{{ r.name }}</button><template v-else>{{ r.name }}</template></td>
					<td class="mo-value">{{ r.define.join(', ') }}</td>
					<td class="mo-value">{{ r.set.join(', ') }}</td>
					<td class="mo-value">{{ r.read.join(', ') }}</td>
				</tr>
			</tbody>
		</table>
	</div>
</template>

<script>
'use strict'

// The usage finder by file (usage-view.js fileView): pick one of the files read and see which globals it defines, writes or reads,
// with the line numbers.
import i18n from '../../i18n'
import { filesOf, fileView } from './usage-view.js'

export default {
	props: {
		refs: { type: Array, default: () => [] },
		liveNames: { type: Array, default: () => [] }
	},
	data() {
		return { file: '' }
	},
	computed: {
		files() {
			return filesOf(this.refs)
		},
		live() {
			return new Set(this.liveNames)
		},
		rows() {
			return this.file ? fileView(this.refs, this.file) : []
		}
	},
	watch: {
		files: {
			immediate: true,
			handler(list) {
				if (list.indexOf(this.file) < 0) this.file = list[0] || ''
			}
		}
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		}
	}
}
</script>
