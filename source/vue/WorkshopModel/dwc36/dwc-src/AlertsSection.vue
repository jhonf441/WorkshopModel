<template>
	<div class="mo-alerts">
		<!-- redesign 2026-11-23 (FAMILIA-REDISENO.md 3): ONE card (it was a card with only the title and the tabs, then a card per block): the head of the
		     family with the count as its state and New rule as the one main action, the tabs, the rules and the events as a group of the same card; the
		     settings as rows of 48 with their switch; ONE help at the foot (the lead, what alerts do, the help of each setting) -->
		<div class="wf-group mb-3">
				<card-head icon="mdi-bell-outline" :title="t('alerts_title')" :state="monitor.rules.length ? countText : ''" :state-kind="rules.some(r => r.firing) ? 'err' : 'ok'">
					<v-btn v-if="tab === 'rules'" small depressed color="primary" :disabled="full" :title="full ? t('alerts2_full', { n: RULES_MAX }) : ''" @click="startAdd"><v-icon small left>mdi-plus</v-icon>{{ t('alerts2_new') }}</v-btn>
				</card-head>
				<div class="wf-tabs mo-alert-tabs" role="tablist" :aria-label="t('alerts2_tabs_label')">
					<button v-for="(tb, i) in tabs" :key="tb.id" type="button" class="wf-tab" role="tab" :aria-selected="tb.id === tab ? 'true' : 'false'" :tabindex="tb.id === tab ? 0 : -1" @click="tab = tb.id" @keydown.right.prevent="stepTab(i, 1)" @keydown.left.prevent="stepTab(i, -1)">
						<v-icon :size="16">{{ tb.icon }}</v-icon>{{ tb.text }}
					</button>
				</div>

				<div v-if="tab === 'rules'" class="mo-alert-body">
					<div v-if="adding" class="mo-rule-edit">
						<div class="mo-part">{{ t('alerts_add_title') }}</div>
						<alert-rule-form :watched="watched" :tick="tick" @save="add" @cancel="adding = false" />
					</div>
					<div v-if="added" class="mo-note ok mb-2" role="status"><v-icon small>mdi-check-circle-outline</v-icon><span class="mo-note-text">{{ added }}</span></div>
					<div v-if="!monitor.rules.length && !adding" class="mo-empty mo-empty-small"><v-icon class="mo-empty-icon">mdi-bell-plus-outline</v-icon><div class="mo-empty-text">{{ t('alerts_none') }}</div></div>
					<table v-if="monitor.rules.length" class="mo-table mo-alert-rules">
						<tbody>
							<template v-for="r in rules">
								<tr :key="r.id">
									<td class="mo-alert-switch"><v-switch :input-value="r.enabled" dense color="primary" hide-details :aria-label="t('alerts_on')" @change="toggle(r.id, !!$event)" /></td>
									<td class="mo-key mo-alert-name">
										<div class="mo-alert-title">{{ r.title }}</div>
										<div v-if="r.alias" class="mo-alert-path">{{ r.path }}</div>
										<div class="mo-faint">{{ r.condition }} {{ r.detail }}</div>
									</td>
									<td class="mo-alert-state"><span class="wf-state" :class="r.tone">{{ r.stateText }}</span><div class="mo-faint">{{ r.lastText }}</div></td>
									<td class="mo-row-actions">
										<v-btn small outlined :aria-label="t('alerts2_edit') + ': ' + r.title" @click="startEdit(r.id)"><v-icon small left>mdi-pencil-outline</v-icon>{{ t('alerts2_edit') }}</v-btn>
										<v-btn small text :title="t('alerts_remove')" :aria-label="t('alerts_remove') + ': ' + r.title" @click="remove(r.id)"><v-icon small>mdi-close</v-icon></v-btn>
									</td>
								</tr>
								<tr v-if="editing === r.id" :key="r.id + '-edit'" class="mo-alert-edit-row">
									<td colspan="4">
										<div class="mo-rule-edit">
											<div class="mo-part">{{ t('alerts2_edit_title') }}</div>
											<alert-rule-form :rule="ruleById(r.id)" :watched="watched" :tick="tick" @save="update" @cancel="editing = ''" />
										</div>
									</td>
								</tr>
							</template>
						</tbody>
					</table>
					<section class="wf-group wf-group-divided mo-alert-events" aria-labelledby="mo-alert-events-title">
						<div class="mo-group-head">
							<h3 id="mo-alert-events-title" class="wf-group-title">{{ t('alerts_events_title') }}</h3>
							<v-btn small text :disabled="!monitor.events.length" @click="$emit('clear-events')">{{ t('alerts_events_clear') }}</v-btn>
						</div>
						<div v-if="!monitor.events.length" class="mo-faint" role="status">{{ t('alerts_events_none') }}</div>
						<table v-else class="mo-table">
							<tbody>
								<tr v-for="(e, i) in events" :key="e.t + e.id + i">
									<td class="mo-value">{{ e.clock }}</td>
									<td><span class="wf-state" :class="e.type === 'fire' ? 'err' : 'ok'">{{ e.type === 'fire' ? t('alerts2_state_firing') : t('alerts2_state_normal') }}</span></td>
									<td class="mo-key">{{ e.text }}</td>
								</tr>
							</tbody>
						</table>
					</section>
				</div>

				<div v-else class="mo-alert-body">
					<div class="mo-note warn mb-2" role="note"><v-icon small>mdi-web</v-icon><span class="mo-note-text">{{ t('alerts2_scope_short') }}</span></div>
					<action-row :title="t(S.sound.label)" :text="t(S.sound.what)">
						<v-switch :input-value="monitor.sound" dense color="primary" hide-details :aria-label="t(S.sound.label)" @change="$emit('update-sound', !!$event)" />
					</action-row>
					<action-row :title="t(TOAST.label)" :text="t(TOAST.what)">
						<v-switch :input-value="toast" dense color="primary" hide-details :aria-label="t(TOAST.label)" @change="$emit('update-toast', !!$event)" />
					</action-row>
					<!-- note 13 (2026-11-23): how a message looks, where it shows and how many wait is ONE choice of this screen for every plugin (the notices
					     center, NoticeOptions.vue): a line and the way to it on the service page; without that page the options are drawn here -->
					<div v-if="toast" class="mo-toast-opts">
						<p class="wf-help wf-help-line mb-2">{{ t('alerts_notices_where') }}</p>
						<v-btn v-if="screenPage" outlined :to="screenPage"><v-icon small left>mdi-monitor-cellphone</v-icon>{{ t('alerts_notices_open') }}</v-btn>
						<notice-options v-else />
					</div>
				</div>
				<help-fold :what="t('look_alerts_lead')" :how="t('alerts_help')" :items="helpBlocks" />
		</div>
	</div>
