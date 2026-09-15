const fs = require('fs');
const PDFDocument = require('pdfkit');
const FormData = require('form-data');
const axios = require('axios');

async function createPDF() {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const stream = fs.createWriteStream('sample.pdf');
    doc.pipe(stream);
    doc.fontSize(25).text('Attention Is All You Need', 100, 100);
    doc.fontSize(12).text('Abstract: The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely.', 100, 150);
    doc.text('Methodology: We used scaled dot-product attention and multi-head attention.', 100, 250);
    doc.text('Key Findings: The Transformer achieves 28.4 BLEU on the WMT 2014 English-to-German translation task.', 100, 300);
    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

async function run() {
  try {
    console.log('Generating PDF...');
    await createPDF();
    
    console.log('Uploading PDF to backend...');
    const form = new FormData();
    form.append('topic', 'Transformer architectures');
    form.append('files', fs.createReadStream('sample.pdf'));
    
    const uploadRes = await axios.post('http://localhost:3001/api/upload', form, {
      headers: form.getHeaders()
    });
    
    console.log('Upload Result:', JSON.stringify(uploadRes.data, null, 2));
    if (!uploadRes.data.papers[0].extractedText) {
      throw new Error('extractedText is null! PDF extraction failed.');
    }    
    console.log('\nAnalyzing with Groq (this may take a few seconds)...');
    const analyzeRes = await axios.post('http://localhost:3001/api/analyze', uploadRes.data);
    
    console.log('\nAnalysis Result:');
    console.log(JSON.stringify(analyzeRes.data, null, 2));
  } catch (err) {
    console.error('Error:', err.response ? err.response.data : err.message);
  }
}

run();
