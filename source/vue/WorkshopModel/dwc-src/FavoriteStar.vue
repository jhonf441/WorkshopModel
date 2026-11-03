<template>
	<button type="button" class="mo-star" :class="{ 'mo-star-on': on }" :aria-pressed="on ? 'true' : 'false'" :aria-label="label" :title="label" :disabled="!action" @click.stop="press">
		<v-icon size="small">{{ on ? 'mdi-star' : 'mdi-star-outline' }}</v-icon>
	</button>
</template>

<script setup>
// The star of a path, usable from any view: filled when the path is one of the favourites (`pinned`, pins.js), and a tap asks to
// pin or unpin it (the view passes the event on, VIEW-CONTRACT.md). A full list disables the star and says why.
import { computed } from 'vue'
import { i18n } from './dwc-host.js'
import { isPinned, pinAction, PINS_MAX } from './pins.js'

const props = defineProps({
	path: { type: String, default: '' },
	pinned: { type: Array, default: () => [] }
})
const emit = defineEmits(['pin', 'unpin'])

const t = (k, p) => i18n.t('plugins.WorkshopModel.model.' + k, p)

const on = computed(() => isPinned(props.pinned, props.path))
const action = computed(() => pinAction(props.pinned, props.path))
const label = computed(() => {
	if (on.value) return t('pin_remove', { path: props.path })
	return action.value ? t('pin_add', { path: props.path }) : t('pin_full', { n: PINS_MAX })
})

function press() {
	if (action.value) emit(action.value, props.path)
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
