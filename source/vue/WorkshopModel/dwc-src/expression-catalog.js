'use strict'

// What an RRF expression can do, as a catalog the builder searches and inserts from. Every entry has a group, a template with
// placeholders written <name> (expression-insert.js selects the first one after inserting), a worked example and the first
// RepRapFirmware version that has it (`since`; the board's version, read with rrf-version.js, decides what is offered). `use` is
// 'expression' (goes into the field) or 'gcode' (a line of a macro: shown and copied, never inserted, because the tester sends
// `echo <expression>`). Every placeholder of a template has a kind (`holes`, one of HOLE_KINDS: what the hole assistant of
// expression-holes.js asks for), the entry says what it gives (`returns`, a type of expression-types.js) and whether it is a path
// of the model (`path`, so it fits where exists() wants one). FUNCTIONS is the table the type checker uses: the arguments every
// function takes and what it returns. The explanation of an entry is the text key expr_<id>; the name of a group is exg_<group>.
// Pure: test/expression-builder.test.js, test/expression-guided.test.js.

import { compareVersions, parseVersion } from './rrf-version.js'

export const CATALOG_GROUPS = ['operators', 'strings', 'math', 'trig', 'collections', 'values', 'model', 'gcode']
// what a hole asks for (texts guided_hole_<kind> and guided_hole_<kind>_how)
export const HOLE_KINDS = ['number', 'angle', 'text', 'file', 'bool', 'value', 'path', 'array', 'index', 'axis', 'heater', 'tool', 'fan', 'global', 'name', 'letter']
export const RETURN_TYPES = ['number', 'string', 'bool', 'array', 'null', 'any']
const HOLE_RE = /<([a-z_]+)>/g

// the placeholders of a template with their kind: spec is one kind for all of them or { name: kind }
function typedHoles(template, spec) {
	const out = {}
	for (const m of template.matchAll(HOLE_RE)) out[m[1]] = typeof spec === 'string' ? spec : (spec && spec[m[1]]) || 'value'
	return out
}

function entry(group, id, template, example, o) {
	const opt = o || {}
	return { id, group, template, example, since: opt.since || '3.0', use: opt.use || 'expression', holes: typedHoles(template, opt.holes), returns: opt.returns || 'any', path: !!opt.path }
}

