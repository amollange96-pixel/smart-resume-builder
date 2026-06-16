import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Check, AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GrammarInputProps {
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  rows?: number;
  className?: string;
  placeholder?: string;
  required?: boolean;
}

interface GrammarMatch {
  message: string;
  shortMessage: string;
  replacements: { value: string }[];
  offset: number;
  length: number;
  rule: {
    issueType: string;
  };
}

export default function GrammarInput({ name, value, onChange, rows = 4, className = '', placeholder = '', required = false }: GrammarInputProps) {
  const [matches, setMatches] = useState<GrammarMatch[]>([]);
  const [checking, setChecking] = useState(false);
  const [lastCheckedText, setLastCheckedText] = useState(value);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce API call
  useEffect(() => {
    if (value === lastCheckedText) return;
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (!value.trim()) {
      setMatches([]);
      return;
    }

    typingTimeoutRef.current = setTimeout(async () => {
      setChecking(true);
      try {
        const response = await fetch('https://api.languagetool.org/v2/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            text: value,
            language: 'en-US'
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          // Filter to only show matches that have suggested replacements
          const actionableMatches = (data.matches || []).filter((m: GrammarMatch) => m.replacements && m.replacements.length > 0);
          setMatches(actionableMatches);
          setLastCheckedText(value);
        }
      } catch (error) {
        console.error("Grammar Check Error:", error);
      } finally {
        setChecking(false);
      }
    }, 1200); // Wait 1.2s after user stops typing

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [value, lastCheckedText]);

  const applyFix = (match: GrammarMatch, replacementValue: string) => {
    // Splicing the replacement into the original string
    const before = value.substring(0, match.offset);
    const after = value.substring(match.offset + match.length);
    const newValue = before + replacementValue + after;

    // Remove the match from state instantly
    setMatches(prev => prev.filter(m => m !== match));
    
    // Create a synthetic event to trigger the parent's onChange
    const syntheticEvent = {
      target: {
        name: name,
        value: newValue
      }
    } as React.ChangeEvent<HTMLTextAreaElement>;
    
    onChange(syntheticEvent);
  };

  const dismissMatch = (match: GrammarMatch) => {
    setMatches(prev => prev.filter(m => m !== match));
  };

  return (
    <div className="relative flex flex-col space-y-2">
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        rows={rows}
        className={`${className} ${matches.length > 0 ? 'border-red-500/50 focus:border-red-500' : ''}`}
        placeholder={placeholder}
        required={required}
      />
      
      {checking && (
        <div className="absolute top-4 right-4 text-brand-secondary flex items-center gap-2 text-xs font-bold bg-black/40 px-2 py-1 rounded-lg backdrop-blur-sm pointer-events-none">
          <Loader2 className="w-3 h-3 animate-spin" /> Checking...
        </div>
      )}

      {/* Suggestion Bubbles */}
      <AnimatePresence>
        {matches.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-wrap gap-2 pt-1"
          >
            {matches.slice(0, 3).map((match, idx) => (
              <motion.div 
                key={`${match.offset}-${idx}`}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-xl text-sm"
              >
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span className="text-gray-300 truncate max-w-[150px]">
                  Change <span className="line-through text-red-400">{value.substring(match.offset, match.offset + match.length)}</span> to
                </span>
                <button
                  type="button"
                  onClick={() => applyFix(match, match.replacements[0].value)}
                  className="bg-green-500/20 hover:bg-green-500/30 text-green-400 font-bold px-2 py-0.5 rounded-lg transition-colors flex items-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  {match.replacements[0].value}
                </button>
                <button 
                  type="button" 
                  onClick={() => dismissMatch(match)}
                  className="text-gray-500 hover:text-white transition-colors ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            ))}
            {matches.length > 3 && (
              <div className="text-xs text-gray-500 flex items-center px-2">
                +{matches.length - 3} more errors
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
