'use strict'

// The tokens of an RRF expression, for the type checker (expression-types.js): numbers, texts between double quotes ("" inside
// is one quote), holes <name> where a value belongs, words (a function name, a keyword or a path such as move.axes), members
// (.name right after a closing bracket, which continue a path), the dot before a hole (global.<name>), operators, brackets and
// commas. Whether a value or an operator
// is expected decides what `<` is: at a value position `<name>` is a hole, elsewhere `<` is less-than. A character that cannot be
// in an expression is a 'bad' token (the checker says so); an unterminated text is a string token with open: true. Pure:
// test/expression-guided.test.js.

export const TOKEN_TYPES = ['number', 'string', 'hole', 'word', 'member', 'dot', 'op', 'open', 'close', 'comma', 'bad']
// longest first, so == and <= are read before = and <
export const OPERATORS = ['==', '!=', '<=', '>=', '&&', '||', '=', '<', '>', '+', '-', '*', '/', '^', '!', '#', '?', ':']
export const CLOSER_OF = { '(': ')', '[': ']', '{': '}' }

const NUMBER_RE = /^(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?/
const WORD_RE = /^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)*/
const HOLE_RE = /^<[a-z_]+>/
const MEMBER_RE = /^\.[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)*/

function token(type, text, start, extra) {
	return Object.assign({ type, text, start, end: start + text.length }, extra || {})
}

// "a""b" -> the text a"b and where it ends; open when the closing quote is missing
function readString(s, i) {
	let j = i + 1
	let value = ''
	while (j < s.length) {
		if (s[j] === '"') {
			if (s[j + 1] === '"') {
				value += '"'
				j += 2
				continue
			}
			return { text: s.slice(i, j + 1), value, open: false }
		}
		value += s[j]
		j++
	}
	return { text: s.slice(i), value, open: true }
}

// -> [{ type, text, start, end, value?, name?, open? }]
export function tokenize(text) {
	const s = String(text === null || text === undefined ? '' : text)
	const out = []
	let expectValue = true
	let i = 0
	while (i < s.length) {
		const c = s[i]
		if (/\s/.test(c)) {
			i++
			continue
		}
		const rest = s.slice(i)
		let tk = null
		if (c === '"') {
			const r = readString(s, i)
			tk = token('string', r.text, i, { value: r.value, open: r.open })
		} else if (c === '.' && out.length && out[out.length - 1].type === 'close' && out[out.length - 1].text === ']' && MEMBER_RE.test(rest) && out[out.length - 1].end === i) {
			tk = token('member', MEMBER_RE.exec(rest)[0], i)
		} else if (c === '.' && /^\.<[a-z_]+>/.test(rest)) {
			tk = token('dot', c, i)
		} else if (NUMBER_RE.test(rest)) {
			const m = NUMBER_RE.exec(rest)[0]
			tk = token('number', m, i, { value: Number(m) })
		} else if (expectValue && HOLE_RE.test(rest)) {
			const m = HOLE_RE.exec(rest)[0]
			tk = token('hole', m, i, { name: m.slice(1, -1) })
		} else if (WORD_RE.test(rest)) {
			tk = token('word', WORD_RE.exec(rest)[0], i)
		} else if (c === '(' || c === '[' || c === '{') {
			tk = token('open', c, i)
		} else if (c === ')' || c === ']' || c === '}') {
			tk = token('close', c, i)
		} else if (c === ',') {
			tk = token('comma', c, i)
		} else {
			const op = OPERATORS.find(o => rest.startsWith(o))
			tk = op ? token('op', op, i) : token('bad', c, i)
		}
		out.push(tk)
		i = tk.end
		expectValue = tk.type === 'op' || tk.type === 'open' || tk.type === 'comma' || tk.type === 'bad' || tk.type === 'dot'
	}
	return out
}
