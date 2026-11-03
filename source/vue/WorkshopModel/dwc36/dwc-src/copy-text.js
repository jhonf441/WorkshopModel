'use strict'

// Copies a text to the clipboard: the async clipboard when the page is allowed to use it, else a hidden text area. Resolves true
// when it worked (the kiosk and plain http pages have no navigator.clipboard).

export function copyText(text) {
	const s = String(text === null || text === undefined ? '' : text)
	if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
		return navigator.clipboard.writeText(s).then(() => true, () => fallback(s))
	}
	return Promise.resolve(fallback(s))
}

function fallback(s) {
	if (typeof document === 'undefined' || !document.body) return false
	const ta = document.createElement('textarea')
	ta.value = s
	ta.setAttribute('readonly', '')
	ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;'
	document.body.appendChild(ta)
	ta.select()
	let ok = false
	try {
		ok = document.execCommand('copy')
	} catch (e) {
		ok = false
	}
	document.body.removeChild(ta)
	return ok
}
