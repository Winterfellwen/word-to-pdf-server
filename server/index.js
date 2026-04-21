// server/index.js - Word to PDF with progress logging
const express = require('express');
const mammoth = require('mammoth');
const { jsPDF } = require('jspdf');

const app = express();

// CORS for小程序
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '3600');
  if (req.method === 'OPTIONS') {
    return res.status(204).send();
  }
  next();
});

app.use(express.raw({ type: '*/*', limit: '50mb' }));

const convertHandler = async (req, res) => {
  const requestId = Date.now().toString(36);
  console.log(`[${requestId}] Request started`);
  
  try {
    let buffer;
    
    if (Buffer.isBuffer(req.body)) {
      buffer = req.body;
    } else if (req.body && typeof req.body === 'string') {
      buffer = Buffer.from(req.body);
    } else {
      console.log(`[${requestId}] Invalid body type: ${typeof req.body}`);
      return res.status(400).json({ error: 'Invalid body', type: typeof req.body, requestId });
    }
    
    console.log(`[${requestId}] Buffer length: ${buffer?.length}`);
    
    if (!buffer || buffer.length < 100) {
      return res.status(400).json({ error: 'File too small', len: buffer?.length, requestId });
    }
    
    // Step 1: Extract text
    console.log(`[${requestId}] Extracting text...`);
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value || '';
    console.log(`[${requestId}] Extracted text length: ${text.length}`);
    
    if (!text) {
      return res.status(400).json({ error: 'No text extracted', requestId });
    }
    
    // Step 2: Generate PDF
    console.log(`[${requestId}] Generating PDF...`);
    const doc = new jsPDF();
    const margin = 20;
    const maxWidth = doc.internal.pageSize.getWidth() - margin * 2;
    const lines = doc.splitTextToSize(text, maxWidth);
    
    console.log(`[${requestId}] Lines: ${lines.length}`);
    
    let y = margin;
    for (let i = 0; i < lines.length; i++) {
      if (y > 270) { doc.addPage(); y = margin; }
      doc.text(lines[i], margin, y);
      y += 7;
      
      // Progress every 50 lines
      if (i % 50 === 0) {
        console.log(`[${requestId}] Progress: ${i}/${lines.length}`);
      }
    }
    
    console.log(`[${requestId}] PDF generated`);
    
    const pdf = doc.output('arraybuffer');
    console.log(`[${requestId}] PDF size: ${pdf.byteLength}`);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('X-Request-Id', requestId);
    res.send(Buffer.from(pdf));
    
    console.log(`[${requestId}] Response sent`);
    
  } catch (err) {
    console.error(`[${requestId}] Error:`, err.message);
    res.status(500).json({ error: err.message, requestId });
  }
};

app.all('/', convertHandler);
app.all('/api', convertHandler);

const PORT = 3000;
app.listen(PORT, () => console.log(`Server on ${PORT}`));

module.exports = app;