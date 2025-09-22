<template>
  <div
    class="node-box"
    :style="{ top: position.y + 'px', left: position.x + 'px' }"
    @mousedown="startDrag"
  >
    {{ label }}
  </div>
</template>

<script setup>
import { ref } from "vue";

const props = defineProps({
  label: String,
  initialX: Number,
  initialY: Number,
});

const position = ref({ x: props.initialX, y: props.initialY });

const startDrag = (e) => {
  const offsetX = e.clientX - position.value.x;
  const offsetY = e.clientY - position.value.y;

  const move = (event) => {
    position.value.x = event.clientX - offsetX;
    position.value.y = event.clientY - offsetY;
  };

  const stop = () => {
    window.removeEventListener("mousemove", move);
    window.removeEventListener("mouseup", stop);
  };

  window.addEventListener("mousemove", move);
  window.addEventListener("mouseup", stop);
};
</script>

<style scoped>
.node-box {
  position: absolute;
  width: 100px;
  height: 50px;
  background: #42b883;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  cursor: grab;
}
</style>
