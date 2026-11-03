'use strict'

// A jump inside the Model Explorer (a topic that opens another part of the model, "open in the tree" from another section) must show
// where it went: the person is often far down the page, so after the jump the top of the plugin page is brought into view. The DWC
// bar covers the first pixels of the page, so the page has `scroll-margin-top` in its CSS. Pure but for the document it is given.
export const PAGE_SELECTOR = '.mo-page'

// -> true when the page was found and scrolled
export function scrollToPageTop(doc) {
	const d = doc || (typeof document !== 'undefined' ? document : null)
	if (!d || typeof d.querySelector !== 'function') return false
	const page = d.querySelector(PAGE_SELECTOR)
	if (!page || typeof page.scrollIntoView !== 'function') return false
	page.scrollIntoView({ block: 'start', behavior: 'smooth' })
	return true
}
