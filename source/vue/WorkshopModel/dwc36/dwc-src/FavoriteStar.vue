<template>
	<button type="button" class="mo-star" :class="{ 'mo-star-on': on }" :aria-pressed="on ? 'true' : 'false'" :aria-label="label" :title="label" :disabled="!action" @click.stop="press">
		<v-icon>{{ on ? 'mdi-star' : 'mdi-star-outline' }}</v-icon>
	</button>
</template>

<script>
'use strict'

// The star of a path, usable from any view: filled when the path is one of the favourites (`pinned`, pins.js), and a tap asks to
// pin or unpin it (the view passes the event on, VIEW-CONTRACT.md). A full list disables the star and says why. Big enough for a
// finger: 36 px, 44 on a touch screen, and the icon at its full size so the star is seen.
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
/* FavoriteStar: gray until pinned, then the highlight amber (DESIGN.md section 2); at least 36 px, 44 px on touch */
.mo-page .mo-star { display: inline-flex; align-items: center; justify-content: center; flex: none; min-width: 36px; min-height: 36px; padding: 0; border: 0; border-radius: 8px; background: transparent; color: var(--wf-icon); cursor: pointer; transition: background-color 0.12s ease, transform 0.12s ease; }
.mo-page .mo-star:hover { background: rgba(128, 128, 128, 0.12); }
.mo-page .mo-star:active { transform: scale(0.9); }
.mo-page .mo-star:focus-visible { outline: 2px solid var(--wf-accent); outline-offset: 1px; }
.mo-page .mo-star-on { color: var(--tp-amber, var(--wf-armed)); }
.mo-page .mo-star:disabled { cursor: not-allowed; opacity: 0.5; }
@media (pointer: coarse) { .mo-page .mo-star { min-width: 44px; min-height: 44px; } }
@media (prefers-reduced-motion: reduce) { .mo-page .mo-star { transition: none; } .mo-page .mo-star:active { transform: none; } }
</style>
