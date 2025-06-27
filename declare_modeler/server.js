const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 5174;

app.use(cors());
app.use(express.json());

app.post('/api/save-declare-model', (req, res) => {
  const model = req.body;
  const filePath = path.join(__dirname, 'public', 'declareModels', 'temp', 'declareModel.json');

  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  fs.writeFile(filePath, JSON.stringify(model, null, 2), (err) => {
    if (err) {
      console.error('Error writing file:', err);
      return res.status(500).json({ message: 'Failed to save file' });
    }
    console.log('DeclareModel saved at:', filePath);
    res.status(200).json({ message: 'File saved successfully' });
  });
});

app.listen(PORT, () => {
  console.log(`Dev server running at http://localhost:${PORT}`);
});