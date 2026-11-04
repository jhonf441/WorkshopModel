<template>
	<div class="mo-watch-events">
		<div v-if="!rows.length" class="mo-faint">{{ t('watch_ev_none') }}</div>
		<div v-else class="mo-chg-tools">
			<v-switch :input-value="fold" dense color="primary" hide-details :label="t(foldChoice.label)" :title="t(foldChoice.what)" @change="fold = !!$event" />
			<choice-help :choice="foldChoice" :title="t(foldChoice.label)" />
		</div>
		<table v-if="rows.length" class="mo-table">
			<thead><tr><th>{{ t('when') }}</th><th>{{ t('before') }}</th><th>{{ t('after') }}</th><th>{{ t('watch_ev_lasted') }}</th></tr></thead>
			<tbody>
				<tr v-for="r in rows" :key="r.t">
					<td class="mo-value">{{ r.clock }}</td>
					<td class="mo-value"><span v-if="cell(r.before) !== 'value'" class="mo-chg-faint" :title="t('chg_empty_tip')">{{ t(cell(r.before) === 'none' ? 'chg_none' : 'chg_empty') }}</span><template v-else>{{ r.before }}</template></td>
					<td class="mo-value">
						<span v-if="cell(r.after) !== 'value'" class="mo-chg-faint" :title="t('chg_empty_tip')">{{ t(cell(r.after) === 'none' ? 'chg_none' : 'chg_empty') }}</span><template v-else>{{ r.after }}</template>
						<span v-if="r.viaEmpty" class="mo-chg-via" :title="t('chg_via_empty_tip', { time: r.emptyText })">{{ t('chg_via_empty') }}</span>
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
import ChoiceHelp from './ChoiceHelp.vue'
import { eventTable, foldEmptyPairs, cellKind, FOLD_CHOICE } from './watch-events.js'
import { humanDuration } from './value-human.js'

const SHOWN = 50

function clock(ts) {
	const d = new Date(ts)
	const p = n => String(n).padStart(2, '0')
	return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds())
}

export default {
	components: { ChoiceHelp },
	props: {
		events: { type: Array, default: () => [] },
		tick: { type: Number, default: 0 }
	},
	data() {
		return { fold: true, foldChoice: FOLD_CHOICE }
	},
	computed: {
		rows() {
			void this.tick
			const all = eventTable(this.events)
			return (this.fold ? foldEmptyPairs(all) : all).slice(0, SHOWN).map(r => {
				const d = r.lasted === null ? null : humanDuration(r.lasted / 1000)
				const e = r.viaEmpty ? humanDuration(r.emptyMs / 1000) : null
				return Object.assign({}, r, { clock: clock(r.t), lasted: d ? this.t(d.key, d.params) : '-', emptyText: e ? this.t(e.key, e.params) : '' })
			})
		}
	},
	methods: {
		cell: cellKind,
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		}
	}
}
</script>

<style>
/* a real empty text is not missing data: the empty / none words and the "via empty" marker are faint */
.mo-page .mo-chg-tools { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 4px; }
.mo-page .mo-chg-faint { color: var(--tp-faint); font-style: italic; }
.mo-page .mo-chg-via { margin-left: 6px; color: var(--tp-faint); font-size: 11px; }
</style>
