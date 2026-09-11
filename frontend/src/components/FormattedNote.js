import React from 'react';

const FormattedNote = ({ text, className = '' }) => {
  if (!text) return null;

  // Parse and render formatted text
  const renderFormattedText = (text) => {
    // Handle HTML color spans
    let parts = [];
    let currentIndex = 0;
    const spanRegex = /<span class="([^"]+)">([^<]+)<\/span>/g;
    let match;

    while ((match = spanRegex.exec(text)) !== null) {
      // Add text before the span
      if (match.index > currentIndex) {
        parts.push(processMarkdown(text.substring(currentIndex, match.index)));
      }
      
      // Add the colored span
      parts.push(
        <span key={match.index} className={match[1]}>
          {processMarkdown(match[2])}
        </span>
      );
      
      currentIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (currentIndex < text.length) {
      parts.push(processMarkdown(text.substring(currentIndex)));
    }

    return parts.length > 0 ? parts : processMarkdown(text);
  };

  // Process markdown-style formatting
  const processMarkdown = (text) => {
    const parts = [];
    let currentText = text;
    let key = 0;

    // Process bold (**text**)
    const boldRegex = /\*\*([^*]+)\*\*/g;
    let lastIndex = 0;
    let match;

    while ((match = boldRegex.exec(currentText)) !== null) {
      // Add text before bold
      if (match.index > lastIndex) {
        parts.push(processItalic(currentText.substring(lastIndex, match.index), key++));
      }
      
      // Add bold text
      parts.push(
        <strong key={`bold-${key++}`}>
          {processItalic(match[1], key++)}
        </strong>
      );
      
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < currentText.length) {
      parts.push(processItalic(currentText.substring(lastIndex), key++));
    }

    return parts.length > 0 ? parts : currentText;
  };

  // Process italic (*text*)
  const processItalic = (text, baseKey = 0) => {
    const parts = [];
    const italicRegex = /\*([^*]+)\*/g;
    let lastIndex = 0;
    let match;
    let key = baseKey;

    while ((match = italicRegex.exec(text)) !== null) {
      // Add text before italic
      if (match.index > lastIndex) {
        parts.push(<span key={`text-${key++}`}>{text.substring(lastIndex, match.index)}</span>);
      }
      
      // Add italic text
      parts.push(
        <em key={`italic-${key++}`}>{match[1]}</em>
      );
      
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(<span key={`text-${key++}`}>{text.substring(lastIndex)}</span>);
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <div className={`formatted-note ${className}`}>
      {renderFormattedText(text)}
    </div>
  );
};

export default FormattedNote;
