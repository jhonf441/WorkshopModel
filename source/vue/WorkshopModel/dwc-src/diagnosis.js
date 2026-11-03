'use strict'

// Quick diagnosis: runs the rule list (diagnosis-rules.js) over the live model and gathers what is wrong in one look.
// The result says how many checks could run (a rule whose branch the model does not have is not a check), so an all-clear never
// claims more than was looked at. Pure: test/diagnosis.test.js.

import { at } from './topic-rows.js'
import { childCount } from './model-tree.js'
import { isBranch } from './value-format.js'
import { RULES } from './diagnosis-rules.js'

export const DIAGNOSIS_MAX = 30
const ORDER = { err: 0, warn: 1 }

// the help of the card (DESIGN.md section 7): texts diag_help_*
export const DIAGNOSIS_HELP = { id: 'diagnosis', label: 'topic_diagnosis', what: 'diag_help_what', why: 'diag_help_why', ifMissing: 'diag_help_missing', help: 'diag_help_how' }

function present(v) {
	if (v === null || v === undefined) return false
	if (isBranch(v)) return childCount(v) > 0
	return true
}

function applies(rule, model) {
	return rule.needs.some(p => present(at(model, p)))
}

function itemOf(rule, f) {
	return { id: rule.id + ':' + f.path, rule: rule.id, level: f.level || rule.level, path: f.path, key: 'diag_' + rule.id, helpKey: 'diag_' + rule.id + '_help', params: f.params }
}

const byLevel = (a, b) => ORDER[a.level] - ORDER[b.level] || String(a.path).localeCompare(String(b.path), undefined, { numeric: true })

// model + ctx { tier } -> { items (errors first, at most DIAGNOSIS_MAX), more, errors, warnings, checked, clear, noData }
export function diagnose(model, ctx) {
	if (!model) return { items: [], more: 0, errors: 0, warnings: 0, checked: 0, clear: false, noData: true }
	const all = []
	let checked = 0
	for (const rule of RULES) {
		if (!applies(rule, model)) continue
		checked++
		let found = []
		try {
			found = rule.find(model, ctx || {})
		} catch (e) {
			found = [] // a rule that cannot read an odd model says nothing instead of breaking the page
		}
		for (const f of found) all.push(itemOf(rule, f))
	}
	all.sort(byLevel)
	return {
		items: all.slice(0, DIAGNOSIS_MAX),
		more: Math.max(0, all.length - DIAGNOSIS_MAX),
		errors: all.filter(i => i.level === 'err').length,
		warnings: all.filter(i => i.level === 'warn').length,
		checked,
		clear: checked > 0 && all.length === 0,
		noData: checked === 0
	}
}