export const CATALOG = [
	entry('operators', 'plus', '<a> + <b>', 'move.axes[0].machinePosition + 1', { holes: 'number', returns: 'number' }),
	entry('operators', 'minus', '<a> - <b>', 'state.upTime - 60', { holes: 'number', returns: 'number' }),
	entry('operators', 'times', '<a> * <b>', 'heat.heaters[0].current * 2', { holes: 'number', returns: 'number' }),
	entry('operators', 'divide', '<a> / <b>', 'state.upTime / 3600', { holes: 'number', returns: 'number' }),
	entry('operators', 'equal', '<a> = <b>', 'state.status = "idle"', { holes: 'value', returns: 'bool' }),
	entry('operators', 'not_equal', '<a> != <b>', 'state.status != "off"', { holes: 'value', returns: 'bool' }),
	entry('operators', 'compare', '<a> >= <b>', 'heat.heaters[0].current >= 50', { holes: 'number', returns: 'bool' }),
	entry('operators', 'and', '<a> && <b>', 'move.axes[0].homed && move.axes[1].homed', { holes: 'bool', returns: 'bool' }),
	entry('operators', 'or', '<a> || <b>', 'state.status = "idle" || state.status = "paused"', { holes: 'bool', returns: 'bool' }),
	entry('operators', 'not', '!<a>', '!move.axes[0].homed', { holes: 'bool', returns: 'bool' }),
	entry('operators', 'ternary', '<condition> ? <then> : <else>', 'heat.heaters[0].current > 50 ? "hot" : "cold"', { holes: { condition: 'bool', then: 'value', else: 'value' } }),
	entry('operators', 'parens', '(<a> + <b>) * <c>', '(move.axes[0].min + move.axes[0].max) / 2', { holes: 'number', returns: 'number' }),
	entry('strings', 'concat', '<a> ^ <b>', '"Layer " ^ job.layer', { holes: 'value', returns: 'string' }),
	entry('strings', 'text', '"<text>"', '"processing"', { holes: 'text', returns: 'string' }),
	entry('math', 'abs', 'abs(<x>)', 'abs(move.axes[0].machinePosition - 100)', { holes: 'number', returns: 'number' }),
	entry('math', 'floor', 'floor(<x>)', 'floor(state.upTime / 60)', { holes: 'number', returns: 'number' }),
	entry('math', 'ceil', 'ceil(<x>)', 'ceil(job.duration / 60)', { since: '3.5', holes: 'number', returns: 'number' }),
	entry('math', 'round', 'floor(<x> * 10 + 0.5) / 10', 'floor(heat.heaters[0].current * 10 + 0.5) / 10', { holes: 'number', returns: 'number' }),
	entry('math', 'sqrt', 'sqrt(<x>)', 'sqrt(move.axes[0].machinePosition * move.axes[0].machinePosition)', { holes: 'number', returns: 'number' }),
	entry('math', 'min', 'min(<a>, <b>)', 'min(heat.heaters[0].current, heat.heaters[1].current)', { holes: 'number', returns: 'number' }),
	entry('math', 'max', 'max(<a>, <b>)', 'max(heat.heaters[0].current, heat.heaters[1].current)', { holes: 'number', returns: 'number' }),
	entry('math', 'mod', 'mod(<a>, <b>)', 'mod(state.upTime, 60)', { since: '3.3', holes: 'number', returns: 'number' }),
	entry('math', 'fmod', 'fmod(<a>, <b>)', 'fmod(move.axes[0].machinePosition, 2.5)', { since: '3.5', holes: 'number', returns: 'number' }),
	entry('math', 'random', 'random(<n>)', 'random(10)', { holes: 'number', returns: 'number' }),
	entry('math', 'isnan', 'isnan(<x>)', 'isnan(heat.heaters[0].current)', { since: '3.3', holes: 'number', returns: 'bool' }),
	entry('trig', 'sin', 'sin(<angle>)', 'sin(radians(30))', { holes: 'angle', returns: 'number' }),
	entry('trig', 'cos', 'cos(<angle>)', 'cos(radians(60))', { holes: 'angle', returns: 'number' }),
	entry('trig', 'tan', 'tan(<angle>)', 'tan(radians(45))', { holes: 'angle', returns: 'number' }),
	entry('trig', 'asin', 'asin(<x>)', 'degrees(asin(0.5))', { holes: 'number', returns: 'number' }),
	entry('trig', 'acos', 'acos(<x>)', 'degrees(acos(0.5))', { holes: 'number', returns: 'number' }),
	entry('trig', 'atan', 'atan(<x>)', 'degrees(atan(1))', { holes: 'number', returns: 'number' }),
	entry('trig', 'atan2', 'atan2(<y>, <x>)', 'degrees(atan2(1, 1))', { holes: 'number', returns: 'number' }),
	entry('trig', 'sinh', 'sinh(<x>)', 'sinh(1)', { holes: 'number', returns: 'number' }),
	entry('trig', 'cosh', 'cosh(<x>)', 'cosh(1)', { holes: 'number', returns: 'number' }),
	entry('trig', 'tanh', 'tanh(<x>)', 'tanh(1)', { holes: 'number', returns: 'number' }),
	entry('trig', 'degrees', 'degrees(<radians>)', 'degrees(pi)', { holes: 'number', returns: 'number' }),
	entry('trig', 'radians', 'radians(<degrees>)', 'radians(180)', { holes: 'number', returns: 'number' }),
	entry('collections', 'size', '#<array>', '#move.axes', { holes: 'array', returns: 'number' }),
	entry('collections', 'index', '<array>[<n>]', 'move.axes[0].letter', { holes: { array: 'array', n: 'index' } }),
	entry('collections', 'exists', 'exists(<path>)', 'exists(global.myCounter)', { since: '3.2', holes: 'path', returns: 'bool' }),
	entry('collections', 'exists_default', 'exists(<path>) ? <path> : <default>', 'exists(global.myCounter) ? global.myCounter : 0', { since: '3.2', holes: { path: 'path', default: 'value' } }),
	entry('collections', 'vector', 'vector(<n>, <value>)', 'vector(3, 0)', { since: '3.5', holes: { n: 'number', value: 'value' }, returns: 'array' }),
	entry('collections', 'fileexists', 'fileexists("<file>")', 'fileexists("0:/sys/config-override.g")', { since: '3.5', holes: 'file', returns: 'bool' }),
	entry('values', 'null', 'null', 'job.file.fileName = null', { returns: 'null' }),
	entry('values', 'true', 'true', 'move.axes[0].homed = true', { returns: 'bool' }),
	entry('values', 'false', 'false', 'move.axes[0].homed = false', { returns: 'bool' }),
	entry('values', 'pi', 'pi', 'pi * 2', { returns: 'number' }),
	entry('values', 'iterations', 'iterations', 'iterations + 1', { returns: 'number' }),
	entry('values', 'result', 'result', 'result = 0', { since: '3.1', returns: 'number' }),
	entry('values', 'param', 'param.<letter>', 'param.S * 2', { holes: 'letter', path: true }),
	entry('values', 'global', 'global.<name>', 'global.myCounter', { since: '3.2', holes: 'global', path: true }),
	entry('values', 'var', 'var.<name>', 'var.count + 1', { since: '3.2', holes: 'name', path: true }),
	entry('model', 'path', '<path>', 'state.status', { holes: 'path', path: true }),
	entry('model', 'axis', 'move.axes[<n>].machinePosition', 'move.axes[0].machinePosition', { holes: 'axis', returns: 'number', path: true }),
	entry('model', 'heater', 'heat.heaters[<n>].current', 'heat.heaters[0].current', { holes: 'heater', returns: 'number', path: true }),
	entry('model', 'tool', 'tools[<n>].active[0]', 'tools[0].active[0]', { holes: 'tool', returns: 'number', path: true }),
	entry('model', 'job', 'job.layer', 'job.layer', { returns: 'number', path: true }),
	entry('gcode', 'braces', 'G1 X{<expression>} F3000', 'G1 X{move.axes[0].min + 5} F3000', { use: 'gcode', holes: 'value' }),
	entry('gcode', 'set', 'set global.<name> = <expression>', 'set global.myCounter = global.myCounter + 1', { since: '3.2', use: 'gcode', holes: { name: 'global', expression: 'value' } }),
	entry('gcode', 'if', 'if <condition>', 'if heat.heaters[0].current > 50', { use: 'gcode', holes: 'bool' })
]

