'use strict'

// The schema of a community recipe (CONTRIBUTING-RECIPES.md): one JSON file recipes/<id>.json in the plugin source, bundled into the
// plugin when it is built (community-recipes-data.js, written by tools/check-recipes.js --write); the page never fetches anything.
// validateRecipe() is the one judge of a file: the node check, the test over every file, the share dialog and the import of the page
// all call it and show its problems. A problem is { code, field, what } (code: the text key recipes_share_problem_<code>; what: the
// value or the name it is about, '' when there is none). Pure (no imports): test/recipe-schema.test.js.

export const RECIPE_KINDS = ['expression', 'condition', 'm409', 'echo']
export const HOLE_TYPES = ['number', 'text', 'index', 'path', 'global', 'bool', 'expression']
export const RESULT_KINDS = ['number', 'bool', 'string', 'array', 'object', 'null']
export const RECIPE_LANGS = ['en', 'es']
export const RECIPE_FIELDS = ['id', 'title', 'description', 'kind', 'template', 'holes', 'since', 'example', 'author', 'tags', 'sample']
export const RECIPE_MIN_RRF = '3.0'
export const LIMITS = { id: 60, title: 80, description: 300, template: 400, hole: 160, author: 39, tags: 8, tag: 30 }
export const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
export const AUTHOR_RE = /^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){0,38}$/i
export const SINCE_RE = /^\d+\.\d+$/
// a hole is <name> with the names the builder selects when the template is loaded (expression-insert.js: lower case and _)
export const HOLE_RE = /<([a-z_]+)>/g
const HOLE_NAME_RE = /^[a-z_]+$/
const M409_PATH_RE = /^[a-zA-Z#][a-zA-Z0-9_.[\]<>]*$/
// what must not travel in a recipe: an IP address, a web address, a file path of a PC
const PRIVATE_RES = [/\b\d{1,3}(?:\.\d{1,3}){3}\b/, /\bhttps?:\/\//i, /\b[a-z]:[\\/]/i, /(?:^|[\s"'(=])\/(?:home|users|root)\//i, /\\\\[a-z0-9]/i]
const QUOTE_PAIRS = { '(': ')', '[': ']', '{': '}' }

const isObject = x => !!x && typeof x === 'object' && !Array.isArray(x)

// the names of the holes of a template, in order, each once
export function recipeHoles(template) {
	const out = []
	for (const m of String(template || '').matchAll(HOLE_RE)) if (out.indexOf(m[1]) < 0) out.push(m[1])
	return out
}

// the template with every hole replaced by values[name] (a hole without a value stays)
export function fillTemplate(template, values) {
	return String(template || '').replace(HOLE_RE, (m, name) => (values && values[name] !== undefined && values[name] !== null ? String(values[name]) : m))
}

// true when the brackets of an expression pair up and every quote is closed (a bracket inside a text does not count)
export function balanced(text) {
	const stack = []
	let quote = ''
	for (const c of String(text || '')) {
		if (quote) {
			if (c === quote) quote = ''
			continue
		}
		if (c === '"' || c === "'") quote = c
		else if (QUOTE_PAIRS[c]) stack.push(QUOTE_PAIRS[c])
		else if (c === ')' || c === ']' || c === '}') {
			if (stack.pop() !== c) return false
		}
	}
	return !quote && stack.length === 0
}

// the kinds of private data a text carries: [] when it is clean
export function privateDataIn(text) {
	const s = String(text || '')
	const kinds = ['ip', 'url', 'drive', 'home', 'share']
	return kinds.filter((k, i) => PRIVATE_RES[i].test(s))
}

// a text that is a non-empty single line within max characters; problems are pushed on `out`
function checkText(out, field, value, max, required) {
	if (value === undefined || value === null || value === '') {
		if (required) out.push({ code: 'missing', field, what: '' })
		return false
	}
	if (typeof value !== 'string') {
		out.push({ code: 'type', field, what: typeof value })
		return false
	}
	if (!value.trim()) {
		out.push({ code: 'missing', field, what: '' })
		return false
	}
	if (/[\r\n]/.test(value)) out.push({ code: 'one_line', field, what: '' })
	if (value.length > max) out.push({ code: 'too_long', field, what: String(max) })
	for (const k of privateDataIn(value)) out.push({ code: 'private', field, what: k })
	return true
}

// { en, es? }: en required, es optional, nothing else
function checkTexts(out, field, value, max) {
	if (value === undefined || value === null) return out.push({ code: 'missing', field, what: '' })
	if (!isObject(value)) return out.push({ code: 'type', field, what: typeof value })
	for (const k of Object.keys(value)) if (RECIPE_LANGS.indexOf(k) < 0) out.push({ code: 'unknown_lang', field, what: k })
	checkText(out, field + '.en', value.en, max, true)
	if (value.es !== undefined) checkText(out, field + '.es', value.es, max, false)
}

function checkHoles(out, holes, template) {
	const names = recipeHoles(template)
	if (holes !== undefined && holes !== null && !isObject(holes)) return out.push({ code: 'type', field: 'holes', what: typeof holes })
	const given = isObject(holes) ? holes : {}
	for (const name of names) if (!given[name]) out.push({ code: 'hole_undescribed', field: 'holes', what: name })
	for (const name of Object.keys(given)) {
		if (!HOLE_NAME_RE.test(name)) out.push({ code: 'hole_name', field: 'holes', what: name })
		else if (names.indexOf(name) < 0) out.push({ code: 'hole_unused', field: 'holes', what: name })
		const h = given[name]
		if (!isObject(h)) {
			out.push({ code: 'type', field: 'holes.' + name, what: typeof h })
			continue
		}
		if (HOLE_TYPES.indexOf(h.type) < 0) out.push({ code: 'unknown_hole_type', field: 'holes.' + name, what: String(h.type) })
		for (const k of Object.keys(h)) if (k !== 'type' && RECIPE_LANGS.indexOf(k) < 0) out.push({ code: 'unknown_field', field: 'holes.' + name, what: k })
		checkText(out, 'holes.' + name + '.en', h.en, LIMITS.hole, true)
		if (h.es !== undefined) checkText(out, 'holes.' + name + '.es', h.es, LIMITS.hole, false)
	}
}

function checkExample(out, example, template, kind) {
	if (example === undefined || example === null) return out.push({ code: 'missing', field: 'example', what: '' })
	if (!isObject(example)) return out.push({ code: 'type', field: 'example', what: typeof example })
	for (const k of Object.keys(example)) if (k !== 'filled' && k !== 'result') out.push({ code: 'unknown_field', field: 'example', what: k })
	if (RESULT_KINDS.indexOf(example.result) < 0) out.push({ code: 'unknown_result', field: 'example.result', what: String(example.result) })
	else if (kind === 'condition' && example.result !== 'bool') out.push({ code: 'condition_result', field: 'example.result', what: example.result })
	if (!checkText(out, 'example.filled', example.filled, LIMITS.template, true)) return
	if (recipeHoles(example.filled).length) return out.push({ code: 'example_hole', field: 'example.filled', what: recipeHoles(example.filled)[0] })
	if (typeof template === 'string' && template.trim() && !exampleFits(template, example.filled)) out.push({ code: 'example_mismatch', field: 'example.filled', what: '' })
}

// the filled example is the template with something in every hole
export function exampleFits(template, filled) {
	const parts = String(template).split(HOLE_RE)
	let re = '^'
	for (let i = 0; i < parts.length; i++) re += i % 2 === 0 ? parts[i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '[^<>]+?'
	return new RegExp(re + '$').test(String(filled))
}

function checkTags(out, tags) {
	if (tags === undefined || tags === null) return
	if (!Array.isArray(tags)) return out.push({ code: 'type', field: 'tags', what: typeof tags })
	if (tags.length > LIMITS.tags) out.push({ code: 'too_long', field: 'tags', what: String(LIMITS.tags) })
	const seen = []
	for (const tag of tags) {
		if (typeof tag !== 'string' || !ID_RE.test(tag) || tag.length > LIMITS.tag) out.push({ code: 'tag_format', field: 'tags', what: String(tag) })
		else if (seen.indexOf(tag) >= 0) out.push({ code: 'tag_repeat', field: 'tags', what: tag })
		seen.push(tag)
	}
}

// -> [{ code, field, what }], [] when the recipe is good
export function validateRecipe(recipe) {
	const out = []
	if (!isObject(recipe)) return [{ code: 'not_object', field: '', what: '' }]
	for (const k of Object.keys(recipe)) if (RECIPE_FIELDS.indexOf(k) < 0) out.push({ code: 'unknown_field', field: '', what: k })
	if (checkText(out, 'id', recipe.id, LIMITS.id, true) && !ID_RE.test(recipe.id)) out.push({ code: 'id_format', field: 'id', what: recipe.id })
	checkTexts(out, 'title', recipe.title, LIMITS.title)
	checkTexts(out, 'description', recipe.description, LIMITS.description)
	if (RECIPE_KINDS.indexOf(recipe.kind) < 0) out.push({ code: 'unknown_kind', field: 'kind', what: String(recipe.kind) })
	if (checkText(out, 'template', recipe.template, LIMITS.template, true)) {
		if (!balanced(recipe.template)) out.push({ code: 'unbalanced', field: 'template', what: '' })
		if (recipe.kind === 'm409' && !M409_PATH_RE.test(recipe.template)) out.push({ code: 'm409_path', field: 'template', what: '' })
	}
	checkHoles(out, recipe.holes, recipe.template)
	if (checkText(out, 'since', recipe.since, 12, true)) {
		if (!SINCE_RE.test(recipe.since)) out.push({ code: 'since_format', field: 'since', what: recipe.since })
		else if (Number(recipe.since.split('.')[0]) < Number(RECIPE_MIN_RRF.split('.')[0])) out.push({ code: 'since_old', field: 'since', what: recipe.since })
	}
	checkExample(out, recipe.example, recipe.template, recipe.kind)
	if (recipe.author !== undefined && recipe.author !== null && recipe.author !== '') {
		if (typeof recipe.author !== 'string') out.push({ code: 'type', field: 'author', what: typeof recipe.author })
		else if (!AUTHOR_RE.test(recipe.author)) out.push({ code: 'author_format', field: 'author', what: recipe.author })
	}
	checkTags(out, recipe.tags)
	if (recipe.sample !== undefined && typeof recipe.sample !== 'boolean') out.push({ code: 'type', field: 'sample', what: typeof recipe.sample })
	return out
}

function texts(value) {
	const out = {}
	for (const lang of RECIPE_LANGS) if (isObject(value) && typeof value[lang] === 'string' && value[lang].trim()) out[lang] = value[lang].trim()
	return out
}

// the recipe with its fields in the order of the schema, texts trimmed, empty optional fields left out: what the file and the
// generated module hold (it does not validate: call validateRecipe first)
export function normalizeRecipe(recipe) {
	const r = isObject(recipe) ? recipe : {}
	const out = { id: String(r.id || '').trim(), title: texts(r.title), description: texts(r.description), kind: r.kind, template: String(r.template || '').trim(), holes: {} }
	for (const name of recipeHoles(out.template)) {
		const h = isObject(r.holes) && isObject(r.holes[name]) ? r.holes[name] : {}
		out.holes[name] = Object.assign({ type: h.type }, texts(h))
	}
	out.since = String(r.since || '').trim()
	const ex = isObject(r.example) ? r.example : {}
	out.example = { filled: String(ex.filled || '').trim(), result: ex.result }
	if (typeof r.author === 'string' && r.author.trim()) out.author = r.author.trim()
	out.tags = Array.isArray(r.tags) ? r.tags.filter(t => typeof t === 'string' && t.trim()).map(t => t.trim()) : []
	if (r.sample === true) out.sample = true
	return out
}

// the text of a recipe file: two-space JSON with a final line feed
export function recipeJson(recipe) {
	return JSON.stringify(normalizeRecipe(recipe), null, 2) + '\n'
}

// the text of a file -> { recipe, problems } (a text that is not JSON gives the problem not_json)
export function parseRecipeText(text) {
	let recipe = null
	try {
		recipe = JSON.parse(String(text || '').replace(/^﻿/, ''))
	} catch (e) {
		return { recipe: null, problems: [{ code: 'not_json', field: '', what: '' }] }
	}
	const problems = validateRecipe(recipe)
	return { recipe: problems.length ? null : normalizeRecipe(recipe), problems }
}
