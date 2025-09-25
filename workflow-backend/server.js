const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const flowsRouter = require('./routes/flows');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// usa o router de flows
app.use('/api/flows', flowsRouter);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Workflow backend running on http://localhost:${PORT}`);
});
