<template>
	<div class="mo-grow" :class="{ 'mo-grow-open': expanded || editing }">
		<div class="mo-grow-line">
			<favorite-star :path="item.path" :pinned="pinned" @pin="onPin" @unpin="onUnpin" />
			<span class="mo-key mo-grow-name">{{ item.name }}</span>
			<kind-chip :info="chip" />
			<button v-if="item.summary.long" type="button" class="mo-link mo-value mo-grow-value" :aria-expanded="expanded ? 'true' : 'false'" :title="expanded ? t('globals_show_less') : t('globals_show_more')" @click="expanded = !expanded">{{ item.summary.short }}</button>
			<span v-else class="mo-value mo-grow-value">{{ item.summary.short }}</span>
			<v-icon v-if="item.persistent" small class="mo-grow-icon" :title="t('persist_switch')">mdi-content-save-outline</v-icon>
			<span v-if="item.usedIn !== null" class="wf-pill" :title="t('globals_used_help')">{{ t('globals_used_in', { n: item.usedIn }) }}</span>
			<span class="mo-grow-spacer" />
			<v-switch v-if="quick === 'bool'" :input-value="draftBool" dense color="primary" hide-details class="mo-grow-quick" :aria-label="t('globals_quick_label', { name: item.name })" @change="draft = $event ? 'true' : 'false'" />
			<v-text-field v-else-if="quick === 'number'" v-model="draft" dense outlined hide-details class="mo-grow-quick mo-grow-num" :aria-label="t('globals_quick_label', { name: item.name })" @keydown.enter="armed = true" />
			<v-menu offset-y>
				<template #activator="{ on, attrs }">
					<v-btn x-small icon v-bind="attrs" :aria-label="t('globals_menu', { name: item.name })" :title="t('globals_menu', { name: item.name })" v-on="on"><v-icon small>mdi-dots-vertical</v-icon></v-btn>
				</template>
				<v-list dense>
					<v-list-item :disabled="!canEdit || !globalsOk" @click="editing = !editing"><v-list-item-title>{{ t('edit') }}</v-list-item-title></v-list-item>
					<v-list-item @click="$emit('select', item.path)"><v-list-item-title>{{ t('open_in_tree') }}</v-list-item-title></v-list-item>
					<v-list-item @click="$emit(item.watched ? 'unwatch' : 'watch', item.path)"><v-list-item-title>{{ item.watched ? t('watch_remove') : t('watch_add') }}</v-list-item-title></v-list-item>
					<v-list-item @click="$emit(item.pinned ? 'unpin' : 'pin', item.path)"><v-list-item-title>{{ item.pinned ? t('pin_remove', { path: item.path }) : t('pin_add', { path: item.path }) }}</v-list-item-title></v-list-item>
				</v-list>
			</v-menu>
		</div>
		<pre v-if="expanded" class="mo-result-text mo-grow-full">{{ item.summary.full }}</pre>
		<div v-if="quickResult" class="mo-grow-more">
			<div v-if="!quickResult.ok" class="mo-error" role="alert">{{ t('err_' + quickResult.error) }}</div>
			<command-preview v-else :code="quickResult.code" :can-send="canEdit && globalsOk" :editable="false" @sent="armed = false" />
		</div>
		<global-editor v-if="editing" class="mo-grow-more" :name="item.name" :exists="true" :value="item.value" :can-edit="canEdit" :globals-ok="globalsOk" :persistent="item.persistent" :show-persist="true" @persist="onPersist" />
	</div>
</template>

<script>
'use strict'

// One global in the Globals section: the star of the favourites, the name, the kind as a chip, the value in short (a tap shows all of
// a long text, an array or an object), the save icon when it is kept across reboots, in how many files the usage finder saw it, a
// quick edit for a boolean (a switch) and a number (a field, Enter) that prepares the exact command in the command preview (one tap,
// the rules of command-preview.js), and one menu with the rest: edit (the full typed editor), open in the tree, watch, favourite.
import i18n from '../../i18n'
import KindChip from './KindChip.vue'
import FavoriteStar from './FavoriteStar.vue'
import CommandPreview from './CommandPreview.vue'
import GlobalEditor from './GlobalEditor.vue'
import { kindInfo } from './value-kind.js'
import { editCommand, editText } from './globals-typing.js'

export default {
	components: { KindChip, FavoriteStar, CommandPreview, GlobalEditor },
	props: {
		item: { type: Object, required: true },
		pinned: { type: Array, default: () => [] },
		canEdit: { type: Boolean, default: true },
		globalsOk: { type: Boolean, default: true }
	},
	data() {
		return { expanded: false, editing: false, draft: '', armed: false }
	},
	computed: {
		chip() {
			return kindInfo(this.item.value, this.item.path)
		},
		current() {
			return editText(this.item.value)
		},
		quick() {
			if (!this.canEdit || !this.globalsOk) return ''
			if (this.item.kind === 'bool') return 'bool'
			return this.item.kind === 'int' || this.item.kind === 'float' ? 'number' : ''
		},
		draftBool() {
			return this.draft === 'true'
		},
		pending() {
			return this.draft !== this.current && (this.quick === 'bool' || this.armed)
		},
		quickResult() {
			return this.pending ? editCommand(this.item.name, this.item.kind, this.draft, true) : null
		}
	},
	watch: {
		// a new value from the machine resets the draft unless the person is changing it
		current: {
			immediate: true,
			handler(v) {
				if (!this.pending) this.draft = v
			}
		},
		draft() {
			if (this.quick === 'number') this.armed = false
		}
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		},
		onPin(path) {
			this.$emit('pin', path)
		},
		onUnpin(path) {
			this.$emit('unpin', path)
		},
		onPersist(name, literal) {
			this.$emit('persist', name, literal)
		}
	}
}
</script>
