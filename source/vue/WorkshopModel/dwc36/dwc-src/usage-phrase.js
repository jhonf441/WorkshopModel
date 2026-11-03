'use strict'

// The one plain sentence under each global of the usage finder ("Read in 28 files, nobody creates it"), in everyday words: created,
// written, read instead of define, set, read. `t` is the translator of the page (a key and its values -> text), so this stays pure and
// the texts live in the catalogs (usage_say_*, usage_part_*, usage_files_*). Pure: test/usage-scope.test.js.

// "1 file" / "28 files"
export function filesWord(t, n) {
	return t(n === 1 ? 'usage_files_one' : 'usage_files_other', { n })
}

const upper = s => s.charAt(0).toUpperCase() + s.slice(1)

// a row of usage-view.js globalRows -> the sentence
export function usagePhrase(t, r) {
	const d = filesWord(t, r.definedIn)
	const w = filesWord(t, r.writtenIn)
	const rd = filesWord(t, r.readIn)
	if (r.problem) return t('usage_say_missing', { files: rd })
	if (r.maybe) return t('usage_say_maybe', { files: rd })
	if (r.hint && r.definedIn) return t('usage_say_nobody_reads', { files: d })
	if (r.hint) return r.writtenIn ? t('usage_say_live_written', { files: w }) : t('usage_say_live')
	const parts = []
	if (r.definedIn) parts.push(t('usage_part_define', { files: d }))
	if (r.writtenIn) parts.push(t('usage_part_set', { files: w }))
	if (r.readIn) parts.push(t('usage_part_read', { files: rd }))
	return upper(parts.join(', '))
}

// the state word of a row: which chip it wears (tone is the wf-state class) or null when all is well
export function usageState(r) {
	if (r.problem) return { tone: 'err', key: 'usage_state_problem' }
	if (r.maybe) return { tone: 'warn', key: 'usage_state_maybe' }
	if (r.hint) return { tone: '', key: 'usage_state_hint' }
	return null
}
