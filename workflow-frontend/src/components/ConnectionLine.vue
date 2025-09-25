<template>
  <g class="connection">
    <path
      :d="d"
      fill="none"
      stroke="#79c7ff"
      stroke-width="2"
      stroke-linecap="round"
      marker-end="url(#arrow)"
      @click="onClick"
    />
    <text v-if="label" :x="mx" :y="my" class="edge-label" text-anchor="middle">
      {{ label }}
    </text>
  </g>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  from: { type: Object, required: true },
  to: { type: Object, required: true },
  label: { type: String, default: '' }
});
const emit = defineEmits(['delete-edge']);

const d = computed(() => {
  const sx = props.from.x, sy = props.from.y;
  const tx = props.to.x, ty = props.to.y;
  const dx = (tx - sx) * 0.5;
  return `M ${sx} ${sy} C ${sx + dx} ${sy}, ${tx - dx} ${ty}, ${tx} ${ty}`;
});

const mx = computed(() => (props.from.x + props.to.x) / 2);
const my = computed(() => (props.from.y + props.to.y) / 2 - 5);

function onClick(e) {
  if (e.shiftKey) {
    emit('delete-edge');
  }
}
</script>

<style scoped>
.connection {
  cursor: pointer;
}
.edge-label {
  fill: #cfe9ff;
  font-size: 0.7rem;
  pointer-events: none;
}
</style>
