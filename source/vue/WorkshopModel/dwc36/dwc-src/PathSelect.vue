<template>
	<v-combobox
		:id="id" :value="value" :items="items" item-text="path" item-value="path" :return-object="false" :search-input="search" no-filter dense outlined hide-details
		spellcheck="false" autocomplete="off" clearable :aria-label="ariaLabel" :error="error" :menu-props="{ maxHeight: 360, contentClass: 'workshop-theme mo-page mo-path-menu' }"
		class="mo-path-select" @update:search-input="onSearch" @input="onPick" @blur="$emit('blur')">
		<template #item="{ item }">
			<div class="mo-path-item">
				<code class="mo-path-name">{{ item.path }}</code>
				<kind-chip :kind="item.kind" />
				<span class="mo-path-now">{{ item.text }}</span>
				<span v-if="item.about" class="mo-path-about">{{ item.about }}</span>
			</div>
		</template>
		<template #no-data>
			<div class="mo-path-empty">{{ t('alerts_path_none') }}</div>
		</template>
		<template #append-item>
			<div v-if="more" class="mo-path-more" role="status">{{ t('alerts_path_more') }}</div>
		</template>
	</v-combobox>
</template>

<script>
'use strict'

// The path field of the alert form as a select with a search (3.6 line): the watched paths first, then the values of the live model, filtered as
// the person types (alert-path-options.js); a path that is not in the list can still be typed. Each option shows the path, the kind, the value now
// and, when the path dictionary knows it, what it is. Emits `input` with the path as soon as one is picked or typed.
import i18n from '../../i18n'
import { liveModel } from './model-host.js'
import KindChip from './KindChip.vue'
import { pathOptions } from './alert-path-options.js'
import { describePath } from './path-dictionary.js'
import { suggestions } from './alert-path-guide.js'

export default {
	components: { KindChip },
	props: {
		value: { type: String, default: '' },
		id: { type: String, default: '' },
		ariaLabel: { type: String, default: '' },
		error: { type: Boolean, default: false },
		numeric: { type: Boolean, default: false },
		watched: { type: Array, default: () => [] },
		tick: { type: Number, default: 0 }
	},
	data() {
		return { search: '', open: false }
	},
	computed: {
		options() {
			void this.tick
			return pathOptions(liveModel(), this.search, { numeric: this.numeric, watched: this.watched })
		},
		more() {
			return this.options.more
		},
		// the two groups in one list, each with its heading (a header item has no path)
		items() {
			const o = this.options
			const about = r => {
				const d = describePath(r.path)
				return Object.assign({}, r, { about: d ? this.t(d.textKey) : '' })
			}
			const out = []
			const used = new Set(o.watched.map(r => r.path))
			// with nothing typed the person who does not know what to look for gets the values people usually watch, before the whole model
			const common = this.search.trim() ? [] : suggestions(liveModel(), { numeric: this.numeric }).filter(r => !used.has(r.path))
			common.forEach(r => used.add(r.path))
			const rest = o.model.filter(r => !used.has(r.path))
			if (o.watched.length) out.push({ header: this.t('alerts_path_watched') }, ...o.watched.map(about))
			if (common.length) out.push({ header: this.t('alerts_path_common') }, ...common.map(about))
			if (rest.length) out.push({ header: this.t('alerts_path_model') }, ...rest.map(about))
			return out
		}
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		},
		onSearch(v) {
			this.search = v || ''
			if (v !== null && v !== undefined) this.$emit('input', v)
		},
		// a pick gives the path (return-object is off); an object is read as its path all the same, so the field never shows "[object Object]"
		onPick(v) {
			const path = v && typeof v === 'object' ? v.path : v
			this.$emit('input', path === null || path === undefined ? '' : String(path))
		}
	}
}
</script>

<style>
.mo-page .mo-path-select .v-input__slot, .mo-path-menu .v-list-item { min-height: 44px; }
.mo-path-menu .v-subheader { font-weight: 600; }
.mo-path-menu .mo-path-item { display: flex; flex-wrap: wrap; align-items: center; gap: 2px 8px; padding: 4px 0; min-width: 0; }
.mo-path-menu .mo-path-name { background: transparent; font-family: var(--tp-font-mono, monospace); font-size: 13px; font-weight: 600; word-break: break-all; }
.mo-path-menu .mo-path-now { font-family: var(--tp-font-mono, monospace); font-size: 12px; opacity: 0.8; }
.mo-path-menu .mo-path-about { flex: 1 1 100%; font-size: 12px; opacity: 0.7; line-height: 1.3; }
.mo-path-menu .mo-path-empty, .mo-path-menu .mo-path-more { padding: 10px 16px; font-size: 13px; opacity: 0.8; }
</style>
