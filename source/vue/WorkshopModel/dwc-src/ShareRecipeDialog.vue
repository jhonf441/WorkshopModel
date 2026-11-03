<template>
	<v-dialog :model-value="true" max-width="760" scrollable @update:model-value="emit('close')">
		<v-card class="workshop-theme mo-page mo-rs-dialog">
			<v-card-text>
				<div class="mo-part"><v-icon size="20" class="mr-1">mdi-share-variant-outline</v-icon>{{ t('recipes_share_title') }}</div>
				<div class="mo-faint mb-1">{{ t('recipes_share_lead') }}</div>
				<div class="mo-faint mb-3">{{ t('recipes_share_private_note') }}</div>

				<v-text-field v-model="draft.id" density="compact" variant="outlined" hide-details spellcheck="false" class="mo-code-field" :label="t('recipes_share_id')" />
				<choice-help :choice="ROWS.id" :title="t('recipes_share_id')" class="mb-3" />

				<div class="mo-rs-pair">
					<v-text-field v-model="draft.titleEn" density="compact" variant="outlined" hide-details class="mo-field" :label="t('recipes_share_name_en')" />
					<v-text-field v-model="draft.titleEs" density="compact" variant="outlined" hide-details class="mo-field" :label="t('recipes_share_name_es')" />
				</div>
				<choice-help :choice="ROWS.name" :title="t('recipes_share_name')" class="mb-3" />

				<div class="mo-rs-pair">
					<v-text-field v-model="draft.descriptionEn" density="compact" variant="outlined" hide-details class="mo-field" :label="t('recipes_share_description_en')" />
					<v-text-field v-model="draft.descriptionEs" density="compact" variant="outlined" hide-details class="mo-field" :label="t('recipes_share_description_es')" />
				</div>
				<choice-help :choice="ROWS.description" :title="t('recipes_share_description')" class="mb-3" />

				<v-select v-model="draft.kind" :items="kindItems" item-title="title" item-value="value" density="compact" variant="outlined" hide-details class="mo-field" :label="t('recipes_share_kind')" />
				<choice-help :choice="ROWS.kind" :title="t('recipes_share_kind')" class="mb-3" />

				<v-text-field v-model="draft.template" density="compact" variant="outlined" hide-details spellcheck="false" class="mo-code-field" :label="t('recipes_share_template')" />
				<choice-help :choice="ROWS.template" :title="t('recipes_share_template')" class="mb-3" />

				<template v-if="draft.holes.length">
					<div v-for="h in draft.holes" :key="h.name" class="mo-rs-hole">
						<code class="mo-key">&lt;{{ h.name }}&gt;</code>
						<v-select v-model="h.type" :items="typeItems" item-title="title" item-value="value" density="compact" variant="outlined" hide-details class="mo-field-type" :label="t('recipes_share_hole_type')" />
						<v-text-field v-model="h.en" density="compact" variant="outlined" hide-details class="mo-field" :label="t('recipes_share_hole_en')" />
						<v-text-field v-model="h.es" density="compact" variant="outlined" hide-details class="mo-field" :label="t('recipes_share_hole_es')" />
					</div>
					<choice-help :choice="ROWS.holes_row" :title="t('recipes_share_holes_row')" class="mb-3" />
				</template>

				<v-select v-model="draft.since" :items="SINCE_CHOICES" density="compact" variant="outlined" hide-details class="mo-field" :label="t('recipes_share_since')" />
				<choice-help :choice="ROWS.since" :title="t('recipes_share_since')" class="mb-3" />

				<div class="mo-rs-pair">
					<v-text-field v-model="draft.exampleFilled" density="compact" variant="outlined" hide-details spellcheck="false" class="mo-code-field mo-field" :label="t('recipes_share_filled')" />
					<v-select v-model="draft.exampleResult" :items="resultItems" item-title="title" item-value="value" density="compact" variant="outlined" hide-details class="mo-field-type" :label="t('recipes_share_result_label')" />
				</div>
				<choice-help :choice="ROWS.sample_row" :title="t('recipes_share_sample_row')" class="mb-3" />

				<v-text-field v-model="draft.author" density="compact" variant="outlined" hide-details class="mo-field" :label="t('recipes_share_author')" />
				<choice-help :choice="ROWS.author" :title="t('recipes_share_author')" class="mb-3" />

				<v-text-field v-model="draft.tags" density="compact" variant="outlined" hide-details class="mo-field" :label="t('recipes_share_tags')" :placeholder="t('recipes_share_tags_hint')" />
				<choice-help :choice="ROWS.tags" :title="t('recipes_share_tags')" class="mb-3" />

				<div v-if="problems.length" class="mo-rs-problems" role="alert">
					<div class="mo-error">{{ t('recipes_share_problems') }}</div>
					<ul><li v-for="(p, i) in problems" :key="i">{{ problemText(p) }}</li></ul>
				</div>
				<div v-else class="mo-faint mo-rs-ready" role="status"><span class="wf-state ok"><span class="wf-dot ok"></span></span>{{ t('recipes_share_ready') }}</div>

				<div class="mo-part mt-3">{{ t('recipes_share_json') }}</div>
				<pre class="mo-rs-json">{{ json }}</pre>
				<div class="mo-actions">
					<v-btn size="small" variant="outlined" :disabled="problems.length > 0" @click="copy">{{ t('recipes_share_copy') }}</v-btn>
					<v-btn size="small" variant="outlined" :disabled="problems.length > 0" @click="download">{{ t('recipes_share_download', { name: fileName }) }}</v-btn>
					<v-btn v-if="fileLink" size="small" variant="outlined" :href="fileLink" target="_blank" rel="noopener">{{ t('recipes_share_open_file') }}</v-btn>
					<v-btn v-if="issue" size="small" variant="outlined" :href="issue" target="_blank" rel="noopener">{{ t('recipes_share_open_issue') }}</v-btn>
				</div>
				<div v-if="!problems.length && !fileLink && !issue" class="mo-faint">{{ t('recipes_share_link_long') }}</div>
				<div v-if="note" class="mo-faint" :class="{ 'mo-result-bad': !note.ok }" role="status">{{ note.text }}</div>

				<div class="mo-part mt-3">{{ t('recipes_share_steps') }}</div>
				<ol class="mo-rs-steps">
					<li>{{ t('recipes_share_step_1', { name: fileName }) }}</li>
					<li>{{ t('recipes_share_step_2', { dir: RECIPES_DIR }) }}</li>
					<li>{{ t('recipes_share_step_3') }}</li>
				</ol>
				<div class="mo-faint"><a :href="RECIPES_REPO" target="_blank" rel="noopener">{{ t('recipes_share_repo') }}</a> &middot; <a :href="RECIPES_GUIDE" target="_blank" rel="noopener">{{ t('recipes_share_guide_link') }}</a></div>
				<choice-help :choice="ROWS.publish" :title="t('recipes_share_publish')" class="mb-2" />
				<div class="mo-actions"><v-btn size="small" variant="text" @click="emit('close')">{{ t('recipes_share_close') }}</v-btn></div>
			</v-card-text>
		</v-card>
	</v-dialog>
