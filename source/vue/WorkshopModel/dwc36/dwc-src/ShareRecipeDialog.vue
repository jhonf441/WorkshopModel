<template>
	<v-dialog :value="true" max-width="760" scrollable @input="$emit('close')">
		<v-card class="workshop-theme mo-page mo-rs-dialog">
			<v-card-text>
				<div class="mo-part"><v-icon :size="20" class="mr-1">mdi-share-variant-outline</v-icon>{{ t('recipes_share_title') }}</div>
				<div class="mo-faint mb-1">{{ t('recipes_share_lead') }}</div>
				<div class="mo-faint mb-3">{{ t('recipes_share_private_note') }}</div>

				<v-text-field v-model="draft.id" dense outlined hide-details spellcheck="false" class="mo-code-field" :label="t('recipes_share_id')" />
				<choice-help :choice="ROWS.id" :title="t('recipes_share_id')" class="mb-3" />

				<div class="mo-rs-pair">
					<v-text-field v-model="draft.titleEn" dense outlined hide-details class="mo-field" :label="t('recipes_share_name_en')" />
					<v-text-field v-model="draft.titleEs" dense outlined hide-details class="mo-field" :label="t('recipes_share_name_es')" />
				</div>
				<choice-help :choice="ROWS.name" :title="t('recipes_share_name')" class="mb-3" />

				<div class="mo-rs-pair">
					<v-text-field v-model="draft.descriptionEn" dense outlined hide-details class="mo-field" :label="t('recipes_share_description_en')" />
					<v-text-field v-model="draft.descriptionEs" dense outlined hide-details class="mo-field" :label="t('recipes_share_description_es')" />
				</div>
				<choice-help :choice="ROWS.description" :title="t('recipes_share_description')" class="mb-3" />

				<v-select v-model="draft.kind" :items="kindItems" item-text="text" item-value="value" dense outlined hide-details class="mo-field" :label="t('recipes_share_kind')" />
				<choice-help :choice="ROWS.kind" :title="t('recipes_share_kind')" class="mb-3" />

				<v-text-field v-model="draft.template" dense outlined hide-details spellcheck="false" class="mo-code-field" :label="t('recipes_share_template')" />
				<choice-help :choice="ROWS.template" :title="t('recipes_share_template')" class="mb-3" />

				<template v-if="draft.holes.length">
					<div v-for="h in draft.holes" :key="h.name" class="mo-rs-hole">
						<code class="mo-key">&lt;{{ h.name }}&gt;</code>
						<v-select v-model="h.type" :items="typeItems" item-text="text" item-value="value" dense outlined hide-details class="mo-field-type" :label="t('recipes_share_hole_type')" />
						<v-text-field v-model="h.en" dense outlined hide-details class="mo-field" :label="t('recipes_share_hole_en')" />
						<v-text-field v-model="h.es" dense outlined hide-details class="mo-field" :label="t('recipes_share_hole_es')" />
					</div>
					<choice-help :choice="ROWS.holes_row" :title="t('recipes_share_holes_row')" class="mb-3" />
				</template>

				<v-select v-model="draft.since" :items="SINCE_CHOICES" dense outlined hide-details class="mo-field" :label="t('recipes_share_since')" />
				<choice-help :choice="ROWS.since" :title="t('recipes_share_since')" class="mb-3" />

				<div class="mo-rs-pair">
					<v-text-field v-model="draft.exampleFilled" dense outlined hide-details spellcheck="false" class="mo-code-field mo-field" :label="t('recipes_share_filled')" />
					<v-select v-model="draft.exampleResult" :items="resultItems" item-text="text" item-value="value" dense outlined hide-details class="mo-field-type" :label="t('recipes_share_result_label')" />
				</div>
				<choice-help :choice="ROWS.sample_row" :title="t('recipes_share_sample_row')" class="mb-3" />

				<v-text-field v-model="draft.author" dense outlined hide-details class="mo-field" :label="t('recipes_share_author')" />
				<choice-help :choice="ROWS.author" :title="t('recipes_share_author')" class="mb-3" />

				<v-text-field v-model="draft.tags" dense outlined hide-details class="mo-field" :label="t('recipes_share_tags')" :placeholder="t('recipes_share_tags_hint')" />
				<choice-help :choice="ROWS.tags" :title="t('recipes_share_tags')" class="mb-3" />

				<div v-if="problems.length" class="mo-rs-problems" role="alert">
					<div class="mo-error">{{ t('recipes_share_problems') }}</div>
					<ul><li v-for="(p, i) in problems" :key="i">{{ problemText(p) }}</li></ul>
				</div>
				<div v-else class="mo-faint mo-rs-ready" role="status"><span class="wf-state ok"></span>{{ t('recipes_share_ready') }}</div>

				<div class="mo-part mt-3">{{ t('recipes_share_json') }}</div>
				<pre class="mo-rs-json">{{ json }}</pre>
				<div class="mo-actions">
					<v-btn small outlined :disabled="problems.length > 0" @click="copy">{{ t('recipes_share_copy') }}</v-btn>
					<v-btn small outlined :disabled="problems.length > 0" @click="download">{{ t('recipes_share_download', { name: fileName }) }}</v-btn>
					<v-btn v-if="fileLink" small outlined :href="fileLink" target="_blank" rel="noopener">{{ t('recipes_share_open_file') }}</v-btn>
					<v-btn v-if="issue" small outlined :href="issue" target="_blank" rel="noopener">{{ t('recipes_share_open_issue') }}</v-btn>
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
				<div class="mo-actions"><v-btn small text @click="$emit('close')">{{ t('recipes_share_close') }}</v-btn></div>
			</v-card-text>
		</v-card>
	</v-dialog>
