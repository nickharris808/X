'use client';

import React, { useCallback, useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface PdfOcrProcessorProps {
  file: File | null;
  onTextExtracted: (text: string) => void;
  onProcessingComplete: (text?: string) => void;
  onProgress?: (progress: { current: number; total: number; stage: string }) => void;
}

const PdfOcrProcessor: React.FC<PdfOcrProcessorProps> = ({ file, onTextExtracted, onProcessingComplete, onProgress }) => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, stage: '' });
  const [error, setError] = useState<string | null>(null);

  const processPdfWithOcr = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    setProgress({ current: 0, total: 0, stage: 'Reading PDF...' });
    onProgress?.({ current: 0, total: 0, stage: 'Reading PDF...' });

    try {
      const fileReader = new FileReader();
      
      fileReader.onload = async () => {
        try {
          const typedarray = new Uint8Array(fileReader.result as ArrayBuffer);
          const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
          
          setProgress({ current: 0, total: pdf.numPages, stage: 'Converting pages to images...' });
          onProgress?.({ current: 0, total: pdf.numPages, stage: 'Converting pages to images...' });
          
          let fullText = '';
          
          // Process pages in parallel for better performance
          const processPage = async (pageNum: number) => {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.5 }); // Reduced scale for faster processing
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d')!;
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            await page.render({ canvasContext: context, viewport }).promise;
            const dataUrl = canvas.toDataURL('image/png');

            const { data: { text } } = await Tesseract.recognize(dataUrl, 'eng');

            return { pageNum, text: text?.trim() || '' };
          };

          // Process pages in batches of 3 for better performance
          const batchSize = 3;
          const pages = Array.from({ length: pdf.numPages }, (_, i) => i + 1);
          
          for (let i = 0; i < pages.length; i += batchSize) {
            const batch = pages.slice(i, i + batchSize);
            setProgress({ current: i + batch.length, total: pdf.numPages, stage: `Processing pages ${i + 1}-${Math.min(i + batchSize, pdf.numPages)}/${pdf.numPages}...` });
            onProgress?.({ current: i + batch.length, total: pdf.numPages, stage: `Processing pages ${i + 1}-${Math.min(i + batchSize, pdf.numPages)}/${pdf.numPages}...` });
            
            const batchResults = await Promise.all(batch.map(processPage));
            
            // Sort results by page number and add to full text
            batchResults.sort((a, b) => a.pageNum - b.pageNum);
            for (const result of batchResults) {
              if (result.text) {
                fullText += `\n--- Page ${result.pageNum} ---\n${result.text}\n`;
              }
            }
          }

          setProgress({ current: pdf.numPages, total: pdf.numPages, stage: 'OCR completed!' });
          onProgress?.({ current: pdf.numPages, total: pdf.numPages, stage: 'OCR completed!' });
          
          if (fullText.trim()) {
            onTextExtracted(fullText.trim());
              onProcessingComplete(fullText.trim());
          } else {
            setError('No text could be extracted from the PDF');
          }
          
        } catch (error) {
          console.error('PDF processing error:', error);
          setError('Failed to process PDF. Please try again.');
        } finally {
          setLoading(false);
        }
      };

      fileReader.onerror = () => {
        setError('Failed to read the file');
        setLoading(false);
      };

      fileReader.readAsArrayBuffer(file);
      
    } catch (error) {
      console.error('File reading error:', error);
      setError('Failed to read the file');
      setLoading(false);
    }
  }, [onTextExtracted, onProcessingComplete, onProgress]);

  // Auto-process file if provided
  useEffect(() => {
    if (file && file.type === 'application/pdf') {
      processPdfWithOcr(file);
    }
  }, [file]); // Removed processPdfWithOcr from dependencies

  if (!file) return null;

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {loading && (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 text-center">
              {progress.stage}
            </p>
          </div>
          
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-sm text-gray-600">Processing PDF and extracting text...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PdfOcrProcessor; 