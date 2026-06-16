/**
 * Download Service
 * Handles exporting content to PDF, MS Word (DOC), and Plain Text (TXT) formats.
 */

// Helper to trigger a file download from a Blob
const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Generates a clean PDF from a DOM element using html2pdf.js
 */
export const downloadAsPDF = async (element: HTMLDivElement | null, filename: string) => {
  if (!element) {
    console.error("PDF generation failed: Element is null");
    return;
  }

  try {
    // Dynamically import html2pdf.js to keep initial bundle size smaller
    // @ts-ignore
    const html2pdf = (await import('html2pdf.js')).default;
    
    const opt = {
      margin:       15, // 15mm margins (top, left, bottom, right)
      filename:     filename,
      image:        { type: 'jpeg' as const, quality: 0.98 },
      html2canvas:  { 
        scale: 2, 
        useCORS: true, 
        letterRendering: true,
        logging: false
      },
      jsPDF:        { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
      pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
    };
    
    await html2pdf().from(element).set(opt).save();
  } catch (error) {
    console.error("Failed to generate PDF:", error);
    throw error;
  }
};

/**
 * Downloads the HTML content of an element formatted for Microsoft Word (.doc)
 */
export const downloadAsDoc = (element: HTMLDivElement | null, filename: string) => {
  if (!element) {
    console.error("Doc download failed: Element is null");
    return;
  }

  // Word-friendly HTML headers specifying encoding and page margins
  const header = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' 
          xmlns:w='urn:schemas-microsoft-com:office:word' 
          xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <title>${filename}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        body { 
          font-family: 'Arial', sans-serif; 
          line-height: 1.6; 
          margin: 1in; 
          color: #1e293b;
        }
        h1 { 
          font-size: 24pt; 
          font-weight: bold; 
          margin-bottom: 6pt; 
          color: #0f172a; 
          text-align: center;
        }
        h2 { 
          font-size: 14pt; 
          font-weight: bold; 
          margin-top: 18pt; 
          margin-bottom: 8pt; 
          color: #1e293b; 
          border-bottom: 1px solid #e2e8f0; 
          padding-bottom: 3pt;
          text-transform: uppercase;
        }
        h3 { 
          font-size: 12pt; 
          font-weight: bold; 
          margin-top: 12pt; 
          margin-bottom: 4pt; 
          color: #334155;
        }
        p { 
          margin-bottom: 8pt; 
          font-size: 11pt;
        }
        ul { 
          margin-bottom: 8pt; 
          padding-left: 20px;
        }
        li { 
          margin-bottom: 3pt; 
          font-size: 11pt;
        }
        a { 
          color: #2563eb; 
          text-decoration: none;
        }
      </style>
    </head>
    <body>
  `;
  
  const footer = "</body></html>";
  const htmlContent = element.innerHTML;
  const sourceHTML = header + htmlContent + footer;
  
  // \ufeff is the UTF-8 Byte Order Mark (BOM) so Word reads the encoding correctly
  const blob = new Blob(['\ufeff' + sourceHTML], { type: 'application/msword;charset=utf-8' });
  downloadBlob(blob, filename);
};

/**
 * Downloads raw string text as a plain text file (.txt)
 */
export const downloadAsTxt = (text: string, filename: string) => {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  downloadBlob(blob, filename);
};
