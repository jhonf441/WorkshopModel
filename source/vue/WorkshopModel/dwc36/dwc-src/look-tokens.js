'use strict'

// ONE mapping of a meaning to its colour for the Model Explorer (DESIGN.md section 2: one colour per meaning). The CSS tokens are declared
// once in look.css on the page root (the detail dialog carries the same classes, so it has them too); the pieces that paint with an inline
// style (the watch bands and their legend boxes) take the colour from here, and the chips of usage, the legend dots, the selected row and
// the marks of the file viewer use the same tokens by class (k-define, k-set, k-read). Nothing else in the plugin names a colour for these
// meanings. 3.6 line only. Pure: test/look-tokens.test.js.

// how a file touches a global: created (green, the "good / new" colour), written (amber, "attention: it changes a value"), read (blue, "information")
export const USAGE_KINDS = ['define', 'set', 'read']
export const USAGE_KIND_COLORS = { define: 'var(--mo-k-define)', set: 'var(--mo-k-set)', read: 'var(--mo-k-read)' }

// a boolean: on is "good / on" (success), off is neutral (DESIGN.md section 2: "Neutral / off / disabled")
export const BOOL_COLORS = { on: 'var(--mo-on)', off: 'var(--mo-off)' }

// the CSS tokens look.css must declare on the page root
export const TOKENS = ['--mo-k-define', '--mo-k-set', '--mo-k-read', '--mo-on', '--mo-off']

// the class of a kind of use ('' for an unknown kind, so nothing is painted by mistake)
export function usageKindClass(kind) {
	return USAGE_KINDS.indexOf(kind) >= 0 ? 'k-' + kind : ''
}

export function usageKindColor(kind) {
	return USAGE_KIND_COLORS[kind] || ''
}

export function boolColor(on) {
	return on ? BOOL_COLORS.on : BOOL_COLORS.off
}

// every graph of the watch list has the same box: the sparkline of a number, the bands of a text and the on / off line of a boolean
export const WATCH_GRAPH = { width: 160, height: 28 }
