'use strict'

// The ONE help of a card of the Model Explorer (FAMILIA-REDISENO.md 3, redesign of 2026-11-23): the sentence that used to sit under the title of
// the card (the "lead") and the guides spread over it become one fold at its foot (<help-fold>, vue/_shared36): the lead is its "what it is" and
// every choice object of the card is a block with its own title. DWC 3.6 line only (smoke.test.js ONLY_36_MODULES). Pure: test/section-help.test.js.

// a choice object of the plugin ({ label, what, why, ifMissing, help }: keys of the catalog) -> one block of <help-fold :items>; `title` replaces the
// label as the heading of the block. The fold leaves the empty rows out.
export function choiceItem(t, choice, title) {
	if (!choice) return null
	const tx = k => (k ? t(k) : '')
	return { title: title !== undefined ? title : tx(choice.label), what: tx(choice.what), why: tx(choice.why), ifMissing: tx(choice.ifMissing), how: tx(choice.help) }
}

// the blocks of a card, in order: each entry is a choice object or [choice, title]; the missing ones are left out
export function helpItems(t, entries) {
	return (entries || []).map(e => (Array.isArray(e) ? choiceItem(t, e[0], e[1]) : choiceItem(t, e))).filter(Boolean)
}
