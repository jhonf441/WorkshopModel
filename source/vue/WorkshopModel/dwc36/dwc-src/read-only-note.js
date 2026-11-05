'use strict'

// The sentence that says why the person cannot change things here, told by its cause (owner rule 2026-11-04): signed out ->
// "sign in", low role -> "the technician role is needed (your role: ...)". ModelExplorer provides it (provide/inject, so the
// pieces between it and the note do not pass a prop); a piece used alone falls back to its own generic text.
//
//   mixins: [readOnlyNote]      readOnlyLine(fallbackText)   the cause sentence, else the fallback

export const READ_ONLY_PROVIDE = 'readOnlySentence'

export function readOnlyLineOf(sentence, fallback) {
	return sentence || fallback
}

export const readOnlyNote = {
	inject: { readOnlySentence: { default: () => () => '' } },
	methods: {
		readOnlyLine(fallback) {
			return readOnlyLineOf(this.readOnlySentence(), fallback)
		}
	}
}
