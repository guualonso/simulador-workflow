const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

let flows = []; // Guardar fluxos em memória

// Rota para salvar fluxo
app.post("/flows", (req, res) => {
  flows.push(req.body);
  res.json({ message: "Fluxo salvo", flows });
});

// Rota para listar fluxos
app.get("/flows", (req, res) => {
  res.json(flows);
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Backend rodando em http://localhost:${PORT}`));
