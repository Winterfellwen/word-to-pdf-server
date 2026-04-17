// Vercel 服务端
// npm install express mammoth jspdf

const express = require('express');
const mammoth = require('mammoth');
const { jsPDF } = require('jspdf');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.raw({ type: 'application/octet-stream', limit: '50mb' }));

app.post('/convert', async (req, res) => {
  try {
    let buffer = req.body;
    if (!buffer || !Buffer.isBuffer(buffer)) {
      return res.status(400).json({ success: false, error: 'No file' });
    }

    console.log('Converting:', buffer.length, 'bytes');

    const result = await mammoth.convertToHtml({ arrayBuffer: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.length) });
    const html = result.value;

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

    const pdfBuf = doc.output('arraybuffer');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=doc.pdf');
    res.send(Buffer.from(pdfBuf));

  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server:', PORT));

module.exports = app;