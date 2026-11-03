'use strict'

// Sharing a formula as a community recipe, and bringing a recipe file into the saved formulas (recipe-schema.js is the judge). The
// draft is the plain state of the share dialog (ShareRecipeDialog.vue): one string per field and the holes as a list, so both DWC
// lines bind it as it is. The page never sends anything: the person copies or downloads the file, or opens a GitHub page pre-filled
// through its address (only when the file is short and clean). Nothing read from the board goes into a recipe. Pure:
// test/recipe-share.test.js.

import { recipeHoles, normalizeRecipe, recipeJson, validateRecipe, RECIPE_LANGS } from './recipe-schema.js'

export const RECIPES_REPO = 'https://github.com/jhonf441/WorkshopModel'
export const RECIPES_BRANCH = 'main'
export const RECIPES_DIR = 'source/vue/WorkshopModel/recipes'
export const RECIPES_GUIDE = RECIPES_REPO + '/blob/' + RECIPES_BRANCH + '/CONTRIBUTING-RECIPES.md'
export const RECIPES_ISSUES = RECIPES_REPO + '/issues/new'
export const LINK_MAX = 6000
export const DEFAULT_SINCE = '3.4'
export const SINCE_CHOICES = ['3.0', '3.1', '3.2', '3.3', '3.4', '3.5', '3.6']
export const DEFAULT_RESULT = { expression: 'number', condition: 'bool', m409: 'object', echo: 'string' }
export const DEFAULT_HOLE_TYPE = 'number'

