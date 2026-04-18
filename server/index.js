// server/index.js - Vercel Serverless
const express = require('express');
const mammoth = require('mammoth');
const { jsPDF } = require('jspdf');

const app = express();
app.use(express.raw({ type: 'application/octet-stream', limit: '50mb' }));

const convertHandler = async (req, res) => {
  try {
    if (!req.body || req.body.length === 0) {
      return res.status(400).json({ error: 'Empty body' });
    }
    
    const uint8Array = new Uint8Array(req.body);
    const result = await mammoth.extractRawText({ arrayBuffer: uint8Array.buffer });
    const text = result.value || '';
    
    const doc = new jsPDF();
    const lines = doc.splitTextToSize(text, 170);
    
    let y = 20;
    for (const line of lines) {
      if (y > 280) { doc.addPage(); y = 20; }
      doc.text(line, 20, y);
      y += 7;
    }
    
    const pdf = doc.output('arraybuffer');
    res.setHeader('Content-Type', 'application/pdf');
    res.send(Buffer.from(pdf));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

app.get('/', (req, res) => res.json({ status: 'ok', message: 'Word to PDF API' }));
app.post('/', convertHandler);
app.get('/api', (req, res) => res.json({ status: 'ok', message: 'Word to PDF API' }));
app.post('/api', convertHandler);

module.exports = app;