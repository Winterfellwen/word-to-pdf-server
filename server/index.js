// Vercel 服务端 - Word 转 PDF
const express = require('express');
const mammoth = require('mammoth');
const { jsPDF } = require('jspdf');

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.raw({ type: 'application/octet-stream', limit: '50mb' }));

app.get('/', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/convert', async (req, res) => {
  console.log('Request received');
  console.log('Body type:', typeof req.body);
  console.log('Content-Type:', req.get('Content-Type'));
  
  let buffer = req.body;
  
  try {
    if (!buffer) {
      console.log('No body');
      return res.status(400).json({ success: false, error: 'No body' });
    }
    
    if (typeof buffer === 'string') {
      buffer = Buffer.from(buffer);
    }
    
    console.log('Buffer length:', buffer.length);
    
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.length);
    console.log('Converting...');
    
    const result = await mammoth.convertToHtml({ arrayBuffer });
    const html = result.value;
    
    console.log('HTML length:', html.length);
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    
    doc.setFontSize(16);
    doc.text('Document', margin, margin + 10);
    
    const text = html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').trim();
    const lines = doc.splitTextToSize(text, contentWidth);
    
    let y = margin + 25;
    for (const line of lines) {
      if (y > 280) { doc.addPage(); y = margin; }
      doc.text(line, margin, y);
      y += 7;
    }
    
    const pdfBuffer = doc.output('arraybuffer');
    
    console.log('PDF generated');
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=doc.pdf');
    res.send(Buffer.from(pdfBuffer));
    
  } catch (err) {
    console.error('Error:', err);
    console.error('Stack:', err.stack);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = app;