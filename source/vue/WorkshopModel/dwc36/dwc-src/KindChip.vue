<template>
	<span class="mo-kind-chip" :class="{ 'mo-kind-chip-bare': iconOnly }" :title="title" :aria-label="iconOnly ? title : null">
		<v-icon x-small class="mo-kind-chip-icon">{{ chip.icon }}</v-icon>
		<span v-if="chip.swatch" class="mo-kind-chip-swatch" :style="{ background: chip.swatch }" aria-hidden="true"></span>
		<span v-if="chip.on !== null" class="wf-dot" :class="{ ok: chip.on }" aria-hidden="true"></span>
		<span v-if="!iconOnly" class="mo-kind-chip-word">{{ t(chip.word) }}</span>
	</span>
</template>

<script>
'use strict'

// The kind of a value as a neutral outlined chip with a gray icon (value-kind.js): number, text, boolean, array, object, null or
// colour. A boolean adds the dot of its state (green when on), a colour adds a swatch of itself. Either `kind` (a kind of
// value-format.js kindOf or of value-kind.js KINDS) or `info` (value-kind.js kindInfo / leafInfo, which knows the value) is given.
import i18n from '../../i18n'
import { infoOfKind } from './value-kind.js'

export default {
	props: {
		kind: { type: String, default: '' },
		info: { type: Object, default: null },
		iconOnly: { type: Boolean, default: false }
	},
	computed: {
		chip() {
			return this.info || infoOfKind(this.kind)
		},
		title() {
			const c = this.chip
			if (c.detail) return this.t(c.detail)
			return c.kind === 'array' || c.kind === 'object' ? this.t('kind_with_size', { kind: this.t(c.word), n: c.size }) : this.t(c.word)
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
/* KindChip: a neutral outline and a gray icon (DESIGN.md section 3); the dot is the family's .wf-dot */
.mo-page .mo-kind-chip { display: inline-flex; align-items: center; gap: 4px; flex: none; min-height: 20px; padding: 0 8px; border: 1px solid rgba(128, 128, 128, 0.4); border-radius: 999px; font-size: 11px; line-height: 18px; white-space: nowrap; vertical-align: middle; }
.mo-page .mo-kind-chip-bare { min-width: 20px; padding: 0; border-color: transparent; justify-content: center; }
.mo-page .mo-kind-chip-icon { color: var(--wf-icon); }
.mo-page .mo-kind-chip-swatch { width: 10px; height: 10px; border: 1px solid rgba(128, 128, 128, 0.5); border-radius: 2px; }
</style>
