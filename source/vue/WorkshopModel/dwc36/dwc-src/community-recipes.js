'use strict'

// The community recipes bundled with the plugin (community-recipes-data.js, generated from recipes/*.json) as the cards the Recipes
// tab shows next to the built-in ones: the texts in the language of the page (English when there is no Spanish), the holes with
// their descriptions, whether the connected firmware has what the recipe needs (rrf-version.js), a search and a filter by source.
// Pure: test/community-recipes.test.js.

import { COMMUNITY_RECIPES } from './community-recipes-data.js'
import { compareVersions, parseVersion } from './rrf-version.js'
import { modeOfKind } from './recipe-share.js'

export const RECIPE_SOURCES = ['all', 'builtin', 'community']
export const DEFAULT_SOURCE = 'all'

// { en, es } -> the text of the page's language, else the English one
export function recipeText(texts, lang) {
	const t = texts && typeof texts === 'object' ? texts : {}
	return String((lang && t[lang]) || t.en || '')
}

// -> { state: 'ok' | 'newer' | 'unknown', since } for the board's firmware (null while the board has not said it)
export function supportOfSince(since, firmware) {
	if (!since) return { state: 'ok', since: null }
	if (!parseVersion(firmware)) return { state: 'unknown', since }
	return { state: compareVersions(firmware, since) >= 0 ? 'ok' : 'newer', since }
}

// one card of a community recipe
export function communityCard(recipe, opts) {
	const o = opts || {}
	const r = recipe || {}
	const holes = Object.keys(r.holes || {}).map(name => ({ name, type: r.holes[name].type, text: recipeText(r.holes[name], o.lang) }))
	return {
		id: r.id,
		source: 'community',
		title: recipeText(r.title, o.lang),
		description: recipeText(r.description, o.lang),
		kind: r.kind,
		mode: modeOfKind(r.kind),
		code: r.template,
		example: r.example ? r.example.filled : '',
		result: r.example ? r.example.result : '',
		holes,
		since: r.since || null,
		author: r.author || '',
		tags: Array.isArray(r.tags) ? r.tags : [],
		sample: r.sample === true,
		support: supportOfSince(r.since, o.firmware),
		recipe: r
	}
}

// one card of a built-in recipe (expression-recipes.js: { id, mode, code }); text(key) gives the page's texts
export function builtinCard(r, text) {
	const t = typeof text === 'function' ? text : () => ''
	return {
		id: r.id,
		source: 'builtin',
		title: t('recipe_' + r.id),
		description: t('recipe_' + r.id + '_what'),
		kind: r.mode === 'm409' ? 'm409' : 'expression',
		mode: r.mode,
		code: r.code,
		example: r.code,
		result: '',
		holes: [],
		since: null,
		author: '',
		tags: [],
		sample: false,
		support: { state: 'ok', since: null },
		recipe: null
	}
}

// true when the card names the query in its title, description, code, id, author or tags (an empty query matches everything)
export function matchesQuery(card, query) {
	const q = String(query || '').trim().toLowerCase()
	if (!q) return true
	const hay = [card.title, card.description, card.code, card.id, card.author].concat(card.tags || []).join('\n').toLowerCase()
	return hay.indexOf(q) >= 0
}

// the cards of the Recipes tab: the built-in ones first, then the community ones by title; filtered by source and query.
// opts: { builtin: [{ id, mode, code }], text, lang, firmware, source, query, showNewer }
export function recipeCards(opts) {
	const o = opts || {}
	const source = RECIPE_SOURCES.indexOf(o.source) >= 0 ? o.source : DEFAULT_SOURCE
	const own = source === 'community' ? [] : (o.builtin || []).map(r => builtinCard(r, o.text))
	let shared = source === 'builtin' ? [] : COMMUNITY_RECIPES.map(r => communityCard(r, o))
	shared.sort((a, b) => a.title.localeCompare(b.title))
	if (!o.showNewer) shared = shared.filter(c => c.support.state !== 'newer')
	return own.concat(shared).filter(c => matchesQuery(c, o.query))
}

// how many community recipes the firmware lacks (hidden unless showNewer)
export function newerCount(firmware) {
	return COMMUNITY_RECIPES.filter(r => supportOfSince(r.since, firmware).state === 'newer').length
}

export function communityCount() {
	return COMMUNITY_RECIPES.length
}
