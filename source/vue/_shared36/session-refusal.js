'use strict'

// A refused call told by its cause (ONE copy for every Vue plugin: it used to be session-note.js / session-now.js / refusal-kind.js / refusal-cause.js
// in four plugins). The sentence is the standard one of notice-kind.js (noticeText), never a second set of texts.
// Test: tests/session-refusal.test.js.
//
//   isRefusal(e)                   true when the service refused the call for who the person is: 403 (role) or 401 (no session)
//   refusalKind(e, out)            'session' | 'role' | '' (not a refusal: the page keeps its own error); out = nobody is signed in now
//   refusalText(e, need, who)      the sentence by cause; who = { signedOut, role, t }; '' when e is not a refusal. Pure
//   refusalNow(e, need)            the same with the identity of this moment and the shared texts
//   refusalCauseNow(e)             refusalKind with the identity of this moment
// The kind of the error is its code (friendly-error.js errorKind: 'forbidden' = role, 'login_required' = no session).

import { noticeText } from './notice-kind.js'
import { signedOut, workshopRole } from './workshop-auth.js'
import { ts } from './shared-t.js'

const ROLE = 'forbidden'
const LOGIN = 'login_required'

export function isRefusal(e) {
	const code = e && e.code
	return code === ROLE || code === LOGIN
}

export function refusalKind(e, out) {
	if (!isRefusal(e)) return ''
	// a 401 is always "no session"; a 403 while nobody is signed in too (signing in may fix it)
	return e.code === LOGIN || out ? 'session' : 'role'
}

export function refusalText(e, need, who) {
	const kind = refusalKind(e, who.signedOut)
	return kind ? noticeText(kind, { needed: need, role: who.role }, who.t) : ''
}

export function refusalNow(e, need) {
	return refusalText(e, need || 'technician', { signedOut: signedOut(), role: workshopRole(), t: ts })
}

export function refusalCauseNow(e) {
	return refusalKind(e, signedOut())
}
