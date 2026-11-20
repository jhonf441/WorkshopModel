'use strict'

// What the machine API says when a file or folder is not there (3.6 line). DWC reports it as a FileNotFound error, as a 404, or only as a message
// such as "Network error: Directory 0:/sys/x not found" (a folder that the listing of its parent still named but is gone). Pure: test/usage-skip.test.js.

export function isMissing(e) {
	const names = e ? String((e.constructor && e.constructor.name) || '') + ' ' + String(e.name || '') : ''
	return /FileNotFound/i.test(names) || (e && e.status === 404) || /(directory|file|folder)\b.*\bnot found/i.test(String((e && e.message) || ''))
}

// The machine reached by the usage finder, made tolerant (3.6 line): a folder the listing named but the board cannot open (deleted since, or a name it
// refuses) lists as empty, and a file it cannot read reads as nothing, so ONE bad folder never ends the whole read; `onSkip(kind, path, error)` is told so
// the page can count it. The shared runner (usage-runner.js) stays as the 3.7 line has it.
export function tolerantIo(io, onSkip) {
	const skip = (kind, path, e) => { if (typeof onSkip === 'function') onSkip(kind, path, e) }
	return {
		async listDir(dir) {
			try {
				return await io.listDir(dir)
			} catch (e) {
				skip('folder', dir, e)
				return []
			}
		},
		async readText(path) {
			try {
				return await io.readText(path)
			} catch (e) {
				skip('file', path, e)
				return null
			}
		}
	}
}
