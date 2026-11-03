<template>
	<div>
		<div class="mo-ucards" role="group" :aria-label="t('usage_cards_label')">
			<button v-for="c in looks" :key="c.id" type="button" class="mo-ucard" :class="'tone-' + c.tone" :aria-pressed="card === c.id ? 'true' : 'false'" @click="emit('pick', c.id)">
				<span class="mo-ucard-top"><v-icon size="22">{{ c.icon }}</v-icon><span class="mo-ucard-title">{{ t('usage_card_' + c.id) }}</span></span>
				<span class="mo-ucard-n">{{ counts[c.id] }}</span>
				<span class="mo-ucard-say">{{ t(c.say) }}</span>
			</button>
		</div>
		<choice-help :choice="S.cards" :title="t('help_how')" class="mb-2" />
	</div>
</template>

<script setup>
// The three big summary cards of the usage finder (usage-view.js cardLooks): problems, to check, everything. Each is a button with its
// number, its color and one plain sentence; the one pressed filters the list below. Nothing is kept here: the section owns the card.
import { computed } from 'vue'
import { i18n } from './dwc-host.js'
import ChoiceHelp from './ChoiceHelp.vue'
import { SCOPE_SETTINGS } from './usage-scope.js'
import { cardLooks } from './usage-view.js'

const props = defineProps({
	counts: { type: Object, default: () => ({ problems: 0, check: 0, all: 0 }) },
	card: { type: String, default: 'all' }
})
const emit = defineEmits(['pick'])

const S = SCOPE_SETTINGS
const t = (k, p) => i18n.t('plugins.WorkshopModel.model.' + k, p)

const looks = computed(() => cardLooks(props.counts))
</script>
