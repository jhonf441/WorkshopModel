'use strict'

// Search by value in the flat list: the other half of the search box. A name search looks at paths; this one looks at what the
// value is. What the person types is read as:
//   30 or err         contains (case-insensitive, on the text of the value)
//   "idle" or =idle   equals (a text, or a number when it reads as one)
//   !=0               is not equal (numbers, or any other text)
//   >30 >=30 <5 <=5   number comparison (only numbers are compared)
//   10..20            a number between two limits, both included
//   true false        a boolean
//   null              nothing (the value is null)
//   empty             an empty text, array or object
// Pure: test/value-search.test.js.

export const VALUE_MODES = ['names', 'values']

// the help of the mode switch (DESIGN.md section 7): texts vs_help_*
export const VALUE_SEARCH_HELP = { id: 'value_search', label: 'vs_title', what: 'vs_help_what', why: 'vs_help_why', ifMissing: 'vs_help_missing', help: 'vs_help_how' }

const KEYWORDS = { null: 'null', empty: 'empty', true: 'true', false: 'false' }
const NUMBER_RE = /^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i
const OPERATOR_RE = /^(>=|<=|!=|==|=|>|<)\s*(.*)$/
const RANGE_RE = /^([-+]?[\d.]+)\s*\.\.\s*([-+]?[\d.]+)$/

const asNumber = text => (NUMBER_RE.test(text) ? Number(text) : null)
const unquote = text => (text.length >= 2 && text.charAt(0) === '"' && text.charAt(text.length - 1) === '"' ? text.slice(1, -1) : null)

function comparison(op, rhs) {
	const n = asNumber(rhs)
	if (op === '==' || op === '=') return n === null ? { kind: 'equals', text: rhs.toLowerCase(), raw: rhs } : { kind: 'number', op: '=', n }
	if (op === '!=') return n === null ? { kind: 'not_equals', text: rhs.toLowerCase(), raw: rhs } : { kind: 'number', op: '!=', n }
	return n === null ? { kind: 'invalid', raw: op + rhs } : { kind: 'number', op, n }
}

// the text typed -> a query { kind, ... } or null when it is empty. kinds: contains, equals, not_equals, number, range, bool, null,
// empty, invalid (an operator without a number, for instance ">abc")
export function parseValueQuery(text) {
	const s = String(text === null || text === undefined ? '' : text).trim()
	if (!s) return null
	const word = KEYWORDS[s.toLowerCase()]
	if (word === 'true' || word === 'false') return { kind: 'bool', value: word === 'true' }
	if (word) return { kind: word }
	const quoted = unquote(s)
	if (quoted !== null) return { kind: 'equals', text: quoted.toLowerCase(), raw: quoted }
	const range = RANGE_RE.exec(s)
	if (range && isFinite(Number(range[1])) && isFinite(Number(range[2]))) return { kind: 'range', from: Math.min(Number(range[1]), Number(range[2])), to: Math.max(Number(range[1]), Number(range[2])) }
	const op = OPERATOR_RE.exec(s)
	if (op) return op[2].trim() === '' ? { kind: 'invalid', raw: s } : comparison(op[1], op[2].trim())
	return { kind: 'contains', text: s.toLowerCase(), raw: s }
}

const isNumberLeaf = l => l.kind === 'int' || l.kind === 'float'
const COMPARE = { '>': (a, b) => a > b, '>=': (a, b) => a >= b, '<': (a, b) => a < b, '<=': (a, b) => a <= b, '=': (a, b) => a === b, '!=': (a, b) => a !== b }

// the text a value equals: its string, else its one-line text
function plainText(l) {
	return (typeof l.value === 'string' ? l.value : String(l.text)).toLowerCase()
}

const TESTS = {
	contains: (q, l) => String(l.text).toLowerCase().indexOf(q.text) >= 0 || (typeof l.value === 'string' && l.value.toLowerCase().indexOf(q.text) >= 0),
	equals: (q, l) => plainText(l) === q.text,
	not_equals: (q, l) => plainText(l) !== q.text,
	number: (q, l) => isNumberLeaf(l) && COMPARE[q.op](l.value, q.n),
	range: (q, l) => isNumberLeaf(l) && l.value >= q.from && l.value <= q.to,
	bool: (q, l) => l.kind === 'bool' && l.value === q.value,
	null: (q, l) => l.kind === 'null',
	empty: (q, l) => l.kind === 'array' || l.kind === 'object' || (l.kind === 'string' && l.value === ''),
	invalid: () => false
}

// does one leaf { kind, text, value } satisfy the query?
export function matchValue(leaf, query) {
	if (!query) return true
	return TESTS[query.kind](query, leaf)
}

// leaves + the text typed -> { leaves, query } (every leaf when the text is empty; none when the query is invalid)
export function searchValues(leaves, text) {
	const query = parseValueQuery(text)
	const list = leaves || []
	return { leaves: query ? list.filter(l => matchValue(l, query)) : list, query }
}

// the query in words for the line under the box: { key, params } of the catalogs (vs_read_<kind>)
export function describeQuery(query) {
	if (!query) return null
	const params = { text: query.raw === undefined ? '' : query.raw, op: query.op || '', n: query.n === undefined ? '' : query.n, from: query.from === undefined ? '' : query.from, to: query.to === undefined ? '' : query.to }
	if (query.kind === 'number') return { key: 'vs_read_number_' + { '>': 'gt', '>=': 'ge', '<': 'lt', '<=': 'le', '=': 'eq', '!=': 'ne' }[query.op], params }
	if (query.kind === 'bool') return { key: 'vs_read_' + String(query.value), params }
	return { key: 'vs_read_' + query.kind, params }
}
