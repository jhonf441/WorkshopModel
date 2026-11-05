<template>
	<v-card class="mb-3">
		<v-card-text>
			<details class="mo-persist" :open="isOpen" @toggle="onToggle">
				<summary class="mo-persist-head">
					<span class="mo-head-icon"><v-icon>mdi-content-save-outline</v-icon></span>
					<span class="mo-persist-title">{{ t('persist_title') }}</span>
					<span v-if="line" class="mo-pill mo-pill-dot" :class="tone">{{ line }}</span>
					<span v-else class="mo-faint">{{ t('look_persist_none_short') }}</span>
				</summary>
				<div class="mo-faint mb-2 mt-2">{{ t('persist_text') }}</div>
				<div v-if="persist === null" class="mo-skeleton" role="status" aria-live="polite">
					<span class="mo-skeleton-bar"></span><span class="mo-skeleton-bar"></span>
					<span class="mo-skeleton-text">{{ t('persist_reading') }}</span>
				</div>
				<template v-else>
					<div>{{ persist.length ? t('persist_count', { n: persist.length }) : t('persist_none') }} <code>{{ PERSIST_MACRO }}</code></div>
					<ul v-if="persist.length" class="mo-list">
						<li v-for="e in persist" :key="e.name" :class="{ 'mo-persist-stale': attention.stale.indexOf(e.name) >= 0 }"><code>global {{ e.name }} = {{ e.literal }}</code></li>
					</ul>
					<div v-if="attention.stale.length" class="mo-note warn mt-1" role="status"><v-icon small>mdi-alert-outline</v-icon><span class="mo-note-text">{{ t('persist_attention_stale', { n: attention.stale.length }) }}</span></div>
					<div v-if="persist.length" class="mo-note mt-1" :class="configIncludes ? 'ok' : 'warn'" role="status">
						<v-icon small>{{ configIncludes ? 'mdi-check-circle-outline' : 'mdi-alert-outline' }}</v-icon>
						<span class="mo-note-text">
							{{ configIncludes === null ? t('persist_include_unknown') : (configIncludes ? t('persist_include_ok') : t('persist_include_missing')) }}
							<code>{{ INCLUDE_LINE }}</code>
							<v-btn x-small text @click="copyLine">{{ copied ? t('copied') : t('copy') }}</v-btn>
						</span>
					</div>
					<div class="mo-actions mt-2">
						<v-btn small outlined :disabled="!canEdit || !persist.length" :title="canEdit ? null : readOnlyLine(t('read_only'))" @click="$emit('update-persist')">{{ t('persist_update') }}</v-btn>
					</div>
					<div class="mo-faint mt-1">{{ t('persist_update_help') }}</div>
					<div class="mo-faint mt-1">{{ t('cannot_delete_text') }}</div>
				</template>
			</details>
		</v-card-text>
	</v-card>
</template>

<script>
'use strict'
import { readOnlyNote } from './read-only-note.js'

// The persistence macro (persist-macro.js) as a folded panel: one line says how it is, and it opens by itself only when something
// needs the person (a kept global whose saved value is not the live one, or a config.g that does not call the macro:
// persistAttention); once the person opens or closes it, their choice stays.
import i18n from '../../i18n'
import { PERSIST_MACRO, INCLUDE_LINE } from './persist-macro.js'
import { copyText } from './copy-text.js'

export default {
	mixins: [readOnlyNote],
	props: {
		persist: { type: Array, default: null },
		configIncludes: { type: Boolean, default: null },
		attention: { type: Object, default: () => ({ stale: [], missingInclude: false, open: false }) },
		canEdit: { type: Boolean, default: true }
	},
	data() {
		// chosen: null until the person opens or closes the panel
		return { copied: false, chosen: null, PERSIST_MACRO, INCLUDE_LINE }
	},
	computed: {
		isOpen() {
			return this.chosen === null ? this.attention.open : this.chosen
		},
		line() {
			const a = this.attention
			if (a.missingInclude) return this.t('persist_attention_include')
			if (a.stale.length) return this.t('persist_attention_stale', { n: a.stale.length })
			return this.persist && this.persist.length ? this.t('persist_panel_ok', { n: this.persist.length }) : ''
		},
		tone() {
			return this.attention.missingInclude || this.attention.stale.length ? 'warn' : 'ok'
		}
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		},
		onToggle(e) {
			const open = !!(e && e.target && e.target.open)
			if (open !== this.isOpen) this.chosen = open
		},
		async copyLine() {
			this.copied = await copyText(INCLUDE_LINE)
			setTimeout(() => { this.copied = false }, 1500)
		}
	}
}
</script>

<style>
/* PersistPanel: the summary line is the head of the card (icon box, title, state pill); the pill wraps under the title on a phone */
.mo-page .mo-persist-head { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; min-height: 40px; cursor: pointer; list-style: none; }
.mo-page .mo-persist-head::-webkit-details-marker { display: none; }
.mo-page .mo-persist-head::before { content: ''; flex: none; width: 0; height: 0; border: 5px solid transparent; border-left: 7px solid var(--wf-icon); margin-left: 4px; transition: transform 0.15s ease; }
.mo-page .mo-persist[open] > .mo-persist-head::before { transform: rotate(90deg); }
.mo-page .mo-persist-title { font-size: 16px; font-weight: 600; }
.mo-page .mo-persist-head .mo-pill { max-width: 100%; white-space: normal; }
@media (prefers-reduced-motion: reduce) { .mo-page .mo-persist-head::before { transition: none; } }
</style>
