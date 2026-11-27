<template>
	<div class="mo-apf">
		<v-text-field v-model="query" dense outlined hide-details spellcheck="false" clearable autofocus class="mo-apf-search" :label="t('apf_search')" :aria-label="t('apf_search')" />
		<p class="mo-apf-lead">{{ t('apf_lead') }}</p>
		<div v-if="numeric" class="mo-apf-note" role="status">
			{{ t('apf_only_numbers') }}
			<v-btn small text class="mo-apf-btn" @click="all = !all">{{ all ? t('apf_only_again') : t('apf_show_all') }}</v-btn>
		</div>
		<template v-if="query && query.trim()">
			<div class="mo-part">{{ t('apf_results') }}</div>
			<div v-if="!found.rows.length" class="mo-faint">{{ t('alerts_path_none') }}</div>
			<ul v-else class="mo-apf-list">
				<li v-for="r in found.rows" :key="r.path"><button type="button" class="mo-apf-row" @click="$emit('insert', r.path)"><alert-path-row :row="r" :about="about(r.path)" /></button></li>
			</ul>
			<div v-if="found.more" class="mo-faint" role="status">{{ t('alerts_path_more') }}</div>
		</template>
		<template v-else>
			<template v-if="!base && suggested.length">
				<div class="mo-part">{{ t('apf_suggested') }}</div>
				<ul class="mo-apf-list">
					<li v-for="r in suggested" :key="r.path"><button type="button" class="mo-apf-row" @click="$emit('insert', r.path)"><alert-path-row :row="r" :about="about(r.path)" /></button></li>
				</ul>
			</template>
			<div class="mo-part">{{ t('apf_explore') }}</div>
			<nav class="mo-apf-crumbs" :aria-label="t('apf_explore')">
				<button type="button" class="mo-apf-crumb" :disabled="!base" @click="base = ''">{{ t('apf_top') }}</button>
				<template v-for="c in crumbs"><span :key="'s' + c.path" aria-hidden="true">/</span><button :key="c.path" type="button" class="mo-apf-crumb" :disabled="c.path === base" @click="base = c.path">{{ c.label }}</button></template>
			</nav>
			<div v-if="!level.length" class="mo-faint">{{ t('apf_empty_level') }}</div>
			<ul v-else class="mo-apf-list">
				<li v-for="r in level" :key="r.path">
					<button type="button" class="mo-apf-row" :aria-label="(r.branch ? t('apf_open') : t('apf_use')) + ': ' + r.path" @click="r.branch ? (base = r.path) : $emit('insert', r.path)">
						<alert-path-row :row="r" :about="about(r.path)" />
						<span class="mo-apf-act"><template v-if="r.branch">{{ t('apf_open') }}<v-icon small>mdi-chevron-right</v-icon></template><template v-else>{{ t('apf_use') }}</template></span>
					</button>
				</li>
			</ul>
		</template>
	</div>
</template>

<script>
'use strict'

// The finder of the alert form for someone who does not know what to look for (3.6 line): a search over the whole model, a short list of what
// people usually watch that this board has, and a walk down the model one level at a time (a branch opens, a value is used), every row with
// its kind, its value now and what it is when the path dictionary knows it. Emits `insert` with the path of a value.
import i18n from '../../i18n'
import { liveModel } from './model-host.js'
import RowBody from './AlertPathRow.vue'
import { suggestions, levelRows, searchRows } from './alert-path-guide.js'
import { describePath } from './path-dictionary.js'
import { ancestorsOf } from './model-tree.js'

export default {
	components: { AlertPathRow: RowBody },
	props: {
		tick: { type: Number, default: 0 },
		numeric: { type: Boolean, default: false }
	},
	data() {
		return { query: '', base: '', all: false }
	},
	computed: {
		suggested() {
			void this.tick
			return suggestions(liveModel(), { numeric: this.numeric })
		},
		level() {
			void this.tick
			return levelRows(liveModel(), this.base, { numeric: this.numeric, all: this.all })
		},
		found() {
			void this.tick
			return searchRows(liveModel(), this.query, { numeric: this.numeric && !this.all })
		},
		crumbs() {
			const parents = ancestorsOf(this.base).filter(p => p)
			return parents.concat(this.base ? [this.base] : []).map(p => ({ path: p, label: p.match(/[^.]+$/)[0] }))
		}
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		},
		about(path) {
			const d = describePath(path)
			return d ? this.t(d.textKey) : ''
		}
	}
}
</script>

<style>
/* the search stays at the top of the scrolling dialog with 8 px of air above it: at scroll 0 the focus ring and the floating label were cut by the
   edge of the scroll area (owner, 2026-11-23, note 2; criteria C3) */
.mo-page .mo-apf-search { position: sticky; top: 0; z-index: 2; padding-top: 8px; padding-bottom: 8px; background: var(--wf-surface, #fff); }
.mo-page .mo-apf-lead, .mo-page .mo-apf-note { font-size: 13px; opacity: 0.85; margin: 8px 0 0; }
.mo-page .mo-apf-list { list-style: none; margin: 4px 0 0; padding: 0; }
.mo-page .mo-apf-row { display: flex; align-items: center; gap: 8px; width: 100%; min-height: 40px; padding: 6px 8px; border: 0; border-bottom: 1px solid var(--mo-line); background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }
.mo-page .mo-apf-row:hover { background: var(--mo-soft2); }
.mo-page .mo-apf-row:focus-visible { outline: 2px solid var(--wf-accent); outline-offset: -2px; }
.mo-page .mo-apf-body { display: flex; flex: 1 1 auto; flex-wrap: wrap; align-items: center; gap: 2px 8px; min-width: 0; }
.mo-page .mo-apf-name { background: transparent; font-family: var(--tp-font-mono, monospace); font-size: 13px; font-weight: 600; word-break: break-all; }
.mo-page .mo-apf-now { font-family: var(--tp-font-mono, monospace); font-size: 12px; opacity: 0.8; }
.mo-page .mo-apf-about { flex: 1 1 100%; font-size: 12px; opacity: 0.7; line-height: 1.3; }
.mo-page .mo-apf-act { display: inline-flex; align-items: center; flex: none; font-size: 13px; font-weight: 600; }
.mo-page .mo-apf-crumbs { display: flex; flex-wrap: wrap; align-items: center; gap: 2px 4px; margin-top: 4px; }
.mo-page .mo-apf-crumb { position: relative; min-height: var(--wf-size-s); padding: 0 8px; border: 0; border-radius: 6px; background: transparent; color: inherit; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
.mo-page .mo-apf-crumb:disabled { cursor: default; opacity: 0.7; font-weight: 400; }
.mo-page .mo-apf-btn { min-height: var(--wf-size-s); }
</style>
