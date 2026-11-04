<template>
	<help-tip v-if="choice" :title="title" :what="t(choice.what)" :why="t(choice.why)" :if-missing="t(choice.ifMissing)" :how="t(choice.help)" />
</template>

<script>
'use strict'

// The "?" of one field of this plugin: the family button (HelpTip.vue, vue/_shared36) fed with the four lines of a choice object (what it is, what it
// is for, what you lose without it, how to use it; DESIGN.md sections 7 and 7b). It replaces a fold of text under every input. The same choice
// objects as choice-help.vue, so the texts and their tests are the same.
import i18n from '../../i18n'
import HelpTip from './HelpTip.vue' // vue/_shared36

export default {
	components: { HelpTip },
	props: {
		choice: { type: Object, default: null },
		title: { type: String, default: '' }
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		}
	}
}
</script>

<style>
.mo-page .mo-tip-row { display: flex; align-items: center; gap: 4px; }
.mo-page .mo-tip-row > :first-child { flex: 1; min-width: 0; }
</style>
