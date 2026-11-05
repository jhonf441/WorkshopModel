<template>
	<help-guide v-if="choice" :title="title" :what="t(choice.what)" :why="t(choice.why)" :if-missing="t(choice.ifMissing)" :how="t(choice.help)" />
</template>

<script>
'use strict'

// H3, the guide of a section (AYUDAS.md): the shared fold (HelpGuide.vue, vue/_shared36) fed with the four lines of a choice object. It replaces
// the old ChoiceHelp fold under an input: one guide per section, closed, with the fixed rows. The "?" of one field is InfoTip.vue instead.
import i18n from '../../i18n'
import HelpGuide from './HelpGuide.vue' // vue/_shared36

export default {
	components: { HelpGuide },
	props: {
		choice: { type: Object, default: null },
		title: { type: String, default: '' } // the fold heading; empty: the shared "How it works"
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		}
	}
}
</script>
