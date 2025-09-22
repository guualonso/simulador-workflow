<script setup>
import NodeBox from "./components/NodeBox.vue";
</script>

<template>
  <div>
    <h1>Workflow Builder</h1>
    <NodeBox label="Início" :initialX="50" :initialY="100" />
    <NodeBox label="Tarefa 1" :initialX="200" :initialY="100" />
  </div>
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>

