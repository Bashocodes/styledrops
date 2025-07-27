import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface AnalysisContentProps {
  currentPrompt: string;
  moduleColor: string;
  onTextClick?: (text: string) => void;
}

export const AnalysisContent: React.FC<AnalysisContentProps> = ({ 
  currentPrompt, 
  moduleColor,
  onTextClick
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  const handleTextClick = (text: string) => {
    onTextClick?.(text);
  };

  return (
    <div 
      className="transition-all duration-300"
      style={{ backgroundColor: `${moduleColor}05` }}
    >
      <div className="group relative bg-black/20 backdrop-blur-sm rounded-lg border border-white/5 hover:border-white/10 transition-all duration-300">
        <div className="flex items-start justify-between gap-3 p-3">
          <p 
            className="text-improved-contrast text-xs font-mono cursor-pointer hover:text-white transition-colors flex-1 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900 rounded"
            onClick={() => handleTextClick(currentPrompt)}
            tabIndex={0}
            role="button"
            aria-label="Click to add this prompt to your editable text"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleTextClick(currentPrompt);
              }
            }}
          >
            {currentPrompt}
          </p>
          <button
            onClick={() => handleCopy(currentPrompt)}
            className="flex-shrink-0 p-1 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900"
            aria-label="Copy prompt to clipboard"
            title={copied ? 'Copied!' : 'Copy to clipboard'}
          >
            {copied ? (
              <Check className="w-3 h-3 text-green-400" />
            ) : (
              <Copy className="w-3 h-3 text-gray-400" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};