<template>
	<button type="button" class="mo-star" :class="{ 'mo-star-on': on }" :aria-pressed="on ? 'true' : 'false'" :aria-label="label" :title="label" :disabled="!action" @click.stop="press">
		<v-icon small>{{ on ? 'mdi-star' : 'mdi-star-outline' }}</v-icon>
	</button>
</template>

<script>
'use strict'

// The star of a path, usable from any view: filled when the path is one of the favourites (`pinned`, pins.js), and a tap asks to
// pin or unpin it (the view passes the event on, VIEW-CONTRACT.md). A full list disables the star and says why.
import i18n from '../../i18n'
import { isPinned, pinAction, PINS_MAX } from './pins.js'

export default {
	props: {
		path: { type: String, default: '' },
		pinned: { type: Array, default: () => [] }
	},
	computed: {
		on() {
			return isPinned(this.pinned, this.path)
		},
		action() {
			return pinAction(this.pinned, this.path)
		},
		label() {
			if (this.on) return this.t('pin_remove', { path: this.path })
			return this.action ? this.t('pin_add', { path: this.path }) : this.t('pin_full', { n: PINS_MAX })
		}
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		},
		press() {
			if (this.action) this.$emit(this.action, this.path)
		}
	}
}
</script>

<style>
/* FavoriteStar: gray until pinned, then the highlight amber (DESIGN.md section 2); at least 32 px, 44 px on touch */
.mo-page .mo-star { display: inline-flex; align-items: center; justify-content: center; flex: none; min-width: 32px; min-height: 32px; padding: 0; border: 0; border-radius: 6px; background: transparent; color: var(--wf-icon); cursor: pointer; }
.mo-page .mo-star:hover { background: rgba(128, 128, 128, 0.12); }
.mo-page .mo-star:focus-visible { outline: 2px solid var(--wf-accent); outline-offset: 1px; }
.mo-page .mo-star-on { color: var(--tp-amber, var(--wf-armed)); }
.mo-page .mo-star:disabled { cursor: not-allowed; opacity: 0.5; }
@media (pointer: coarse) { .mo-page .mo-star { min-width: 44px; min-height: 44px; } }
</style>
