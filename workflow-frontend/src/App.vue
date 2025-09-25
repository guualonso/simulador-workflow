<template>
  <div class="app">
    <div class="toolbar">
      <button class="btn small" @click="addNode">+ Add Node</button>
      <button class="btn small secondary" @click="toggleEdgeMode">
        {{ startEdgeMode ? 'Conectar: ON' : 'Conectar: OFF' }}
      </button>
      <button class="btn small danger" @click="deleteSelectedNode">Excluir Nó</button>
      <button class="btn small secondary" @click="snapEnabled = !snapEnabled">
        {{ snapEnabled ? 'Snap: ON' : 'Snap: OFF' }}
      </button>
      <button class="btn small" @click="saveToServer">Salvar (backend)</button>
      <button class="btn small secondary" @click="loadFromServer">Carregar (backend)</button>
      <button class="btn small" @click="downloadJSON">Exportar JSON</button>
      <label class="btn small" style="cursor:pointer">
        Importar JSON
        <input class="file-input" type="file" accept=".json" @change="importJSON" />
      </label>
      <div style="margin-left:auto; color:#9fbcd9; font-size:0.9rem">
        Nós: {{ nodes.length }} • Arestas: {{ edges.length }}
      </div>
    </div>

    <div class="canvas-wrap">
      <div class="canvas-hint">
        Use roda do mouse para zoom (foco no cursor). Arraste com botão do meio para pan.
      </div>
      <div
        ref="canvas"
        class="canvas"
        @pointerdown="onCanvasPointerDown"
      >
        <div
          class="viewport"
          :style="viewportStyle"
          @pointerdown.stop="onViewportPointerDown"
        >
          <svg class="grid-svg" :width="canvasSize.width" :height="canvasSize.height" preserveAspectRatio="none">
            <defs>
              <pattern id="gridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#2b3b45" stroke-width="0.6"/>
              </pattern>
              <pattern id="gridPatternSmall" width="100" height="100" patternUnits="userSpaceOnUse">
                <rect width="100" height="100" fill="url(#gridPattern)" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#gridPattern)"/>
          </svg>
          <svg class="connections" ref="svg" :width="canvasSize.width" :height="canvasSize.height">
            <defs>
              <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                <path d="M0,0 L0,8 L8,4 z" fill="#79c7ff" />
              </marker>
            </defs>

            <g v-for="(edge, idx) in edges" :key="edge.id || idx">
              <ConnectionLine
                :from="edgeFromPos(edge)"
                :to="edgeToPos(edge)"
                :label="edge.label"
                @delete-edge="deleteEdge(edge.id)"
              />
            </g>
            <path
              v-if="tempConnect"
              :d="tempD"
              stroke="#a6e1ff"
              stroke-width="2"
              fill="none"
            />
          </svg>
          <component
            v-for="n in nodes"
            :is="NodeBox"
            :key="n.id"
            :node="n"
            :selected="selectedNode === n.id"
            @drag="onNodeDrag"
            @port-click="onPortClick"
            @select="onSelectNode"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watchEffect, nextTick } from 'vue';
import NodeBox from './components/NodeBox.vue';
import ConnectionLine from './components/ConnectionLine.vue';

const nodes = ref([
  { id: 'n1', label: 'Start', x: 60, y: 40, content: ['Entrada'] },
  { id: 'n2', label: 'Process', x: 360, y: 160, content: ['Trabalha'] }
]);
const edges = ref([]);

const selectedNode = ref(null);
const startEdgeMode = ref(false);
const connecting = ref(null);
const tempConnect = ref(null);

const canvas = ref(null);
const svg = ref(null);

const scale = ref(1);
const minScale = 0.25;
const maxScale = 3;
const offset = ref({ x: 0, y: 0 });
const isPanning = ref(false);
let panStart = null;


const canvasSize = ref({ width: 2000, height: 2000 });

const viewportStyle = computed(() => ({
  transform: `translate(${offset.value.x}px, ${offset.value.y}px) scale(${scale.value})`,
  transformOrigin: '0 0',
  width: `${canvasSize.value.width}px`,
  height: `${canvasSize.value.height}px`
}));

const gridSize = 20;
const snapEnabled = ref(true);

