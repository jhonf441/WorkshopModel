<template>
	<v-dialog :value="true" max-width="820" scrollable content-class="workshop-theme mo-page" @input="$emit('close')">
		<v-card class="workshop-theme mo-page mo-gdetail">
			<div class="mo-rs-head">
				<span class="mo-rs-badge" aria-hidden="true"><v-icon :size="22">mdi-variable</v-icon></span>
				<div class="mo-rs-head-txt">
					<div class="mo-rs-title" role="heading" aria-level="2">{{ item.name }}</div>
					<div class="mo-faint"><code class="mo-key">{{ item.path }}</code></div>
				</div>
				<v-btn icon small :aria-label="t('close')" :title="t('close')" @click="$emit('close')"><v-icon :size="20">mdi-close</v-icon></v-btn>
			</div>
			<v-card-text class="mo-gdetail-body">
				<global-row
					:item="item" :pinned="pinned" :can-edit="canEdit" :globals-ok="globalsOk" :tick="tick" :usage-cache="usageCache" :detail="true"
					@select="$emit('select', $event)" @watch="$emit('watch', $event)" @unwatch="$emit('unwatch', $event)" @pin="$emit('pin', $event)" @unpin="$emit('unpin', $event)"
					@persist="(n, l) => $emit('persist', n, l)" @scan-usage="$emit('scan-usage')"
				/>
			</v-card-text>
		</v-card>
	</v-dialog>
</template>

<script>
'use strict'

// The detail of one global in a dialog (2026-11-03: the list is a clean table of rows, a click on a row opens this): the whole value, the kind, the
// editor, where it is used with the files, the lines and the small viewer, watch, favourite, kept after restart. It is the same card as the row
// (GlobalRow.vue) with `detail` on, so the quick edit, the preview of the command and the editor behave exactly as in the list.
import i18n from '../../i18n'
import GlobalRow from './GlobalRow.vue'

export default {
	components: { GlobalRow },
	props: {
		item: { type: Object, required: true },
		pinned: { type: Array, default: () => [] },
		canEdit: { type: Boolean, default: true },
		globalsOk: { type: Boolean, default: true },
		tick: { type: Number, default: 0 },
		usageCache: { type: Map, default: () => new Map() }
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		}
	}
}
</script>
