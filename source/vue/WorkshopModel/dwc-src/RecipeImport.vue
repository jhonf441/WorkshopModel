<template>
	<div class="mo-rs-import">
		<div class="mo-part">{{ t('recipes_share_import') }}</div>
		<choice-help :choice="ROW" :title="t('help_how')" class="mb-2" />
		<v-textarea v-model="text" rows="3" auto-grow density="compact" variant="outlined" hide-details spellcheck="false" :label="t('recipes_share_import_paste')" />
		<div class="mo-actions">
			<v-btn size="small" variant="outlined" @click="pick">{{ t('recipes_share_import_pick') }}</v-btn>
			<v-btn size="small" variant="outlined" :disabled="!parsed.recipe || full" @click="add">{{ t('recipes_share_import_add') }}</v-btn>
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

<script setup>
// Brings a recipe file (recipe-schema.js) into the saved formulas: pasted or chosen through the exchange standard (exchangePick),
// checked with validateRecipe as it is typed, added with one tap. Emits `add` with the saved entry { mode, text, name }. `full`:
// the saved list has no room.
import { computed, ref } from 'vue'
import { i18n } from './dwc-host.js'
import ChoiceHelp from './ChoiceHelp.vue'
import { exchangePick } from './data-exchange-ui.js'
import { helpChoice } from './view-choices.js'
import { parseRecipeText } from './recipe-schema.js'
import { favoriteOfRecipe } from './recipe-share.js'

const props = defineProps({ full: { type: Boolean, default: false } })
const emit = defineEmits(['add'])

const t = (k, p) => i18n.t('plugins.WorkshopModel.model.' + k, p)
const ROW = helpChoice('recipes_share', 'import')

const text = ref('')
const note = ref(null)
const parsed = computed(() => (text.value.trim() ? parseRecipeText(text.value) : { recipe: null, problems: [] }))

function problemText(p) {
	return t('recipes_share_problem_' + p.code, { field: p.field, what: p.what })
}
async function pick() {
	const file = await exchangePick('.json,application/json')
	if (!file) return
	try {
		text.value = await file.text()
		note.value = null
	} catch (e) {
		note.value = { ok: false, text: t('recipes_share_import_read_failed') }
	}
}
function add() {
	if (!parsed.value.recipe || props.full) return
	const entry = favoriteOfRecipe(parsed.value.recipe)
	emit('add', entry)
	note.value = { ok: true, text: t('recipes_share_import_added', { name: entry.name }) }
	text.value = ''
}
</script>
