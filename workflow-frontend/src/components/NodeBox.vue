<template>
  <div
    class="node-box"
    :class="['type-' + (props.node.type || 'process'), { selection: selected }]"
    :style="styleObj"
    @pointerdown.stop="onPointerDown"
    ref="root"
  >
    <div class="node-title" @dblclick="startEditing">
      <input
        v-if="editing"
        v-model="props.node.label"
        @blur="stopEditing"
        @keyup.enter="stopEditing"
        @keyup.esc="stopEditing"
        class="node-input"
        autofocus
      />
      <span v-else>{{ props.node.label }}</span>
    </div>

    <!-- conteúdo -->
    <div v-for="(line, idx) in props.node.content" :key="idx" class="node-line">
      {{ line }}
    </div>

    <!-- porta de entrada -->
    <div class="port-wrap in">
      <div class="port in" @click.stop="emitPort('in')"></div>
    </div>

    <!-- porta de saída -->
    <div class="port-wrap out">
      <div class="port out" @click.stop="emitPort('out')"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watchEffect, nextTick } from 'vue';

const props = defineProps({
  node: { type: Object, required: true },
  selected: { type: Boolean }
});
const emit = defineEmits(['drag', 'port-click', 'select']);
const root = ref(null);
const editing = ref(false);

const styleObj = computed(() => ({
  transform: `translate(${props.node.x}px, ${props.node.y}px)`
}));

onMounted(updateSize);
watchEffect(updateSize);

let dragging = false;
let start = null;

function updateSize() {
  if (root.value) {
    props.node.width = root.value.offsetWidth;
    props.node.height = root.value.offsetHeight;
  }
}

function startEditing() {
  editing.value = true;
  nextTick(() => {
    const input = root.value.querySelector('.node-input');
    if (input) input.focus();
  });
}

function stopEditing() {
  editing.value = false
}

function onPointerDown(e) {
  if (editing.value) return;
  e.preventDefault();
  dragging = true;
  start = { x: e.clientX, y: e.clientY, nodeX: props.node.x, nodeY: props.node.y };
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  emit('select', props.node.id);
}

function onPointerMove(e) {
  if (!dragging) return;
  const dx = e.clientX - start.x;
  const dy = e.clientY - start.y;
  const nx = start.nodeX + dx;
  const ny = start.nodeY + dy;
  emit('drag', { id: props.node.id, x: nx, y: ny });
}

function onPointerUp() {
  dragging = false;
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup', onPointerUp);
}

function emitPort(kind) {
  const width = root.value ? root.value.offsetWidth : 140;
  const height = root.value ? root.value.offsetHeight : 36;
  const offsetX = kind === 'out' ? width : 0;
  const offsetY = height / 2;

  const worldX = props.node.x + offsetX;
  const worldY = props.node.y + offsetY;

  emit('port-click', { id: props.node.id, kind, x: worldX, y: worldY });
}
</script>

<style scoped>
.node-box {
  position: absolute;
  min-width: 120px;
  background: #22384a;
  border: 1px solid #79c7ff;
  border-radius: 8px;
  padding: 8px;
  color: #fff;
  font-size: 0.85rem;
  cursor: grab;
  z-index: 2;
}
.node-box.selection {
  border: 2px solid #ffb347;
}
.node-title {
  font-weight: bold;
  margin-bottom: 4px;
  cursor: text;
}
.node-input {
  background: #112;
  border: 1px solid #79c7ff;
  border-radius: 4px;
  color: #fff;
  font-size: 0.85rem;
  padding: 2px 4px;
  width: 95%;
}
.node-line {
  font-size: 0.8rem;
  color: #cfe9ff;
  margin: 2px 0;
}
.port-wrap {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
}
.port-wrap.in {
  left: -8px;
}
.port-wrap.out {
  right: -8px;
}
.port {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #79c7ff;
  cursor: pointer;
}
.port.in {
  background: #ff7f7f;
}
.port.out {
  background: #79ff7f;
}
.type-start {
  background: #0a5;
}
.type-process {
  background: #247;
}
.type-decision {
  background: #a50;
}
.type-end {
  background: #a22;
}
</style>
