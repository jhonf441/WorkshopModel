<template>
	<div class="mo-rows" role="tree">
		<button v-for="r in rows" :key="r.path" type="button" class="mo-row" :class="{ 'mo-selected': r.path === selected, 'mo-changed': changed.has(r.path) }" :style="{ paddingLeft: (8 + r.depth * 16) + 'px' }" role="treeitem" :aria-expanded="r.branch ? (r.open ? 'true' : 'false') : null" :aria-selected="r.path === selected ? 'true' : 'false'" :title="r.path" @click="emit('select', r.path)">
			<span class="mo-twisty" @click.stop="r.branch && emit('toggle', r.path)"><v-icon v-if="r.branch" size="small">{{ r.open ? 'mdi-chevron-down' : 'mdi-chevron-right' }}</v-icon></span>
			<span class="mo-key">{{ r.key }}</span>
			<span v-if="r.branch" class="mo-count">{{ r.kind === 'array' ? '[' + r.count + ']' : '{' + r.count + '}' }}</span>
			<span v-else class="mo-value">{{ r.text }}</span>
		</button>
	</div>
</template>

<script setup>
// The rows of the tree as a flat list (model-tree.js visibleRows): one button per row, indented by its depth. A branch opens and
// closes with its chevron; a tap on the row selects it. A row whose value changed since the last tick flashes (change-diff.js).
defineProps({
	rows: { type: Array, default: () => [] },
	selected: { type: String, default: '' },
	changed: { type: Set, default: () => new Set() }
})
const emit = defineEmits(['toggle', 'select'])
</script>
