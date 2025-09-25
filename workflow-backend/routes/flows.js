const express = require('express');
const router = express.Router();

// Banco em memória (enquanto não usar DB)
let savedFlow = {
  nodes: [],
  edges: []
};

// GET → retorna o fluxo salvo
router.get('/', (req, res) => {
  res.json(savedFlow);
});

// POST → salva novo fluxo
router.post('/', (req, res) => {
  const payload = req.body;
  if (!payload || !payload.nodes) {
    return res.status(400).json({ error: 'Formato inválido' });
  }
  savedFlow = payload;
  res.json({ ok: true, message: 'Fluxo salvo com sucesso!' });
});

module.exports = router;
