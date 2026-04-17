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
    
    // Create Buffer properly
    let buf;
    if (Buffer.isBuffer(buffer)) {
      buf = buffer;
    } else if (typeof buffer === 'string') {
      buf = Buffer.from(buffer);
    } else {
      buf = Buffer.from(JSON.stringify(buffer));
    }
    
    console.log('Buffer length:', buf.length);
    
    // Try mammoth with proper array buffer
    const uint8Array = new Uint8Array(buf);
    const arrayBuffer = uint8Array.buffer;
    
    console.log('Calling mammoth...');
    const result = await mammoth.convertToHtml({ arrayBuffer });
    const html = result.value || '';
    
    console.log('HTML length:', html.length);
    
    // jsPDF
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
    console.log('PDF length:', pdf.byteLength);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=doc.pdf');
    res.send(Buffer.from(pdf));
    
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = app;