import React, { useState } from 'react';
import { Download, FileText, LayoutTemplate, Presentation, Check, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import pptxgen from 'pptxgenjs';

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
        const doc = new jsPDF();
        let yPos = 20;
        
        doc.setFontSize(16);
        doc.text(title, 20, yPos);
        yPos += 15;
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        const textLines = doc.splitTextToSize(getCleanText(), 170);
        
        textLines.forEach(line => {
          if (yPos > 280) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(line, 20, yPos);
          yPos += 7;
        });
        
        doc.save(`${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
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
    </div>
  );
}