</template>

<script setup>
// Share a formula as a community recipe (recipe-share.js, recipe-schema.js): the draft is filled from a saved formula (`entry`:
// { mode, text, name, description }) or from a recipe already in the format (`recipe`), checked while it is edited, and handed over
// as a file the person copies or downloads, or as a GitHub page pre-filled through its address when the file is short. The page
// sends nothing by itself. Every row carries its help (DESIGN.md section 7). Emits `close`.
import { computed, reactive, ref, watch } from 'vue'
import { i18n } from './dwc-host.js'
import ChoiceHelp from './ChoiceHelp.vue'
import { copyText } from './copy-text.js'
import { exchangeSave } from './data-exchange-ui.js'
import { helpChoice } from './view-choices.js'
import { RECIPE_KINDS, HOLE_TYPES, RESULT_KINDS, recipeJson } from './recipe-schema.js'
import { SINCE_CHOICES, DEFAULT_RESULT, RECIPES_REPO, RECIPES_GUIDE, RECIPES_DIR, draftOf, draftOfRecipe, newDraft, syncHoles, recipeOfDraft, draftProblems, recipeFileName, newFileLink, issueLink } from './recipe-share.js'

const props = defineProps({
	entry: { type: Object, default: null },
	recipe: { type: Object, default: null }
})
const emit = defineEmits(['close'])

