import React, { useState } from 'react';
import { Download, FileText, LayoutTemplate, Presentation, Check, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import pptxgen from 'pptxgenjs';
import html2canvas from 'html2canvas';
import ReactMarkdown from 'react-markdown';
export default function DocumentArtifact({ format, content, title = "Generated Document" }) {
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);

  // Fallbacks for formatting
  const getCleanText = () => content || '';

  const handleDownload = async () => {
    if (exporting) return;
    setExporting(true);

    try {
      if (format === 'pdf') {
        const element = document.getElementById(`pdf-container-${title.replace(/[^a-z0-9]/gi, '_')}`);
        if (element) {
          // Temporarily make it visible for html2canvas to capture properly
          const originalPosition = element.style.position;
          const originalLeft = element.style.left;
          element.style.position = 'absolute';
          element.style.left = '0';
          element.style.top = '0';
          element.style.zIndex = '-1';
          
          const canvas = await html2canvas(element, { 
            scale: 2,
            useCORS: true,
            logging: false,
            windowWidth: 800
          });
          
          element.style.position = originalPosition;
          element.style.left = originalLeft;
          element.style.zIndex = '';

          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          
          const doc = new jsPDF('p', 'mm', 'a4');
          const pdfWidth = doc.internal.pageSize.getWidth();
          const pageHeight = doc.internal.pageSize.getHeight();
          const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
          
          let heightLeft = pdfHeight;
          let position = 0;
          
          doc.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
          heightLeft -= pageHeight;
          
          while (heightLeft >= 0) {
            position = heightLeft - pdfHeight;
            doc.addPage();
            doc.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
            heightLeft -= pageHeight;
          }
          
          doc.save(`${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
        }
      } 
      else if (format === 'docx') {
        const children = [
          new Paragraph({
            text: title,
            heading: HeadingLevel.HEADING_1,
          }),
        ];

        const lines = getCleanText().split('\n');
        lines.forEach(line => {
          if (line.trim()) {
            children.push(
              new Paragraph({
                children: [new TextRun(line)],
              })
            );
          }
        });

        const doc = new Document({
          sections: [{ properties: {}, children }],
        });

        const blob = await Packer.toBlob(doc);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
      else if (format === 'pptx') {
        const pres = new pptxgen();
        const slide = pres.addSlide();
        
        slide.addText(title, {
          x: 0.5, y: 0.5, w: '90%', h: 0.5,
          fontSize: 24, bold: true, color: '363636'
        });
        
        // Split content into chunks if needed, here we just do a simple text dump
        slide.addText(getCleanText().substring(0, 2000), {
          x: 0.5, y: 1.2, w: '90%', h: '80%',
          fontSize: 14, color: '363636', align: 'left', valign: 'top'
        });

        await pres.writeFile({ fileName: `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pptx` });
      }

      setExported(true);
      setTimeout(() => setExported(false), 2000);
    } catch (err) {
      console.error(`Failed to generate ${format}:`, err);
      alert(`Error generating ${format}.`);
    } finally {
      setExporting(false);
    }
  };

  const getIcon = () => {
    switch (format) {
      case 'pdf': return <FileText className="w-5 h-5 text-red-400" />;
      case 'docx': return <LayoutTemplate className="w-5 h-5 text-blue-400" />;
      case 'pptx': return <Presentation className="w-5 h-5 text-orange-400" />;
      default: return <FileText className="w-5 h-5 text-gray-400" />;
    }
  };

  const getLabel = () => {
    switch (format) {
      case 'pdf': return 'PDF Document';
      case 'docx': return 'Word Document';
      case 'pptx': return 'PowerPoint Presentation';
      default: return 'Document';
    }
  };

  return (
    <div className="my-4 p-4 rounded-xl border border-border-subtle bg-background-tertiary shadow-sm flex items-center justify-between max-w-sm">
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="p-2 rounded-lg bg-background-secondary shadow-sm">
          {getIcon()}
        </div>
        <div className="flex flex-col overflow-hidden">
          <span className="text-sm font-medium text-foreground-primary truncate">{title}</span>
          <span className="text-xs text-foreground-muted uppercase">{getLabel()}</span>
        </div>
      </div>
      <button
        onClick={handleDownload}
        disabled={exporting}
        className="ml-4 p-2 rounded-lg text-foreground-secondary hover:text-foreground-primary hover:bg-white/5 transition-colors disabled:opacity-50 flex items-center justify-center bg-background-secondary border border-border-subtle"
        title="Download"
      >
        {exporting ? <Loader2 className="w-4 h-4 animate-spin text-foreground-muted" /> : 
         exported ? <Check className="w-4 h-4 text-emerald-400" /> :
         <Download className="w-4 h-4" />}
      </button>

      {/* Hidden container for PDF rendering */}
      {format === 'pdf' && (
        <div className="fixed top-[-9999px] left-[-9999px] overflow-hidden">
          <div 
            id={`pdf-container-${title.replace(/[^a-z0-9]/gi, '_')}`}
            className="bg-white text-black p-10 w-[800px] prose prose-sm max-w-none prose-img:mx-auto prose-img:max-h-64"
          >
            <h1 className="text-3xl font-bold mb-6 text-gray-900 border-b pb-4">{title}</h1>
            <ReactMarkdown>{getCleanText()}</ReactMarkdown>
            <div className="mt-12 pt-4 border-t text-xs text-gray-400 text-center">
              Generated securely via Codeva Neural Network
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
