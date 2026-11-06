<template>
	<v-dialog :value="true" max-width="760" scrollable content-class="workshop-theme mo-page" @input="$emit('close')">
		<v-card class="workshop-theme mo-page mo-rs-dialog">
			<div class="mo-rs-head">
				<span class="mo-rs-badge" aria-hidden="true"><v-icon :size="22">mdi-share-variant-outline</v-icon></span>
				<div class="mo-rs-head-txt">
					<div class="mo-rs-title" role="heading" aria-level="2">{{ t('recipes_share_title') }}</div>
					<div class="mo-faint">{{ t('recipes_share_lead') }}</div>
				</div>
				<v-btn icon small :aria-label="t('recipes_share_close')" :title="t('recipes_share_close')" @click="$emit('close')"><v-icon :size="20">mdi-close</v-icon></v-btn>
			</div>
			<v-card-text class="mo-rs-body">
				<div class="mo-rs-note mb-3"><v-icon :size="16" class="mr-1">mdi-shield-lock-outline</v-icon>{{ t('recipes_share_private_note') }}</div>

				<div class="mo-tip-row mb-3">
					<v-text-field v-model="draft.id" dense outlined hide-details spellcheck="false" class="mo-code-field" :label="t('recipes_share_id')" />
					<info-tip :choice="ROWS.id" :title="t('recipes_share_id')" />
				</div>

				<div class="mo-tip-row mb-3">
					<div class="mo-rs-pair">
						<v-text-field v-model="draft.titleEn" dense outlined hide-details class="mo-field" :label="t('recipes_share_name_en')" />
						<v-text-field v-model="draft.titleEs" dense outlined hide-details class="mo-field" :label="t('recipes_share_name_es')" />
					</div>
					<info-tip :choice="ROWS.name" :title="t('recipes_share_name')" />
				</div>

				<div class="mo-tip-row mb-3">
					<div class="mo-rs-pair">
						<v-text-field v-model="draft.descriptionEn" dense outlined hide-details class="mo-field" :label="t('recipes_share_description_en')" />
						<v-text-field v-model="draft.descriptionEs" dense outlined hide-details class="mo-field" :label="t('recipes_share_description_es')" />
					</div>
					<info-tip :choice="ROWS.description" :title="t('recipes_share_description')" />
				</div>

				<div class="mo-tip-row mb-3">
					<v-select v-model="draft.kind" :items="kindItems" item-text="text" item-value="value" dense outlined hide-details class="mo-field" :label="t('recipes_share_kind')" />
					<info-tip :choice="ROWS.kind" :title="t('recipes_share_kind')" />
				</div>

				<div class="mo-tip-row mb-3">
					<v-text-field v-model="draft.template" dense outlined hide-details spellcheck="false" class="mo-code-field" :label="t('recipes_share_template')" />
					<info-tip :choice="ROWS.template" :title="t('recipes_share_template')" />
				</div>

				<template v-if="draft.holes.length">
					<div v-for="h in draft.holes" :key="h.name" class="mo-rs-hole">
						<code class="mo-key">&lt;{{ h.name }}&gt;</code>
						<v-select v-model="h.type" :items="typeItems" item-text="text" item-value="value" dense outlined hide-details class="mo-field-type" :label="t('recipes_share_hole_type')" />
						<v-text-field v-model="h.en" dense outlined hide-details class="mo-field" :label="t('recipes_share_hole_en')" />
						<v-text-field v-model="h.es" dense outlined hide-details class="mo-field" :label="t('recipes_share_hole_es')" />
					</div>
					<div class="mo-tip-row mb-3"><span class="mo-faint">{{ t('recipes_share_holes_row') }}</span><info-tip :choice="ROWS.holes_row" :title="t('recipes_share_holes_row')" /></div>
				</template>

				<div class="mo-tip-row mb-3">
					<v-select v-model="draft.since" :items="SINCE_CHOICES" dense outlined hide-details class="mo-field" :label="t('recipes_share_since')" />
					<info-tip :choice="ROWS.since" :title="t('recipes_share_since')" />
				</div>

				<div class="mo-tip-row mb-3">
					<div class="mo-rs-pair">
						<v-text-field v-model="draft.exampleFilled" dense outlined hide-details spellcheck="false" class="mo-code-field mo-field" :label="t('recipes_share_filled')" />
						<v-select v-model="draft.exampleResult" :items="resultItems" item-text="text" item-value="value" dense outlined hide-details class="mo-field-type" :label="t('recipes_share_result_label')" />
					</div>
					<info-tip :choice="ROWS.sample_row" :title="t('recipes_share_sample_row')" />
				</div>

				<div class="mo-tip-row mb-3">
					<v-text-field v-model="draft.author" dense outlined hide-details class="mo-field" :label="t('recipes_share_author')" />
					<info-tip :choice="ROWS.author" :title="t('recipes_share_author')" />
				</div>

				<div class="mo-tip-row mb-3">
					<v-text-field v-model="draft.tags" dense outlined hide-details class="mo-field" :label="t('recipes_share_tags')" :placeholder="t('recipes_share_tags_hint')" />
					<info-tip :choice="ROWS.tags" :title="t('recipes_share_tags')" />
				</div>

				<div v-if="problems.length" class="mo-rs-problems" role="alert">
					<div class="mo-error">{{ t('recipes_share_problems') }}</div>
					<ul><li v-for="(p, i) in problems" :key="i">{{ problemText(p) }}</li></ul>
				</div>

				<div class="mo-part mt-3">{{ t('recipes_share_json') }}</div>
				<pre class="mo-rs-json">{{ json }}</pre>
				<div v-if="!problems.length && !fileLink && !issue" class="mo-faint">{{ t('recipes_share_link_long') }}</div>
				<div v-if="note" class="mo-faint" :class="{ 'mo-result-bad': !note.ok }" role="status">{{ note.text }}</div>

				<div class="mo-part mt-3">{{ t('recipes_share_steps') }}</div>
				<ol class="mo-rs-steps">
					<li>{{ t('recipes_share_step_1', { name: fileName }) }}</li>
					<li>{{ t('recipes_share_step_2', { dir: RECIPES_DIR }) }}</li>
					<li>{{ t('recipes_share_step_3') }}</li>
				</ol>
				<div class="mo-faint mo-tip-row"><span><a :href="RECIPES_REPO" target="_blank" rel="noopener">{{ t('recipes_share_repo') }}</a> &middot; <a :href="RECIPES_GUIDE" target="_blank" rel="noopener">{{ t('recipes_share_guide_link') }}</a></span><info-tip :choice="ROWS.publish" :title="t('recipes_share_publish')" /></div>
			</v-card-text>
			<v-card-actions class="mo-rs-foot">
				<span class="mo-rs-state" role="status" :class="problems.length ? 'mo-result-bad' : ''"><span class="wf-state" :class="problems.length ? 'err' : 'ok'"></span>{{ problems.length ? t('recipes_share_problems') : t('recipes_share_ready') }}</span>
				<v-spacer />
				<v-btn small text @click="$emit('close')">{{ t('recipes_share_close') }}</v-btn>
				<v-btn v-if="fileLink" small outlined :href="fileLink" target="_blank" rel="noopener"><v-icon small left>mdi-open-in-new</v-icon>{{ t('recipes_share_open_file') }}</v-btn>
				<v-btn v-if="issue" small outlined :href="issue" target="_blank" rel="noopener"><v-icon small left>mdi-open-in-new</v-icon>{{ t('recipes_share_open_issue') }}</v-btn>
				<v-btn small outlined :disabled="problems.length > 0" @click="download"><v-icon small left>mdi-download</v-icon>{{ t('recipes_share_download', { name: fileName }) }}</v-btn>
				<v-btn small color="primary" depressed :disabled="problems.length > 0" @click="copy"><v-icon small left>mdi-content-copy</v-icon>{{ t('recipes_share_copy') }}</v-btn>
			</v-card-actions>
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
import InfoTip from './InfoTip.vue'
import { copyText } from './copy-text.js'
import { exchangeSave } from './data-exchange-ui.js'
import { helpChoice } from './view-choices.js'
import { RECIPE_KINDS, HOLE_TYPES, RESULT_KINDS, recipeJson } from './recipe-schema.js'
import { SINCE_CHOICES, DEFAULT_RESULT, RECIPES_REPO, RECIPES_GUIDE, RECIPES_DIR, draftOf, draftOfRecipe, newDraft, syncHoles, recipeOfDraft, draftProblems, recipeFileName, newFileLink, issueLink } from './recipe-share.js'