const t = (k, p) => i18n.t('plugins.WorkshopModel.model.' + k, p)
const ROWS = Object.fromEntries(['id', 'name', 'description', 'kind', 'template', 'holes_row', 'since', 'sample_row', 'author', 'tags', 'publish'].map(id => [id, helpChoice('recipes_share', id)]))

const draft = reactive(newDraft())
const note = ref(null)

const kindItems = computed(() => RECIPE_KINDS.map(k => ({ title: t('recipes_share_kind_' + k), value: k })))
const typeItems = computed(() => HOLE_TYPES.map(k => ({ title: t('recipes_share_type_' + k), value: k })))
const resultItems = computed(() => RESULT_KINDS.map(k => ({ title: t('rtype_' + k), value: k })))
const recipe = computed(() => recipeOfDraft(draft))
const problems = computed(() => draftProblems(draft))
const json = computed(() => recipeJson(recipe.value))
const fileName = computed(() => recipeFileName(recipe.value))
const fileLink = computed(() => newFileLink(recipe.value))
const issue = computed(() => issueLink(recipe.value))

watch(() => [props.entry, props.recipe], () => {
	Object.assign(draft, props.recipe ? draftOfRecipe(props.recipe) : draftOf(props.entry, i18n.locale))
	note.value = null
}, { immediate: true })
watch(() => draft.template, () => { draft.holes = syncHoles(draft.holes, draft.template) })
// the answer follows the kind while it is still the default one (a recipe's own answer is kept)
watch(() => draft.kind, (k, old) => {
	if (draft.exampleResult === DEFAULT_RESULT[old]) draft.exampleResult = DEFAULT_RESULT[k]
})

function problemText(p) {
	return t('recipes_share_problem_' + p.code, { field: p.field, what: p.what })
}
async function copy() {
	const ok = await copyText(json.value)
	note.value = { ok, text: t(ok ? 'recipes_share_copied' : 'recipes_share_copy_failed') }
}
function download() {
	const ok = exchangeSave(fileName.value, json.value, 'application/json', false)
	note.value = { ok, text: ok ? t('recipes_share_downloaded', { name: fileName.value }) : t('recipes_share_download_failed') }
}
</script>

<style>
/* The share dialog and the import of recipes: own classes only (the look of cards, buttons and chips is the family's) */
.mo-page .mo-rs-pair { display: flex; flex-wrap: wrap; gap: 8px; }
.mo-page .mo-rs-hole { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 6px 0; }
.mo-page .mo-rs-problems ul { margin: 2px 0 0; padding-left: 20px; font-size: 13px; }
.mo-page .mo-rs-ready { display: flex; align-items: center; gap: 6px; }
.mo-page .mo-rs-json { font-family: var(--tp-font-mono, monospace); font-size: 12px; white-space: pre-wrap; word-break: break-all; max-height: 240px; overflow: auto; border: 1px solid rgba(128, 128, 128, 0.25); border-radius: 8px; padding: 8px 10px; margin: 0 0 6px; }
.mo-page .mo-rs-steps { padding-left: 20px; font-size: 13px; margin: 0 0 6px; }
.mo-page .mo-rs-steps li { margin: 2px 0; }
.mo-page .mo-rs-chip { display: inline-flex; align-items: center; min-height: 20px; padding: 0 8px; border: 1px solid rgba(128, 128, 128, 0.4); border-radius: 999px; font-size: 11px; line-height: 18px; white-space: nowrap; }
.mo-page .mo-rs-tools { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 6px 0; }
.mo-page .mo-rs-holes { margin-top: 2px; }
.mo-page .mo-rs-holes code { white-space: normal; }
.mo-page .mo-rs-import { margin-top: 10px; border-top: 1px solid rgba(128, 128, 128, 0.15); padding-top: 8px; }
.mo-page .mo-rs-import textarea { font-family: var(--tp-font-mono, monospace); font-size: 12px; }
</style>
