<template>
	<div class="mo-rs-import">
		<div class="mo-part">{{ t('recipes_share_import') }}</div>
		<choice-guide :choice="ROW" class="mb-2" />
		<v-textarea v-model="text" rows="3" auto-grow dense outlined hide-details spellcheck="false" :label="t('recipes_share_import_paste')" />
		<div class="mo-actions">
			<v-btn small outlined @click="pick">{{ t('recipes_share_import_pick') }}</v-btn>
			<v-btn small outlined :disabled="!parsed.recipe || full" @click="add">{{ t('recipes_share_import_add') }}</v-btn>
		</div>
		<div v-if="parsed.recipe" class="mo-faint" role="status">{{ t('recipes_share_import_ok', { title: parsed.recipe.title.en, kind: t('recipes_share_kind_' + parsed.recipe.kind) }) }}</div>
		<div v-else-if="text.trim()" class="mo-rs-problems" role="alert">
			<div class="mo-error">{{ t('recipes_share_problems') }}</div>
			<ul><li v-for="(p, i) in parsed.problems" :key="i">{{ problemText(p) }}</li></ul>
		</div>
		<div v-if="full" class="mo-faint">{{ t('recipes_share_import_full') }}</div>
		<div v-if="note" class="mo-faint" :class="{ 'mo-result-bad': !note.ok }" role="status">{{ note.text }}</div>
	</div>
</template>

<script>
'use strict'

// Brings a recipe file (recipe-schema.js) into the saved formulas: pasted or chosen through the exchange standard (exchangePick),
// checked with validateRecipe as it is typed, added with one tap. Emits `add` with the saved entry { mode, text, name }. `full`:
// the saved list has no room.
import i18n from '../../i18n'
import ChoiceGuide from './ChoiceGuide.vue'
import { exchangePick } from './data-exchange-ui.js'
import { helpChoice } from './view-choices.js'
import { parseRecipeText } from './recipe-schema.js'
import { favoriteOfRecipe } from './recipe-share.js'

const ROW = helpChoice('recipes_share', 'import')

export default {
	components: { ChoiceGuide },
	props: { full: { type: Boolean, default: false } },
	data() {
		return { text: '', note: null, ROW }
	},
	computed: {
		parsed() {
			return this.text.trim() ? parseRecipeText(this.text) : { recipe: null, problems: [] }
		}
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		},
		problemText(p) {
			return this.t('recipes_share_problem_' + p.code, { field: p.field, what: p.what })
		},
		async pick() {
			const file = await exchangePick('.json,application/json')
			if (!file) return
			try {
				this.text = await file.text()
				this.note = null
			} catch (e) {
				this.note = { ok: false, text: this.t('recipes_share_import_read_failed') }
			}
		},
		add() {
			if (!this.parsed.recipe || this.full) return
			const entry = favoriteOfRecipe(this.parsed.recipe)
			this.$emit('add', entry)
			this.note = { ok: true, text: this.t('recipes_share_import_added', { name: entry.name }) }
			this.text = ''
		}
	}
}
</script>