// the functions of RRF expressions: the type of each argument ('path' is a name such as global.x, not a value), whether more
// arguments of the last type may follow, and what the function gives. `since` comes from the catalog entry of the same id.
function fn(args, returns, more) {
	return { args, returns, more: !!more }
}
const NUMBER_FN = fn(['number'], 'number')
export const FUNCTIONS = {
	abs: NUMBER_FN, floor: NUMBER_FN, ceil: NUMBER_FN, sqrt: NUMBER_FN,
	sin: NUMBER_FN, cos: NUMBER_FN, tan: NUMBER_FN, asin: NUMBER_FN, acos: NUMBER_FN, atan: NUMBER_FN,
	sinh: NUMBER_FN, cosh: NUMBER_FN, tanh: NUMBER_FN, degrees: NUMBER_FN, radians: NUMBER_FN,
	atan2: fn(['number', 'number'], 'number'),
	min: fn(['number', 'number'], 'number', true),
	max: fn(['number', 'number'], 'number', true),
	mod: fn(['number', 'number'], 'number'),
	fmod: fn(['number', 'number'], 'number'),
	random: NUMBER_FN,
	isnan: fn(['number'], 'bool'),
	exists: fn(['path'], 'bool'),
	vector: fn(['number', 'any'], 'array'),
	fileexists: fn(['string'], 'bool')
}

// -> { args, returns, more, since } or null for a name the catalog does not have
export function functionInfo(name) {
	const f = FUNCTIONS[name]
	if (!f) return null
	const c = CATALOG.find(x => x.id === name)
	return Object.assign({ since: c ? c.since : '3.0' }, f)
}

// the newest firmware version the catalog knows anything about ('3.5' today)
export function catalogNewestSince() {
	let best = '3.0'
	for (const x of CATALOG) if (compareVersions(x.since, best) > 0) best = x.since
	return best
}

// true when the board runs a firmware NEWER (major.minor) than anything the catalog knows: a name the catalog lacks may exist there,
// so the checker must not call it unknown. A version the board has not said yet counts as unknown, not as newer.
export function beyondCatalog(firmware) {
	const v = parseVersion(firmware)
	if (!v) return false
	const newest = parseVersion(catalogNewestSince())
	return compareVersions([v[0], v[1], 0], [newest[0], newest[1], 0]) > 0
}

// -> { state: 'ok' | 'newer' | 'unknown', since } for a board version (null while the board has not said it)
export function supportOf(item, firmware) {
	if (!parseVersion(firmware)) return { state: 'unknown', since: item.since }
	return { state: compareVersions(firmware, item.since) >= 0 ? 'ok' : 'newer', since: item.since }
}

function matches(item, q) {
	return (item.id + ' ' + item.template + ' ' + item.example + ' ' + item.group).toLowerCase().indexOf(q) >= 0
}

// the entries to show. opts: { group, query, firmware, showNewer, text } where text(id) gives the explanation (searched too).
// -> [{ entry, support }] in catalog order; entries the firmware lacks only with showNewer
export function catalogFor(opts) {
	const o = opts || {}
	const q = String(o.query || '').trim().toLowerCase()
	const out = []
	for (const item of CATALOG) {
		if (o.group && o.group !== 'all' && item.group !== o.group) continue
		const said = typeof o.text === 'function' ? String(o.text(item.id) || '').toLowerCase() : ''
		if (q && !matches(item, q) && said.indexOf(q) < 0) continue
		const support = supportOf(item, o.firmware)
		if (support.state === 'newer' && !o.showNewer) continue
		out.push({ entry: item, support })
	}
	return out
}

// how many entries this firmware lacks (the count the panel says is hidden)
export function lackedCount(firmware) {
	return CATALOG.filter(x => supportOf(x, firmware).state === 'newer').length
}
