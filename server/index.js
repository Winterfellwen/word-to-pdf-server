// Vercel 服务端 - Word 转 PDF
const express = require('express');
const mammoth = require('mammoth');
const { jsPDF } = require('jspdf');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.raw({ type: 'application/octet-stream', limit: '50mb' }));

app.get('/', (req, res) => res.json({ status: 'ok' }));
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.post('/convert', async (req, res) => {
  try {
    let buffer = req.body;
    
    if (!buffer) {
      return res.status(400).json({ error: 'No body' });
    }
    
    // Convert to Buffer if needed
    if (typeof buffer === 'string') {
      buffer = Buffer.from(buffer);
    }
    
    console.log('Input size:', buffer.length);
    
    // Try mammoth
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.length);
    const result = await mammoth.convertToHtml({ arrayBuffer });
    const html = result.value || '';
    
    console.log('HTML size:', html.length);
    
    // Simple jsPDF
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Document', 20, 20);
    
    const cleanText = html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').trim();
    const lines = doc.splitTextToSize(cleanText, 170);
    
    let y = 30;
    for (const line of lines) {
      if (y > 280) { doc.addPage(); y = 20; }
      doc.text(line, 20, y);
      y += 7;
    }
    
    const pdf = doc.output('arraybuffer');
    console.log('PDF size:', pdf.byteLength);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=doc.pdf');
    res.send(Buffer.from(pdf));
    
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = app;