</template>

<script>
'use strict'

// The in-page alerts (alert-rules.js, alert-monitor.js) in two tabs (2026-11-22): "Alerts" (the rules first, each with its optional alias, its state in words, its last
// fire, edit and remove, a form to add one, and the recent events) and "Settings" (how to warn: sound, pop-up message, its look, corner and the number waiting).
// The page owns the monitor and evaluates it every sample, so the alerts keep running while another section is open; this section only edits the rules
// (AlertRuleForm.vue is the one form, new or edit). They work on every page of DWC while DWC is open (alert-watch.js): nothing on the Pi, no notice to a phone.
import i18n from '../../i18n'
import CardHead from './CardHead.vue' // vue/_shared36
import ActionRow from './ActionRow.vue' // vue/_shared36
import HelpFold from './HelpFold.vue' // vue/_shared36
import AlertRuleForm from './AlertRuleForm.vue'
import { ALERT_SETTINGS, RULES_MAX, ruleName } from './alert-rules.js'
import { TOAST_SETTING } from './alert-toast.js'
import NoticeOptions from './NoticeOptions.vue' // vue/_shared36: the options of THIS screen for every notice
import { pathExists } from './workshop-ids.js' // vue/_shared36
import { isActive, EVENTS_KEPT } from './alert-monitor.js'
import { helpItems } from './section-help.js'

const clock = ms => new Date(ms).toTimeString().slice(0, 8)