</template>

<script>
'use strict'

// Share a formula as a community recipe (recipe-share.js, recipe-schema.js): the draft is filled from a saved formula (`entry`:
// { mode, text, name, description }) or from a recipe already in the format (`recipe`), checked while it is edited, and handed over
// as a file the person copies or downloads, or as a GitHub page pre-filled through its address when the file is short. The page
// sends nothing by itself. Every row carries its help (DESIGN.md section 7). Emits `close`.
import i18n from '../../i18n'
import ChoiceHelp from './ChoiceHelp.vue'
import { copyText } from './copy-text.js'
import { exchangeSave } from './data-exchange-ui.js'
import { helpChoice } from './view-choices.js'
import { RECIPE_KINDS, HOLE_TYPES, RESULT_KINDS, recipeJson } from './recipe-schema.js'
import { SINCE_CHOICES, DEFAULT_RESULT, RECIPES_REPO, RECIPES_GUIDE, RECIPES_DIR, draftOf, draftOfRecipe, newDraft, syncHoles, recipeOfDraft, draftProblems, recipeFileName, newFileLink, issueLink } from './recipe-share.js'

const ROWS = Object.fromEntries(['id', 'name', 'description', 'kind', 'template', 'holes_row', 'since', 'sample_row', 'author', 'tags', 'publish'].map(id => [id, helpChoice('recipes_share', id)]))

export default {
	components: { ChoiceHelp },
	props: {
		entry: { type: Object, default: null },
		recipe: { type: Object, default: null }
	},
	data() {
		return { draft: newDraft(), note: null, ROWS, SINCE_CHOICES, RECIPES_REPO, RECIPES_GUIDE, RECIPES_DIR }
	},
	computed: {
		kindItems() {
			return RECIPE_KINDS.map(k => ({ text: this.t('recipes_share_kind_' + k), value: k }))
		},
		typeItems() {
			return HOLE_TYPES.map(k => ({ text: this.t('recipes_share_type_' + k), value: k }))
		},
		resultItems() {
			return RESULT_KINDS.map(k => ({ text: this.t('rtype_' + k), value: k }))
		},
		recipeOut() {
			return recipeOfDraft(this.draft)
		},
		problems() {
			return draftProblems(this.draft)
		},
		json() {
			return recipeJson(this.recipeOut)
		},
		fileName() {
			return recipeFileName(this.recipeOut)
		},
		fileLink() {
			return newFileLink(this.recipeOut)
		},
		issue() {
			return issueLink(this.recipeOut)
		}
	},
	watch: {
		entry() {
			this.reset()
		},
		recipe() {
			this.reset()
		},
		'draft.template'() {
			this.draft.holes = syncHoles(this.draft.holes, this.draft.template)
		},
		// the answer follows the kind while it is still the default one (a recipe's own answer is kept)
		'draft.kind'(k, old) {
			if (this.draft.exampleResult === DEFAULT_RESULT[old]) this.draft.exampleResult = DEFAULT_RESULT[k]
		}
	},
	created() {
		this.reset()
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		},
		reset() {
			this.draft = this.recipe ? draftOfRecipe(this.recipe) : draftOf(this.entry, i18n.locale)
			this.note = null
		},
		problemText(p) {
			return this.t('recipes_share_problem_' + p.code, { field: p.field, what: p.what })
		},
		async copy() {
			const ok = await copyText(this.json)
			this.note = { ok, text: this.t(ok ? 'recipes_share_copied' : 'recipes_share_copy_failed') }
		},
		download() {
			const ok = exchangeSave(this.fileName, this.json, 'application/json', false)
			this.note = { ok, text: ok ? this.t('recipes_share_downloaded', { name: this.fileName }) : this.t('recipes_share_download_failed') }
		}
	}
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