function toggleEdgeMode() {
  startEdgeMode.value = !startEdgeMode.value;
  cleanupConnect();
}

function addNode() {
  const id = 'n' + (Date.now() % 100000);
  nodes.value.push({
    id,
    label: `Node ${nodes.value.length + 1}`,
    x: 140,
    y: 120,
    content: ['Nova ação']
  });
}

function deleteEdge(id) {
  edges.value = edges.value.filter(e => e.id !== id);
}

function onNodeDrag(payload) {
  const n = nodes.value.find(x => x.id === payload.id);
  if (n) {
    let nx = payload.x;
    let ny = payload.y;
    if (snapEnabled.value) {
      nx = Math.round(nx / gridSize) * gridSize;
      ny = Math.round(ny / gridSize) * gridSize;
    }
    n.x = nx;
    n.y = ny;
  }
}

function onSelectNode(id) {
  selectedNode.value = id;
}

function onPortClick(portInfo) {
  if (!startEdgeMode.value) return;

  if (!connecting.value) {
    connecting.value = { ...portInfo };
    tempConnect.value = { x: portInfo.x, y: portInfo.y };
    window.addEventListener('pointermove', onPointerMoveWhileConnecting);
    window.addEventListener('pointerup', onPointerUpWhileConnecting);
    return;
  }

  if (connecting.value.kind === portInfo.kind) {
    cleanupConnect();
    return;
  }

  const fromId = connecting.value.kind === 'out' ? connecting.value.id : portInfo.id;
  const toId = connecting.value.kind === 'out' ? portInfo.id : connecting.value.id;

  if (fromId === toId) {
    cleanupConnect();
    return;
  }

  const alreadyExists = edges.value.some(e => e.fromId === fromId && e.toId === toId);
  if (!alreadyExists) {
    const edgeId = `${fromId}__${toId}`;
    edges.value.push({
      id: edgeId,
      fromId,
      toId,
      fromKind: 'out',
      toKind: 'in'
    });
  }
  cleanupConnect();
}

function onPointerMoveWhileConnecting(e) {
  const rect = canvas.value.getBoundingClientRect();
  const cx = e.clientX - rect.left;
  const cy = e.clientY - rect.top;
  const worldX = (cx - offset.value.x) / scale.value;
  const worldY = (cy - offset.value.y) / scale.value;
  tempConnect.value = { x: worldX, y: worldY };
}

function onPointerUpWhileConnecting(e) {
  const el = e.target;
  const portEl = el?.closest?.('.port');
  if (!portEl) {
    cleanupConnect();
  }
}

function cleanupConnect() {
  connecting.value = null;
  tempConnect.value = null;
  window.removeEventListener('pointermove', onPointerMoveWhileConnecting);
  window.removeEventListener('pointerup', onPointerUpWhileConnecting);
}

function edgePortPos(node, kind) {
  if (!node) return { x: 0, y: 0 };
  const width = node.width || 140;
  const height = node.height || 40;
  return kind === 'out'
    ? { x: node.x + width, y: node.y + height / 2 }
    : { x: node.x, y: node.y + height / 2 };
}

function edgeFromPos(edge) {
  const node = nodes.value.find(n => n.id === edge.fromId);
  return edgePortPos(node, edge.fromKind);
}
function edgeToPos(edge) {
  const node = nodes.value.find(n => n.id === edge.toId);
  return edgePortPos(node, edge.toKind);
}

const tempD = computed(() => {
  if (!tempConnect.value || !connecting.value) return '';
  const sx = connecting.value.x;
  const sy = connecting.value.y;
  const tx = tempConnect.value.x;
  const ty = tempConnect.value.y;
  const dx = Math.abs(tx - sx);
  const cx1 = sx + dx * 0.5;
  const cx2 = tx - dx * 0.5;
  return `M ${sx} ${sy} C ${cx1} ${sy} ${cx2} ${ty} ${tx} ${ty}`;
});

function onCanvasPointerDown(e) {
  if (e.target === canvas.value) {
    selectedNode.value = null;
  }
}

function onViewportPointerDown(e) {
  if (e.button === 1) {
    isPanning.value = true;
    panStart = { x: e.clientX, y: e.clientY, ox: offset.value.x, oy: offset.value.y };
    window.addEventListener('pointermove', onPanPointerMove);
    window.addEventListener('pointerup', onPanPointerUp);
    e.preventDefault();
    return;
  }
}