export default {
	components: { CardHead, ActionRow, HelpFold, AlertRuleForm, NoticeOptions },
	props: {
		monitor: { type: Object, required: true },
		toast: { type: Boolean, default: true }, // the pop-up message of a fire is on
		watched: { type: Array, default: () => [] },
		tick: { type: Number, default: 0 } // the live model of the path finder
	},
	data() {
		return { tab: 'rules', adding: false, editing: '', added: '', RULES_MAX, S: ALERT_SETTINGS, TOAST: TOAST_SETTING }
	},
	computed: {
		tabs() {
			return [
				{ id: 'rules', icon: 'mdi-bell-ring-outline', text: this.t('alerts2_tab_rules', { n: this.monitor.rules.length }) },
				{ id: 'settings', icon: 'mdi-tune-variant', text: this.t('alerts2_tab_settings') }
			]
		},
		countText() {
			const n = this.monitor.rules.length
			return this.t(n === 1 ? 'alerts2_count_one' : 'alerts2_count_other', { n })
		},
		full() {
			return this.monitor.rules.length >= RULES_MAX
		},
		// the one fold at the foot: on the settings tab, the whole help of each setting (it was a "?" next to each switch)
		helpBlocks() {
			return this.tab === 'settings' ? helpItems(k => this.t(k), [this.S.sound, this.TOAST]) : []
		},
		// the section "This screen" of the service page, where the notices of every plugin are set; '' when that page is not in this DWC
		screenPage() {
			return pathExists(this.$router, '/Plugins/WorkshopService') ? '/Plugins/WorkshopService?s=screen' : ''
		},
		rules() {
			return this.monitor.rules.map(r => {
				const firing = isActive(this.monitor, r.id)
				const last = this.monitor.events.find(e => e.id === r.id && e.type === 'fire')
				return {
					id: r.id, enabled: r.enabled, firing, alias: r.alias, path: r.path, title: ruleName(r),
					tone: !r.enabled ? '' : (firing ? 'err' : 'ok'),
					stateText: this.t(!r.enabled ? 'alerts2_state_paused' : (firing ? 'alerts2_state_firing' : 'alerts2_state_normal')),
					lastText: last ? this.t('alerts2_last_fire', { time: clock(last.t) }) : this.t('alerts2_never_fired'),
					condition: this.t('alerts_rule_line', { path: r.alias ? '' : r.path, op: this.t('alerts_op_' + r.op), limit: r.value }).trim(),
					detail: this.t('alerts_rule_detail', { hysteresis: r.hysteresis, cooldown: r.cooldown })
				}
			})
		},
		events() {
			return this.monitor.events.slice(0, EVENTS_KEPT).map(e => ({
				t: e.t, id: e.id, type: e.type, clock: clock(e.t),
				text: this.t('alerts_event_' + e.type, { path: ruleName(e), op: this.t('alerts_op_' + e.op), limit: e.limit, value: e.value })
			}))
		}
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		},
		stepTab(i, d) {
			this.tab = this.tabs[(i + d + this.tabs.length) % this.tabs.length].id
		},
		ruleById(id) {
			return this.monitor.rules.find(r => r.id === id) || null
		},
		startAdd() {
			this.editing = ''
			this.added = ''
			this.adding = true
		},
		startEdit(id) {
			this.adding = false
			this.added = ''
			this.editing = this.editing === id ? '' : id
		},
		// a new rule from the form: appended, and it says what was saved and where (A8): the rule as the list shows it, kept in this browser
		add(rule) {
			this.$emit('update-rules', this.monitor.rules.concat([rule]))
			this.added = this.t('alerts_added', { rule: this.t('alerts_rule_line', { path: ruleName(rule), op: this.t('alerts_op_' + rule.op), limit: rule.value }) })
		},
		// an edited rule keeps its id and its switch; the others stay as they are
		update(rule) {
			this.$emit('update-rules', this.monitor.rules.map(r => (r.id === rule.id ? rule : r)))
			this.editing = ''
			this.added = this.t('alerts2_saved', { rule: this.t('alerts_rule_line', { path: ruleName(rule), op: this.t('alerts_op_' + rule.op), limit: rule.value }) })
		},
		toggle(id, enabled) {
			this.$emit('update-rules', this.monitor.rules.map(r => (r.id === id ? Object.assign({}, r, { enabled }) : r)))
		},
		remove(id) {
			if (this.editing === id) this.editing = ''
			this.$emit('update-rules', this.monitor.rules.filter(r => r.id !== id))
		}
	}
}
</script>