const ROWS = Object.fromEntries(['id', 'name', 'description', 'kind', 'template', 'holes_row', 'since', 'sample_row', 'author', 'tags', 'publish'].map(id => [id, helpChoice('recipes_share', id)]))

export default {
	components: { InfoTip },
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
/* the head and the foot stay in view; only the body scrolls (the dialog is scrollable) */
.mo-page.mo-rs-dialog { display: flex; flex-direction: column; }
.mo-page .mo-rs-head { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-bottom: 1px solid var(--wf-line, rgba(128, 128, 128, 0.3)); }
.mo-page .mo-rs-badge { flex: none; display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 10px; background: var(--wf-accent, #1976d2); }
.mo-page .mo-rs-badge .v-icon { color: #fff; }
.mo-page .mo-rs-head-txt { flex: 1 1 auto; min-width: 0; }
.mo-page .mo-rs-title { font-size: 16px; font-weight: 600; line-height: 1.25; }
.mo-page .mo-rs-body { padding-top: 14px; }
.mo-page .mo-rs-note { display: flex; align-items: flex-start; gap: 4px; padding: 8px 10px; border-radius: 8px; background: var(--wf-soft, rgba(128, 128, 128, 0.07)); font-size: 12px; opacity: 0.9; }
.mo-page .mo-rs-foot { flex-wrap: wrap; gap: 8px; padding: 10px 16px; border-top: 1px solid var(--wf-line, rgba(128, 128, 128, 0.3)); }
.mo-page .mo-rs-state { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; }
.mo-page .mo-rs-pair { display: flex; flex-wrap: wrap; gap: 8px; }
/* one blank: its name on its own line, then the three fields in a tidy grid that all start at the same edge (they used to wrap one by one and look shifted) */
.mo-page .mo-rs-hole { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); align-items: center; gap: 8px; margin: 10px 0; }
.mo-page .mo-rs-hole > code { grid-column: 1 / -1; justify-self: start; }
.mo-page .mo-rs-hole .mo-field, .mo-page .mo-rs-hole .mo-field-type { flex: none; width: 100%; min-width: 0; }
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
