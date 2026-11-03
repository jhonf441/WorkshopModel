'use strict'

// The views of the live model the selector of the Model section offers, one entry per view, and the choice remembered in this
// browser. Every choice carries the help of DESIGN.md section 7: label, what (what it is), why (what it is for), ifMissing (what you
// lose without it) and help (how to use it), keys of plugins.WorkshopModel.model.*; test/view-choices.test.js fails when one is
// missing in en.json or es.json of either line. layout: 'full' (the view uses the whole width) or 'split' (the detail of the
// selected path is shown beside it). How a view is added: VIEW-CONTRACT.md. Pure.

export const VIEW_STORAGE_KEY = 'workshopModelView'
export const DEFAULT_VIEW = 'topics'
export const TECHNICAL_VIEW = 'tree'
export const CHOICE_FIELDS = ['label', 'what', 'why', 'ifMissing', 'help']

// a choice with its help keys: prefix_id (label), prefix_id_what, _why, _missing, _help; extra fields (icon, layout...) added as they are
export function helpChoice(prefix, id, extra) {
	const k = prefix + '_' + id
	return Object.assign({ id, label: k, what: k + '_what', why: k + '_why', ifMissing: k + '_missing', help: k + '_help' }, extra || {})
}

function choice(id, icon, layout) {
	return helpChoice('view', id, { icon, layout })
}

export const VIEW_CHOICES = [
	choice('topics', 'mdi-view-dashboard-outline', 'full'),
	choice('flat', 'mdi-format-list-bulleted', 'split'),
	choice('columns', 'mdi-view-column-outline', 'full'),
	choice('browse', 'mdi-folder-open-outline', 'split'),
	choice('changes', 'mdi-compare-horizontal', 'full'),
	choice('tree', 'mdi-file-tree', 'split')
]

export function choiceOf(list, id) {
	return (list || []).find(c => c.id === id) || null
}

// a stored or asked id -> an id the selector has (anything else, or nothing, gives the default)
export function validView(id) {
	return choiceOf(VIEW_CHOICES, id) ? id : DEFAULT_VIEW
}

// the view this browser remembers; storage is localStorage or anything with getItem (null when there is none)
export function readView(storage) {
	try {
		return validView(storage && storage.getItem(VIEW_STORAGE_KEY))
	} catch (e) {
		return DEFAULT_VIEW
	}
}

export function saveView(storage, id) {
	try {
		if (storage) storage.setItem(VIEW_STORAGE_KEY, validView(id))
		return true
	} catch (e) {
		return false
	}
}
