/**
 * Script to convert Markdown to PDF with selectable text
 * Uses puppeteer to render HTML (from markdown) to PDF
 */

const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const puppeteer = require('puppeteer');

async function generatePDF() {
  const markdownPath = path.join(__dirname, '../test-documents/crown-court-bundle.md');
  const outputPath = path.join(__dirname, '../test-documents/crown-court-bundle.pdf');

  // Read markdown file
  const markdown = fs.readFileSync(markdownPath, 'utf-8');

  // Convert markdown to HTML using marked
  const html = marked.parse(markdown);

  // Create full HTML document with styling
  const fullHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: 'Times New Roman', serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
      color: #333;
    }
    h1 {
      font-size: 24px;
      border-bottom: 3px solid #000;
      padding-bottom: 10px;
      margin-top: 30px;
      margin-bottom: 20px;
    }
    h2 {
      font-size: 20px;
      border-bottom: 2px solid #666;
      padding-bottom: 8px;
      margin-top: 25px;
      margin-bottom: 15px;
    }
    h3 {
      font-size: 18px;
      margin-top: 20px;
      margin-bottom: 12px;
      font-weight: bold;
    }
    p {
      margin-bottom: 12px;
      text-align: justify;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    table th, table td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    table th {
      background-color: #f2f2f2;
      font-weight: bold;
    }
    blockquote {
      border-left: 4px solid #ccc;
      margin: 20px 0;
      padding: 10px 20px;
      background-color: #f9f9f9;
      font-style: italic;
    }
    hr {
      border: none;
      border-top: 2px solid #000;
      margin: 30px 0;
    }
    strong {
      font-weight: bold;
    }
    ul, ol {
      margin: 15px 0;
      padding-left: 30px;
    }
    li {
      margin: 8px 0;
    }
    @page {
      margin: 2cm;
    }
  </style>
</head>
<body>
${html}
</body>
</html>
  `;

  // Launch puppeteer and generate PDF
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setContent(fullHTML, { waitUntil: 'networkidle0' });

  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '2cm',
      right: '2cm',
      bottom: '2cm',
      left: '2cm'
    }
  });

  await browser.close();

  console.log(`✅ PDF generated successfully: ${outputPath}`);
  console.log(`📄 File size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);
}

generatePDF().catch(error => {
  console.error('❌ Error generating PDF:', error);
  process.exit(1);
});
