import React, { useState } from 'react';
import { Download, FileText, LayoutTemplate, Presentation, X, Check, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import pptxgen from 'pptxgenjs';

export default function ChatExportMenu({ messages, threadTitle }) {
  const [isOpen, setIsOpen] = useState(false);
  const [exporting, setExporting] = useState(null); // 'pdf', 'docx', 'pptx' or null
  const [exported, setExported] = useState(null);

  const getCleanText = (msg) => {
    let text = msg.content || '';
    // Strip basic markdown if needed or just use as is for simple exports
    return text;
  };

  const handleExportPDF = async () => {
    setExporting('pdf');
    try {
      const doc = new jsPDF();
      let yPos = 20;
      
      doc.setFontSize(16);
      doc.text(`Chat Export: ${threadTitle || 'Conversation'}`, 20, yPos);
      yPos += 15;
      
      doc.setFontSize(12);
      
      messages.forEach((msg) => {
        const isUser = msg.role === 'user';
        const roleText = isUser ? 'You:' : 'Codeva:';
        
        doc.setFont('helvetica', 'bold');
        doc.text(roleText, 20, yPos);
        yPos += 7;
        
        doc.setFont('helvetica', 'normal');
        const textLines = doc.splitTextToSize(getCleanText(msg), 170);
        
        textLines.forEach(line => {
          if (yPos > 280) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(line, 20, yPos);
          yPos += 7;
        });
        yPos += 5;
      });

      doc.save(`${threadTitle || 'chat'}.pdf`);
      setExported('pdf');
      setTimeout(() => setExported(null), 2000);
    } catch (err) {
      console.error('PDF Export failed:', err);
    } finally {
      setExporting(null);
      setIsOpen(false);
    }
  };

  const handleExportDocx = async () => {
    setExporting('docx');
    try {
      const children = [
        new Paragraph({
          text: `Chat Export: ${threadTitle || 'Conversation'}`,
          heading: HeadingLevel.HEADING_1,
        }),
      ];

      messages.forEach((msg) => {
        const isUser = msg.role === 'user';
        
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: isUser ? 'You:' : 'Codeva:',
                bold: true,
              }),
            ],
            spacing: { before: 200, after: 100 },
          })
        );
        
        // Handle multiline text
        const lines = getCleanText(msg).split('\n');
        lines.forEach(line => {
          if (line.trim()) {
            children.push(
              new Paragraph({
                children: [new TextRun(line)],
              })
            );
          }
        });
      });

      const doc = new Document({
        sections: [{ properties: {}, children }],
      });

      const blob = await Packer.toBlob(doc);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${threadTitle || 'chat'}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      setExported('docx');
      setTimeout(() => setExported(null), 2000);
    } catch (err) {
      console.error('DOCX Export failed:', err);
    } finally {
      setExporting(null);
      setIsOpen(false);
    }
  };

  const handleExportPptx = async () => {
    setExporting('pptx');
    try {
      const pres = new pptxgen();
      
      // Title slide
      const slide = pres.addSlide();
      slide.addText(`Chat Export: ${threadTitle || 'Conversation'}`, {
        x: 1, y: 2, w: '80%', h: 1,
        fontSize: 32, bold: true, align: 'center', color: '363636'
      });
      
      // One slide per Q&A pair or per message if complex
      messages.forEach((msg) => {
        const msgSlide = pres.addSlide();
        const isUser = msg.role === 'user';
        
        msgSlide.addText(isUser ? 'You' : 'Codeva', {
          x: 0.5, y: 0.5, w: '90%', h: 0.5,
          fontSize: 24, bold: true, color: isUser ? 'D97757' : '7C3AED'
        });
        
        msgSlide.addText(getCleanText(msg).substring(0, 1000) + (getCleanText(msg).length > 1000 ? '...' : ''), {
          x: 0.5, y: 1.2, w: '90%', h: '80%',
          fontSize: 14, color: '363636', align: 'left', valign: 'top'
        });
      });

      await pres.writeFile({ fileName: `${threadTitle || 'chat'}.pptx` });
      
      setExported('pptx');
      setTimeout(() => setExported(null), 2000);
    } catch (err) {
      console.error('PPTX Export failed:', err);
    } finally {
      setExporting(null);
      setIsOpen(false);
    }
  };

  if (!messages || messages.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 rounded-lg text-[#888888] hover:text-[#d4d4d4] hover:bg-white/5 transition-colors"
        title="Export Chat"
      >
        <Download className="w-[18px] h-[18px]" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-border-subtle shadow-2xl z-50 overflow-hidden"
              style={{ 
                background: 'var(--bg-elevated)', 
                backdropFilter: 'blur(12px)',
              }}
            >
              <div className="px-3 py-2 border-b border-border-subtle flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground-secondary uppercase tracking-wider">Export As</span>
                <button onClick={() => setIsOpen(false)} className="text-foreground-muted hover:text-foreground-primary">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="p-1.5 space-y-0.5">
                <button
                  onClick={handleExportPDF}
                  disabled={exporting !== null}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-sm text-foreground-secondary hover:text-foreground-primary hover:bg-foreground-primary/5 transition-colors group disabled:opacity-50"
                >
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-4 h-4 text-red-400 group-hover:text-red-300" />
                    <span>PDF Document</span>
                  </div>
                  {exporting === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-foreground-muted" /> : 
                   exported === 'pdf' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : null}
                </button>

                <button
                  onClick={handleExportDocx}
                  disabled={exporting !== null}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-sm text-foreground-secondary hover:text-foreground-primary hover:bg-foreground-primary/5 transition-colors group disabled:opacity-50"
                >
                  <div className="flex items-center gap-2.5">
                    <LayoutTemplate className="w-4 h-4 text-blue-400 group-hover:text-blue-300" />
                    <span>Word (DOCX)</span>
                  </div>
                  {exporting === 'docx' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-foreground-muted" /> : 
                   exported === 'docx' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : null}
                </button>

                <button
                  onClick={handleExportPptx}
                  disabled={exporting !== null}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-sm text-foreground-secondary hover:text-foreground-primary hover:bg-foreground-primary/5 transition-colors group disabled:opacity-50"
                >
                  <div className="flex items-center gap-2.5">
                    <Presentation className="w-4 h-4 text-orange-400 group-hover:text-orange-300" />
                    <span>PowerPoint</span>
                  </div>
                  {exporting === 'pptx' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-foreground-muted" /> : 
                   exported === 'pptx' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : null}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
