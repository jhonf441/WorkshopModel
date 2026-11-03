<template>
	<section class="mo-pinned" :class="{ 'mo-pinned-none': !pins.length }" :aria-label="t('pins_title')">
		<div class="mo-pinned-head">
			<span class="mo-pinned-title"><v-icon small class="mo-pinned-icon">{{ pins.length ? 'mdi-star' : 'mdi-star-outline' }}</v-icon>{{ t('pins_title') }}</span>
			<span v-if="pins.length" class="mo-pill mo-pill-quiet">{{ t('look_pins_count', { n: pins.length }) }}</span>
			<span v-if="pins.length" class="mo-pinned-hint">{{ t('look_pins_hint') }}</span>
		</div>
		<div v-if="!pins.length" class="mo-pinned-empty">
			<v-icon small class="mo-pinned-icon">mdi-star-outline</v-icon>
			<span>{{ t('pins_empty') }} {{ t('look_pins_empty_more') }}</span>
		</div>
		<div v-else class="mo-pinned-list">
			<span v-for="p in pins" :key="p.path" class="mo-pinned-pin" :class="{ 'mo-pinned-gone': !p.exists }">
				<button type="button" class="mo-pinned-go" :title="p.exists ? t('look_pins_open', { path: p.path }) : t('pins_gone', { path: p.path })" @click="$emit('select', p.path)">
					<kind-chip :info="p.info" icon-only />
					<span class="mo-pinned-text">
						<span class="mo-pinned-label">{{ p.label }}</span>
						<span class="mo-pinned-value">{{ p.exists ? p.text : t('pins_gone_short') }}</span>
					</span>
				</button>
				<button type="button" class="mo-pinned-btn" :title="t('topic_open_row', { path: p.path })" :aria-label="t('topic_open_row', { path: p.path })" @click="$emit('open', p.path)"><v-icon small>mdi-file-tree</v-icon></button>
				<button type="button" class="mo-pinned-btn" :title="t('pin_remove', { path: p.path })" :aria-label="t('pin_remove', { path: p.path })" @click="$emit('unpin', p.path)"><v-icon small>mdi-close</v-icon></button>
			</span>
		</div>
	</section>
</template>

<script>
'use strict'

// The favourites as a clear strip on top of the Model section, whatever the view (2026-11-03): every pinned path (a starred row of
// any view, a starred global of the Globals section: pins.js keeps one list) with its short name and its live value in a readable
// pill; a tap selects it (the detail), the tree icon opens it in the technical tree, the cross unpins it. A path that is no longer
// in the model stays in the list and says so. With `only` (a path prefix) the strip shows those pins alone (the Globals section).
// Empty, it explains the star.
import i18n from '../../i18n'
import { liveModel } from './model-host.js'
import KindChip from './KindChip.vue'
import { getAtPath } from './model-path.js'
import { formatValue, isBranch, clip } from './value-format.js'
import { kindInfo } from './value-kind.js'
import { pinLabel } from './pins.js'

const VALUE_MAX = 32

export default {
	components: { KindChip },
	props: {
		pinned: { type: Array, default: () => [] },
		tick: { type: Number, default: 0 },
		model: { type: Object, default: null },
		only: { type: String, default: '' }
	},
	computed: {
		pins() {
			void this.tick
			const root = this.model || liveModel()
			return this.pinned.filter(path => !this.only || path.indexOf(this.only) === 0).map(path => {
				const value = getAtPath(root, path)
				const exists = value !== undefined
				const info = kindInfo(value, path)
				const text = isBranch(value) ? this.t('children_n', { n: info.size }) : clip(formatValue(value), VALUE_MAX)
				return { path, exists, info, label: pinLabel(path), text }
			})
		}
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		}
	}
}
</script>

<style>
/* PinnedStrip: a soft strip with a head, readable pills (name over the value), 40 px targets, 44 on touch; a gone pin is faint */
.mo-page .mo-pinned { display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; border: 1px solid rgba(128, 128, 128, 0.22); border-radius: 12px; background: rgba(128, 128, 128, 0.05); }
.mo-page .mo-pinned-head { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; }
.mo-page .mo-pinned-title { display: inline-flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 600; }
.mo-page .mo-pinned-icon { color: var(--wf-icon); }
.mo-page .mo-pinned:not(.mo-pinned-none) .mo-pinned-title .mo-pinned-icon { color: var(--tp-amber, #ffb74d); }
.mo-page .mo-pinned-hint { font-size: 12px; opacity: 0.7; }
.mo-page .mo-pinned-empty { display: flex; align-items: flex-start; gap: 8px; font-size: 13px; opacity: 0.85; }
.mo-page .mo-pinned-list { display: flex; flex-wrap: wrap; gap: 8px; }
.mo-page .mo-pinned-pin { display: inline-flex; align-items: center; max-width: 100%; border: 1px solid rgba(128, 128, 128, 0.35); border-radius: 12px; padding-right: 2px; background: var(--wf-surface); transition: border-color 0.15s ease; }
.mo-page .mo-pinned-pin:hover { border-color: rgba(128, 128, 128, 0.6); }
.mo-page .mo-pinned-go { display: inline-flex; align-items: center; gap: 8px; min-height: 40px; max-width: 100%; padding: 4px 6px 4px 10px; border: 0; border-radius: 12px 0 0 12px; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }
.mo-page .mo-pinned-go:hover, .mo-page .mo-pinned-btn:hover { background: rgba(128, 128, 128, 0.12); }
.mo-page .mo-pinned-text { display: flex; flex-direction: column; min-width: 0; line-height: 1.2; }
.mo-page .mo-pinned-label { font-family: var(--tp-font-mono, monospace); font-size: 12px; opacity: 0.8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mo-page .mo-pinned-value { font-family: var(--tp-font-mono, monospace); font-size: 14px; font-weight: 600; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mo-page .mo-pinned-btn { display: inline-flex; align-items: center; justify-content: center; min-width: 36px; min-height: 40px; padding: 0; border: 0; border-radius: 8px; background: transparent; color: var(--wf-icon); cursor: pointer; }
.mo-page .mo-pinned-go:focus-visible, .mo-page .mo-pinned-btn:focus-visible { outline: 2px solid var(--wf-accent); outline-offset: 1px; }
.mo-page .mo-pinned-gone { opacity: 0.6; }
@media (pointer: coarse) { .mo-page .mo-pinned-go { min-height: 44px; } .mo-page .mo-pinned-btn { min-height: 44px; min-width: 44px; } }
@media (prefers-reduced-motion: reduce) { .mo-page .mo-pinned-pin { transition: none; } }
</style>
