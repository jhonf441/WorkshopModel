'use strict'

// The file of the SBC tier (tier.js WATCH_FILE, only written when the board runs with DSF): the watch list with its samples and changes
// (watch-series.js) and the memory of the usage finder (usage-runner.js cache), in one JSON object. A standalone Duet never gets it.
// Pure: test/usage-scope.test.js.

import { serializeWatch, parseWatch } from './watch-series.js'
import { cacheToJson, cacheFromJson } from './usage-runner.js'

export function watchFileText(entries, usageCache, now) {
	return JSON.stringify(Object.assign(serializeWatch(entries, now), { usage: cacheToJson(usageCache) }))
}

// -> { entries, usageCache (Map) }; a damaged file gives nothing
export function readWatchFile(text) {
	let o = null
	try {
		o = JSON.parse(String(text || ''))
	} catch (e) {
		o = null
	}
	return { entries: parseWatch(o), usageCache: cacheFromJson(o && o.usage) }
}
