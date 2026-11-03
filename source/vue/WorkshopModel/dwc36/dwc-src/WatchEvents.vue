<template>
	<div class="mo-watch-events">
		<div v-if="!rows.length" class="mo-faint">{{ t('watch_ev_none') }}</div>
		<table v-else class="mo-table">
			<thead><tr><th>{{ t('when') }}</th><th>{{ t('before') }}</th><th>{{ t('after') }}</th><th>{{ t('watch_ev_lasted') }}</th></tr></thead>
			<tbody>
				<tr v-for="r in rows" :key="r.t">
					<td class="mo-value">{{ r.clock }}</td>
					<td class="mo-value">{{ r.before === null ? '-' : r.before }}</td>
					<td class="mo-value">
						{{ r.after }}
						<ul v-if="r.changes.length" class="mo-list">
							<li v-for="(c, i) in r.changes" :key="i">{{ t('watch_inner_change', { state: t('diff_' + c.state), path: c.path, before: c.before === null ? '-' : c.before, after: c.after === null ? '-' : c.after }) }}</li>
							<li v-if="r.more" class="mo-faint">{{ t('watch_ev_inner_more', { n: r.more }) }}</li>
						</ul>
					</td>
					<td class="mo-value">{{ r.lasted }}</td>
				</tr>
			</tbody>
		</table>
	</div>
</template>

<script>
'use strict'

// The changes of one watched path, for every kind of value (watch-events.js eventTable): the time, the value before, the value after
// and how long the value before lasted; for an array or an object, what changed inside it (added, removed, changed).
import i18n from '../../i18n'
import { eventTable } from './watch-events.js'
import { humanDuration } from './value-human.js'

const SHOWN = 50

function clock(ts) {
	const d = new Date(ts)
	const p = n => String(n).padStart(2, '0')
	return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds())
}

export default {
	props: {
		events: { type: Array, default: () => [] },
		tick: { type: Number, default: 0 }
	},
	computed: {
		rows() {
			void this.tick
			return eventTable(this.events).slice(0, SHOWN).map(r => {
				const d = r.lasted === null ? null : humanDuration(r.lasted / 1000)
				return Object.assign({}, r, { clock: clock(r.t), lasted: d ? this.t(d.key, d.params) : '-' })
			})
		}
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		}
	}
}
</script>
