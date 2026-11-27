'use strict'

// "To check" of the usage finder, with what the person does after looking at a global (2026-11-22): mark it as reviewed (it is normal) or ignore
// it, and it leaves the list of what is left to check; nothing is deleted from the machine and the global itself is never touched. The state is ONE
// for the whole browser (global, not per scan), kept next to the alert rules in localStorage as { name: 'reviewed' | 'ignored' }. The causes of
// a global to check, each with the plain sentence of what to do about it, group the list. Pure: test/usage-review.test.js. 3.6 line only.

export const REVIEW_KEY = 'workshopModelUsageReview'
export const REVIEW_STATES = ['reviewed', 'ignored']
export const REVIEW_MAX = 2000

// the causes, in the order of the list: the one that may be a real problem first
export const CAUSES = ['read_unread_folder', 'created_not_read', 'live_not_in_files']

export function cleanReview(o) {
	const out = {}
	if (!o || typeof o !== 'object') return out
	for (const name of Object.keys(o)) {
		if (Object.keys(out).length >= REVIEW_MAX) break
		if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(name) && REVIEW_STATES.indexOf(o[name]) >= 0) out[name] = o[name]
	}
	return out
}

export function readReview(storage) {
	try {
		return cleanReview(JSON.parse((storage && storage.getItem(REVIEW_KEY)) || 'null'))
	} catch (e) {
		return {}
	}
}

export function saveReview(storage, review) {
	try {
		storage.setItem(REVIEW_KEY, JSON.stringify(cleanReview(review)))
		return true
	} catch (e) {
		return false
	}
}

// the review with one global marked ('reviewed' | 'ignored') or, with null, back to "to check" (undo): a new object
export function setReview(review, name, state) {
	const next = Object.assign({}, review || {})
	if (REVIEW_STATES.indexOf(state) >= 0) next[name] = state
	else delete next[name]
	return cleanReview(next)
}

// a row of usage-view.js globalRows -> why it is to check: 'read_unread_folder' (a file reads it and a folder that could create it was not read),
// 'created_not_read' (a file creates it and no file reads it), 'live_not_in_files' (it exists on the machine and no file names it), or '' when it is not to check
export function causeOf(row) {
	if (!row) return ''
	if (row.maybe) return 'read_unread_folder'
	if (row.hint) return row.definedIn ? 'created_not_read' : 'live_not_in_files'
	return ''
}

// the rows with the review of the person on each: { ...row, review: 'reviewed' | 'ignored' | '' }, only for the rows that are to check
export function withReview(rows, review) {
	const r = review || {}
	return (rows || []).map(row => (causeOf(row) ? Object.assign({}, row, { review: r[row.name] || '' }) : Object.assign({}, row, { review: '' })))
}

// { pending, reviewed, ignored, maybe }: how many are still to check, how many were looked at, and how many of those left may be a real problem
export function reviewCounts(rows) {
	const list = (rows || []).filter(r => causeOf(r))
	const pending = list.filter(r => !r.review)
	return { pending: pending.length, reviewed: list.filter(r => r.review === 'reviewed').length, ignored: list.filter(r => r.review === 'ignored').length, maybe: pending.filter(r => r.maybe).length }
}

// the rows to check (already filtered by the page) in groups by cause, in the order of CAUSES: [{ cause, rows }] (a group with no row is left out)
export function causeGroups(rows) {
	return CAUSES.map(cause => ({ cause, rows: (rows || []).filter(r => causeOf(r) === cause) })).filter(g => g.rows.length)
}
