<template>
	<div v-if="unscanned.length" class="mo-ubanner mo-ufade" role="status">
		<v-icon :size="28" class="mo-ubanner-icon">mdi-folder-search-outline</v-icon>
		<div class="mo-ubanner-text">
			<div class="mo-ubanner-title">{{ t('usage_banner_title') }}</div>
			<div class="mo-faint">{{ t('usage_banner_reason', { n: unscanned.length }) }} {{ dirs }}</div>
		</div>
		<v-btn color="primary" small depressed @click="$emit('scan-folders', unscanned)">{{ t('usage_banner_button') }}</v-btn>
	</div>
</template>

<script>
'use strict'

// One friendly banner for the folders the scan could not read (they could create a global, so some problems are only possible ones):
// a short reason and one button that reads them all and scans again.
import i18n from '../../i18n'

const SHOWN = 3

export default {
	props: {
		unscanned: { type: Array, default: () => [] }
	},
	computed: {
		dirs() {
			const names = this.unscanned.slice(0, SHOWN).map(f => f.dir).join(', ')
			return this.unscanned.length > SHOWN ? names + ' ' + this.t('usage_banner_more', { n: this.unscanned.length - SHOWN }) : names
		}
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		}
	}
}
</script>