const COMPARISON_RE = /(^|[^<>=!])(==?|!=|<=?|>=?)([^=]|$)|&&|\|\||(^|[\s(])!/

// a kebab-case id from a title or an expression: my-recipe when nothing usable is left
export function suggestId(text) {
	const id = String(text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/, '')
	return id || 'my-recipe'
}

// the kind a saved formula most likely is: a path is m409, a text built with ^ is echo, a comparison is a condition
export function guessKind(mode, text) {
	const s = String(text || '')
	if (mode === 'm409') return 'm409'
	if (s.indexOf('?') >= 0) return 'expression'
	if (s.indexOf('^') >= 0) return 'echo'
	return COMPARISON_RE.test(s) ? 'condition' : 'expression'
}

export function newDraft() {
	return { id: '', titleEn: '', titleEs: '', descriptionEn: '', descriptionEs: '', kind: 'expression', template: '', holes: [], since: DEFAULT_SINCE, exampleFilled: '', exampleResult: DEFAULT_RESULT.expression, author: '', tags: '', sample: false }
}

// the holes of the template as rows, keeping the type and the texts of the ones already described
export function syncHoles(holes, template) {
	const old = Array.isArray(holes) ? holes : []
	return recipeHoles(template).map(name => {
		const h = old.find(x => x && x.name === name)
		return h ? Object.assign({}, h) : { name, type: DEFAULT_HOLE_TYPE, en: '', es: '' }
	})
}

// a draft from a saved formula (or a built-in recipe): { mode, text, name, description }; lang is the language of the page, so a
// name written in Spanish lands in the Spanish field and the English one, which the repository needs, is asked
export function draftOf(source, lang) {
	const s = source || {}
	const d = newDraft()
	const es = lang === 'es'
	d.kind = guessKind(s.mode, s.text)
	d.template = String(s.text || '').trim()
	d.exampleFilled = d.template
	d.exampleResult = DEFAULT_RESULT[d.kind]
	d.holes = syncHoles([], d.template)
	if (es) {
		d.titleEs = String(s.name || '').trim()
		d.descriptionEs = String(s.description || '').trim()
	} else {
		d.titleEn = String(s.name || '').trim()
		d.descriptionEn = String(s.description || '').trim()
	}
	d.id = suggestId(s.name || s.text)
	return d
}

// a draft from a recipe already in the new format (to propose a variant of a community recipe)
export function draftOfRecipe(recipe) {
	const r = normalizeRecipe(recipe)
	const d = newDraft()
	d.id = r.id
	d.titleEn = r.title.en || ''
	d.titleEs = r.title.es || ''
	d.descriptionEn = r.description.en || ''
	d.descriptionEs = r.description.es || ''
	d.kind = r.kind || 'expression'
	d.template = r.template
	d.holes = Object.keys(r.holes).map(name => ({ name, type: r.holes[name].type || DEFAULT_HOLE_TYPE, en: r.holes[name].en || '', es: r.holes[name].es || '' }))
	d.since = r.since || DEFAULT_SINCE
	d.exampleFilled = r.example.filled
	d.exampleResult = r.example.result || DEFAULT_RESULT[d.kind] || 'number'
	d.author = r.author || ''
	d.tags = r.tags.join(', ')
	return d
}

function textsOf(en, es) {
	const out = { en: String(en || '').trim() }
	if (String(es || '').trim()) out.es = String(es).trim()
	return out
}

// the tags typed as one text (commas or spaces between them)
export function tagsOf(text) {
	const out = []
	for (const t of String(text || '').toLowerCase().split(/[\s,;]+/)) if (t && out.indexOf(t) < 0) out.push(t)
	return out
}

// the recipe the draft describes (validate it with validateRecipe; it is not normalized so every problem is reported)
export function recipeOfDraft(draft) {
	const d = draft || newDraft()
	const holes = {}
	for (const h of syncHoles(d.holes, d.template)) {
		holes[h.name] = { type: h.type }
		for (const lang of RECIPE_LANGS) if (String(h[lang] || '').trim()) holes[h.name][lang] = String(h[lang]).trim()
	}
	const r = {
		id: String(d.id || '').trim(),
		title: textsOf(d.titleEn, d.titleEs),
		description: textsOf(d.descriptionEn, d.descriptionEs),
		kind: d.kind,
		template: String(d.template || '').trim(),
		holes,
		since: String(d.since || '').trim(),
		example: { filled: String(d.exampleFilled || '').trim(), result: d.exampleResult },
		tags: tagsOf(d.tags)
	}
	if (String(d.author || '').trim()) r.author = String(d.author).trim().replace(/^@/, '')
	return r
}

export function draftProblems(draft) {
	return validateRecipe(recipeOfDraft(draft))
}

export function recipeFileName(recipe) {
	return String((recipe && recipe.id) || 'recipe') + '.json'
}

// the mode of the builder a recipe is loaded with
export function modeOfKind(kind) {
	return kind === 'm409' ? 'm409' : 'echo'
}

// a recipe as a saved formula: the template (its holes are filled in the field) under the English title
export function favoriteOfRecipe(recipe) {
	const r = normalizeRecipe(recipe)
	return { mode: modeOfKind(r.kind), text: r.template, name: r.title.en || r.id }
}

// the GitHub page that creates the file in the recipes folder, pre-filled through its address; '' when the recipe has a problem
// or the address would be too long (then the person copies or downloads the file). The page only opens: nothing is sent by itself.
export function newFileLink(recipe) {
	if (validateRecipe(recipe).length) return ''
	const r = normalizeRecipe(recipe)
	const link = RECIPES_REPO + '/new/' + RECIPES_BRANCH + '/' + RECIPES_DIR + '?filename=' + encodeURIComponent(recipeFileName(r)) + '&value=' + encodeURIComponent(recipeJson(r))
	return link.length <= LINK_MAX ? link : ''
}

// the GitHub page of a new issue with the file in its text, for someone who would rather not open a pull request
export function issueLink(recipe) {
	if (validateRecipe(recipe).length) return ''
	const r = normalizeRecipe(recipe)
	const body = 'Recipe proposal: `' + RECIPES_DIR + '/' + recipeFileName(r) + '`\n\n```json\n' + recipeJson(r) + '```\n'
	const link = RECIPES_ISSUES + '?title=' + encodeURIComponent('Recipe: ' + r.title.en) + '&body=' + encodeURIComponent(body)
	return link.length <= LINK_MAX ? link : ''
}
