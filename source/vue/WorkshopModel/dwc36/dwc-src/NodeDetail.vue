<template>
	<div class="mo-detail">
		<div v-if="!path" class="mo-faint">{{ t('detail_none') }}</div>
		<template v-else>
			<div class="mo-detail-head">
				<favorite-star :path="path" :pinned="pinned" @pin="onPin" @unpin="onUnpin" />
				<code class="mo-path">{{ path }}</code>
				<v-btn x-small outlined :title="t('copy_path')" @click="copy(path, 'path')">{{ copied === 'path' ? t('copied') : t('copy') }}</v-btn>
				<v-btn x-small outlined @click="watched ? $emit('unwatch', path) : $emit('watch', path)">
					<v-icon x-small left>{{ watched ? 'mdi-eye-off-outline' : 'mdi-eye-outline' }}</v-icon>{{ watched ? t('watch_remove') : t('watch_add') }}
				</v-btn>
				<v-btn x-small outlined :title="t('test_in_tester_help')" @click="$emit('test', path)"><v-icon x-small left>mdi-flask-outline</v-icon>{{ t('test_in_tester') }}</v-btn>
			</div>
			<div class="mo-faint mo-detail-kind">{{ t('type') }}: <kind-chip :info="chip" /><template v-if="branch"> ({{ t('children_n', { n: count }) }})</template></div>
			<value-table v-if="table" :table="table" @select="onSelect" />
			<table v-else-if="branch" class="mo-table">
				<thead><tr><th>{{ t('key') }}</th><th>{{ t('value') }}</th></tr></thead>
				<tbody>
					<tr v-for="c in children" :key="c.key">
						<td class="mo-key"><button type="button" class="mo-link" :title="t('open_in_tree')" @click="onSelect(c.path)">{{ c.key }}</button></td>
						<td class="mo-value"><span v-if="c.color" class="mo-swatch" :style="{ background: c.color }" />{{ c.text }}<span v-if="c.human" class="mo-faint"> ({{ c.human }})</span></td>
					</tr>
				</tbody>
			</table>
			<template v-else>
				<div class="mo-value-big"><span v-if="human && human.color" class="mo-swatch mo-swatch-big" :style="{ background: human.color }" />{{ text }}</div>
				<div v-if="human && !human.color" class="mo-human">{{ t('detail_human') }}: {{ t(human.key, human.params) }}</div>
				<div v-if="human && human.color" class="mo-human">{{ t('detail_color') }}: {{ human.color }}</div>
			</template>
			<div v-if="!table && children.length < count" class="mo-faint">{{ t('detail_more', { n: count - children.length }) }}</div>
			<global-editor v-if="globalName" class="mt-3" :name="globalName" :exists="true" :value="value" :can-edit="canEdit" :globals-ok="globalsOk" :persistent="persistent" :show-persist="true" @persist="onPersist" />
			<path-meaning :path="path" :firmware="firmware" />
			<div class="mo-sub mt-3">
				<div class="mo-part">{{ t('snippets_title') }}</div>
				<div class="mo-faint mb-1">{{ t('snippets_help') }}</div>
				<div v-for="s in snippets" :key="s.id" class="mo-snippet">
					<span class="mo-faint mo-snippet-label">{{ t('snippet_' + s.id) }}</span>
					<code class="mo-snippet-code">{{ s.code }}</code>
					<v-btn x-small text :title="t('copy')" @click="copy(s.code, s.id)">{{ copied === s.id ? t('copied') : t('copy') }}</v-btn>
				</div>
			</div>
		</template>
	</div>
</template>

<script>
'use strict'

// The detail of the selected node (design item 1): its value in words (bytes, durations and colours, value-human.js), an array as a
// small table (value-table.js), the children of an object with their own readable hint, its kind as a chip and the star of the
// favourites, the path to copy, the watch button, Test (the expression tester), the typed editor when the node is a global, and the path helper (design item 9: path-snippets.js).
import i18n from '../../i18n'
import { liveModel } from './model-host.js'
import GlobalEditor from './GlobalEditor.vue'
import ValueTable from './ValueTable.vue'
import KindChip from './KindChip.vue'
import FavoriteStar from './FavoriteStar.vue'
import PathMeaning from './PathMeaning.vue'
import { firmwareVersionOf } from './rrf-version.js'
import { kindInfo } from './value-kind.js'
import { getAtPath, globalNameOf, joinPath } from './model-path.js'
import { childrenOf, childCount } from './model-tree.js'
import { formatValue, isBranch } from './value-format.js'
import { humanize } from './value-human.js'
import { arrayTable } from './value-table.js'
import { pathSnippets } from './path-snippets.js'
import { copyText } from './copy-text.js'

const DETAIL_MAX = 400

export default {
	components: { GlobalEditor, ValueTable, KindChip, FavoriteStar, PathMeaning },
	props: {
		path: { type: String, default: '' },
		tick: { type: Number, default: 0 },
		globalsOk: { type: Boolean, default: true },
		canEdit: { type: Boolean, default: true },
		watched: { type: Boolean, default: false },
		persistent: { type: Boolean, default: false },
		pinned: { type: Array, default: () => [] }
	},
	data() {
		return { copied: '' }
	},
	computed: {
		value() {
			void this.tick
			return this.path ? getAtPath(liveModel(), this.path) : undefined
		},
		chip() {
			return kindInfo(this.value, this.path)
		},
		branch() {
			return isBranch(this.value)
		},
		count() {
			return childCount(this.value)
		},
		text() {
			return formatValue(this.value)
		},
		human() {
			return this.branch ? null : humanize(this.path, this.value)
		},
		table() {
			return arrayTable(this.value, this.path)
		},
		children() {
			return childrenOf(this.value).slice(0, DETAIL_MAX).map(c => {
				const p = joinPath(this.path, c.key, c.index)
				const h = isBranch(c.value) ? null : humanize(p, c.value)
				return { key: c.key, path: p, text: formatValue(c.value), color: h && h.color ? h.color : '', human: h && !h.color ? this.t(h.key, h.params) : '' }
			})
		},
		firmware() {
			void this.tick
			return firmwareVersionOf(liveModel()) || ''
		},
		globalName() {
			return globalNameOf(this.path)
		},
		snippets() {
			return pathSnippets(this.path, this.value)
		}
	},
	beforeDestroy() {
		clearTimeout(this.copiedTimer)
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		},
		onPersist(name, literal) {
			this.$emit('persist', name, literal)
		},
		onPin(path) {
			this.$emit('pin', path)
		},
		onUnpin(path) {
			this.$emit('unpin', path)
		},
		onSelect(path) {
			this.$emit('select', path)
		},
		async copy(code, id) {
			const ok = await copyText(code)
			this.copied = ok ? id : ''
			clearTimeout(this.copiedTimer)
			this.copiedTimer = setTimeout(() => { this.copied = '' }, 1500)
		}
	}
}
</script>
