<template>
	<div class="mo-detail">
		<div v-if="!path" class="mo-faint">{{ t('detail_none') }}</div>
		<template v-else>
			<div class="mo-detail-head">
				<favorite-star :path="path" :pinned="pinned" @pin="emit('pin', $event)" @unpin="emit('unpin', $event)" />
				<code class="mo-path">{{ path }}</code>
				<v-btn size="x-small" variant="outlined" :title="t('copy_path')" @click="copy(path, 'path')">{{ copied === 'path' ? t('copied') : t('copy') }}</v-btn>
				<v-btn size="x-small" variant="outlined" @click="watched ? emit('unwatch', path) : emit('watch', path)">
					<v-icon size="x-small" start>{{ watched ? 'mdi-eye-off-outline' : 'mdi-eye-outline' }}</v-icon>{{ watched ? t('watch_remove') : t('watch_add') }}
				</v-btn>
				<v-btn size="x-small" variant="outlined" :title="t('test_in_tester_help')" @click="emit('test', path)"><v-icon size="x-small" start>mdi-flask-outline</v-icon>{{ t('test_in_tester') }}</v-btn>
			</div>
			<div class="mo-faint mo-detail-kind">{{ t('type') }}: <kind-chip :info="chip" /><template v-if="branch"> ({{ t('children_n', { n: count }) }})</template></div>
			<value-table v-if="table" :table="table" @select="emit('select', $event)" />
			<table v-else-if="branch" class="mo-table">
				<thead><tr><th>{{ t('key') }}</th><th>{{ t('value') }}</th></tr></thead>
				<tbody>
					<tr v-for="c in children" :key="c.key">
						<td class="mo-key"><button type="button" class="mo-link" :title="t('open_in_tree')" @click="emit('select', c.path)">{{ c.key }}</button></td>
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
			<global-editor v-if="globalName" class="mt-3" :name="globalName" :exists="true" :value="value" :can-edit="canEdit" :globals-ok="globalsOk" :persistent="persistent" :show-persist="true" @persist="(n, l) => emit('persist', n, l)" />
			<div class="mo-sub mt-3">
				<div class="mo-part">{{ t('snippets_title') }}</div>
				<div class="mo-faint mb-1">{{ t('snippets_help') }}</div>
				<div v-for="s in snippets" :key="s.id" class="mo-snippet">
					<span class="mo-faint mo-snippet-label">{{ t('snippet_' + s.id) }}</span>
					<code class="mo-snippet-code">{{ s.code }}</code>
					<v-btn size="x-small" variant="text" :title="t('copy')" @click="copy(s.code, s.id)">{{ copied === s.id ? t('copied') : t('copy') }}</v-btn>
				</div>
			</div>
		</template>
	</div>
</template>

<script setup>
// The detail of the selected node (design item 1): its value in words (bytes, durations and colours, value-human.js), an array as a
// small table (value-table.js), the children of an object with their own readable hint, its kind as a chip and the star of the
// favourites, the path to copy, the watch button, Test (the expression tester), the typed editor when the node is a global, and the path helper (design item 9: path-snippets.js).
import { computed, ref } from 'vue'
import { i18n } from './dwc-host.js'
import { liveModel } from './model-host.js'
import GlobalEditor from './GlobalEditor.vue'
import ValueTable from './ValueTable.vue'
import KindChip from './KindChip.vue'
import FavoriteStar from './FavoriteStar.vue'
import { kindInfo } from './value-kind.js'
import { getAtPath, globalNameOf, joinPath } from './model-path.js'
import { childrenOf, childCount } from './model-tree.js'
import { formatValue, isBranch } from './value-format.js'
import { humanize } from './value-human.js'
import { arrayTable } from './value-table.js'
import { pathSnippets } from './path-snippets.js'
import { copyText } from './copy-text.js'

const DETAIL_MAX = 400

const props = defineProps({
	path: { type: String, default: '' },
	tick: { type: Number, default: 0 },
	globalsOk: { type: Boolean, default: true },
	canEdit: { type: Boolean, default: true },
	watched: { type: Boolean, default: false },
	persistent: { type: Boolean, default: false },
	pinned: { type: Array, default: () => [] }
})
const emit = defineEmits(['watch', 'unwatch', 'persist', 'select', 'test', 'pin', 'unpin'])

const t = (k, p) => i18n.t('plugins.WorkshopModel.model.' + k, p)
const copied = ref('')
let copiedTimer = null

const value = computed(() => {
	void props.tick
	return props.path ? getAtPath(liveModel(), props.path) : undefined
})
const chip = computed(() => kindInfo(value.value, props.path))
const branch = computed(() => isBranch(value.value))
const count = computed(() => childCount(value.value))
const text = computed(() => formatValue(value.value))
const human = computed(() => (branch.value ? null : humanize(props.path, value.value)))
const table = computed(() => arrayTable(value.value, props.path))
const children = computed(() => childrenOf(value.value).slice(0, DETAIL_MAX).map(c => {
	const p = joinPath(props.path, c.key, c.index)
	const h = isBranch(c.value) ? null : humanize(p, c.value)
	return { key: c.key, path: p, text: formatValue(c.value), color: h && h.color ? h.color : '', human: h && !h.color ? t(h.key, h.params) : '' }
}))
const globalName = computed(() => globalNameOf(props.path))
const snippets = computed(() => pathSnippets(props.path, value.value))

async function copy(code, id) {
	const ok = await copyText(code)
	copied.value = ok ? id : ''
	clearTimeout(copiedTimer)
	copiedTimer = setTimeout(() => { copied.value = '' }, 1500)
}
</script>
