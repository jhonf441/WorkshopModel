<template>
	<div class="mo-pinned">
		<span class="mo-pinned-title"><v-icon size="small" class="mo-pinned-icon">mdi-star-outline</v-icon>{{ t('pins_title') }}</span>
		<span v-if="!pins.length" class="mo-pinned-empty">{{ t('pins_empty') }}</span>
		<span v-for="p in pins" :key="p.path" class="mo-pinned-pin" :class="{ 'mo-pinned-gone': !p.exists }">
			<button type="button" class="mo-pinned-go" :title="p.exists ? p.path : t('pins_gone', { path: p.path })" @click="emit('select', p.path)">
				<kind-chip :info="p.info" icon-only />
				<span class="mo-pinned-label">{{ p.label }}</span>
				<span class="mo-pinned-value">{{ p.exists ? p.text : t('pins_gone_short') }}</span>
			</button>
			<button type="button" class="mo-pinned-btn" :title="t('topic_open_row', { path: p.path })" :aria-label="t('topic_open_row', { path: p.path })" @click="emit('open', p.path)"><v-icon size="x-small">mdi-file-tree</v-icon></button>
			<button type="button" class="mo-pinned-btn" :title="t('pin_remove', { path: p.path })" :aria-label="t('pin_remove', { path: p.path })" @click="emit('unpin', p.path)"><v-icon size="x-small">mdi-close</v-icon></button>
		</span>
	</div>
</template>

<script setup>
// The favourites as a strip in the section toolbar: every pinned path with its short name and its live value; a tap selects it,
// the tree icon opens it in the technical tree, the cross unpins it (pins.js keeps the list). A path that is no longer in the
// model stays in the list and says so.
import { computed } from 'vue'
import { i18n } from './dwc-host.js'
import { liveModel } from './model-host.js'
import KindChip from './KindChip.vue'
import { getAtPath } from './model-path.js'
import { formatValue, isBranch, clip } from './value-format.js'
import { kindInfo } from './value-kind.js'
import { pinLabel } from './pins.js'

const VALUE_MAX = 32

const props = defineProps({
	pinned: { type: Array, default: () => [] },
	tick: { type: Number, default: 0 },
	model: { type: Object, default: null }
})
const emit = defineEmits(['select', 'open', 'unpin'])

const t = (k, p) => i18n.t('plugins.WorkshopModel.model.' + k, p)

const pins = computed(() => {
	void props.tick
	const root = props.model || liveModel()
	return props.pinned.map(path => {
		const value = getAtPath(root, path)
		const exists = value !== undefined
		const info = kindInfo(value, path)
		const text = isBranch(value) ? t('children_n', { n: info.size }) : clip(formatValue(value), VALUE_MAX)
		return { path, exists, info, label: pinLabel(path), text }
	})
})
</script>

<style>
/* PinnedStrip: outlined pills in a wrapping row; a pin whose path is gone is faint */
.mo-page .mo-pinned { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.mo-page .mo-pinned-title { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 600; }
.mo-page .mo-pinned-icon { color: var(--wf-icon); }
.mo-page .mo-pinned-empty { color: var(--tp-faint); font-size: 12px; }
.mo-page .mo-pinned-pin { display: inline-flex; align-items: center; border: 1px solid var(--wf-line); border-radius: 999px; padding-right: 2px; }
.mo-page .mo-pinned-go { display: inline-flex; align-items: center; gap: 4px; min-height: 32px; padding: 2px 6px 2px 8px; border: 0; border-radius: 999px; background: transparent; color: inherit; font: inherit; font-size: 12px; cursor: pointer; }
.mo-page .mo-pinned-go:hover, .mo-page .mo-pinned-btn:hover { background: rgba(128, 128, 128, 0.12); }
.mo-page .mo-pinned-label { font-family: var(--tp-font-mono, monospace); }
.mo-page .mo-pinned-value { font-family: var(--tp-font-mono, monospace); color: var(--tp-faint); max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mo-page .mo-pinned-btn { display: inline-flex; align-items: center; justify-content: center; min-width: 32px; min-height: 32px; padding: 0; border: 0; border-radius: 50%; background: transparent; color: var(--wf-icon); cursor: pointer; }
.mo-page .mo-pinned-go:focus-visible, .mo-page .mo-pinned-btn:focus-visible { outline: 2px solid var(--wf-accent); outline-offset: 1px; }
.mo-page .mo-pinned-gone { opacity: 0.6; }
@media (pointer: coarse) { .mo-page .mo-pinned-go, .mo-page .mo-pinned-btn { min-height: 44px; min-width: 44px; } }
</style>