function onPanPointerMove(e) {
  if (!isPanning.value || !panStart) return;
  const dx = e.clientX - panStart.x;
  const dy = e.clientY - panStart.y;
  offset.value.x = panStart.ox + dx;
  offset.value.y = panStart.oy + dy;
}

function onPanPointerUp() {
  isPanning.value = false;
  panStart = null;
  window.removeEventListener('pointermove', onPanPointerMove);
  window.removeEventListener('pointerup', onPanPointerUp);
}

function onWheel(e) {
  e.preventDefault();
  const rect = canvas.value.getBoundingClientRect();
  const cx = e.clientX - rect.left;
  const cy = e.clientY - rect.top;

  const worldX = (cx - offset.value.x) / scale.value;
  const worldY = (cy - offset.value.y) / scale.value;

  const delta = -e.deltaY;
  const zoomFactor = 1 + Math.sign(delta) * 0.12;
  let newScale = Math.min(maxScale, Math.max(minScale, scale.value * zoomFactor));
  if (Math.abs(newScale - scale.value) < 1e-4) return;
  scale.value = newScale;

  offset.value.x = cx - worldX * scale.value;
  offset.value.y = cy - worldY * scale.value;
}

onMounted(() => {
  const rect = canvas.value.getBoundingClientRect();
  canvasSize.value.width = Math.max(rect.width * 2, 2000);
  canvasSize.value.height = Math.max(rect.height * 2, 2000);

  canvas.value.addEventListener('wheel', onWheel, { passive: false });

  loadFromServer();
});

function downloadJSON() {
  const data = JSON.stringify({ nodes: nodes.value, edges: edges.value }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'flow.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importJSON(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const json = JSON.parse(reader.result);
      if (json.nodes) {
        nodes.value = json.nodes;
        edges.value = json.edges || [];
      } else {
        alert('JSON inválido');
      }
    } catch (err) {
      alert('Erro ao ler JSON: ' + err.message);
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

async function saveToServer() {
  try {
    await fetch('http://localhost:3001/api/flows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodes: nodes.value, edges: edges.value })
    });
    alert('Salvo com sucesso!');
  } catch (err) {
    alert('Erro ao salvar: ' + err.message);
  }
}

async function loadFromServer() {
  try {
    const res = await fetch('http://localhost:3001/api/flows');
    const data = await res.json();
    nodes.value = data.nodes || [];
    edges.value = data.edges || [];
  } catch (err) {
    alert('Erro ao carregar: ' + err.message);
  }
}

function deleteSelectedNode() {
  if (!selectedNode.value) return;

  const id = selectedNode.value;
  nodes.value = nodes.value.filter(n => n.id !== id);
  edges.value = edges.value.filter(e => e.fromId !== id && e.toId !== id);

  selectedNode.value = null;
}
</script>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #1e2a35;
  color: #eaf3ff;
  font-family: sans-serif;
}
.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: #253646;
  border-bottom: 1px solid #3a4a5a;
}
.canvas-wrap {
  flex: 1;
  position: relative;
  overflow: hidden;
}
.canvas {
  position: relative;
  width: 100%;
  height: 100%;
  background: linear-gradient(180deg,#152126,#122021);
  cursor: default;
}
.canvas-hint {
  position: absolute;
  right: 12px;
  top: 8px;
  z-index: 5;
  font-size: 0.8rem;
  color: #9fbcd9;
  background: rgba(20,30,36,0.55);
  padding: 6px 8px;
  border-radius: 6px;
}
.viewport {
  position: absolute;
  left: 0;
  top: 0;
  transform-origin: 0 0;
  will-change: transform;
}
.grid-svg {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 0;
  pointer-events: none;
}
.connections {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 1;
  overflow: visible;
  pointer-events: none;
}
.component, .nodes {
  position: absolute;
  z-index: 2;
}
.btn {
  background: #2f4a63;
  color: #eaf3ff;
  border: none;
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
}
.btn:hover {
  background: #3d5c7a;
}
.btn.small {
  font-size: 0.85rem;
}
.btn.secondary {
  background: #445a70;
}
.file-input {
  display: none;
}
</style>