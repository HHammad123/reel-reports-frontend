// Utility functions for formatting AI responses and other content

// Function to format AI response content with proper formatting
export const formatAIResponse = (content) => {
  if (!content || typeof content !== 'string') return content;
  // Normalize common duplication artifacts like repeated all-caps titles
  try {
    // Collapse patterns like "VIDEO BLUEPRINTVIDEO BLUEPRINT" to a single occurrence
    content = content.replace(/(\b[A-Z][A-Z ]{2,}\b)\1/g, '$1');
  } catch (_) { /* noop */ }

  // Split content into lines for processing
  const lines = content.split('\n');
  
  return (
    <div className="ai-message-content">
      {lines.map((line, index) => {
        // Handle bullet points and numbered lists
        if (line.trim().match(/^[\-\*•]\s/)) {
          return (
            <div key={index} className="ai-bullet-point">
              <span className="ai-bullet-point bullet">•</span>
              <span className="ai-bullet-point content">{formatLine(line.replace(/^[\-\*•]\s/, ''))}</span>
            </div>
          );
        }
        
        // Handle numbered lists
        if (line.trim().match(/^\d+\.\s/)) {
          const number = line.match(/^(\d+)\.\s/)[1];
          const text = line.replace(/^\d+\.\s/, '');
          return (
            <div key={index} className="ai-numbered-list">
              <span className="ai-numbered-list number">{number}.</span>
              <span className="ai-numbered-list content">{formatLine(text)}</span>
            </div>
          );
        }
        
        // Handle empty lines
        if (line.trim() === '') {
          return <div key={index} className="ai-empty-line"></div>;
        }
        
        // Handle headers (lines that end with colon and are short)
        if (line.trim().match(/^[A-Z][^:]*:$/) && line.trim().length < 50) {
          return (
            <div key={index} className="ai-header">
              {line.trim().replace(':', '')}
            </div>
          );
        }
        
        // Handle regular lines
        return (
          <div key={index} className="ai-regular-line">
            {formatLine(line)}
          </div>
        );
      })}
    </div>
  );
};

// Function to format individual line content (bold text, italic, etc.)
export const formatLine = (line) => {
  if (!line || typeof line !== 'string') return line;

  // Single combined pass for bold (**, __) and italic (*, _)
  const parts = [];
  let lastIndex = 0;
  const tokenRegex = /(\*\*|__)(.+?)\1|(\*|_)(.+?)\3/g;
  let match;

  while ((match = tokenRegex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      parts.push(line.slice(lastIndex, match.index));
    }

    if (match[1]) {
      // Bold
      parts.push(
        <strong key={`bold-${match.index}`} className="ai-bold">{match[2]}</strong>
      );
    } else if (match[3]) {
      // Italic
      parts.push(
        <em key={`italic-${match.index}`} className="ai-italic">{match[4]}</em>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < line.length) {
    parts.push(line.slice(lastIndex));
  }

  return parts.length ? parts : line;
};

// Function to format document summaries with better structure
export const formatDocumentSummary = (summary) => {
  if (!summary || typeof summary !== 'string') return summary;
  
  // Split into sections if there are clear separators
  const sections = summary.split(/(?=^[A-Z][^a-z])/m);
  
  return (
    <div className="ai-message-content">
      {sections.map((section, index) => {
        if (!section.trim()) return null;
        
        // Check if this is a header (starts with capital letter and ends with colon)
        const isHeader = /^[A-Z][^:]*:$/.test(section.trim());
        
        if (isHeader) {
          return (
            <div key={index} className="ai-header">
              {section.trim().replace(':', '')}
            </div>
          );
        } else {
          return (
            <div key={index} className="ai-regular-line">
              {formatAIResponse(section.trim())}
            </div>
          );
        }
      }).filter(Boolean)}
    </div>
  );
};

// Function to clean and format raw AI text
export const cleanAndFormatText = (text) => {
  if (!text || typeof text !== 'string') return text;
  
  // Remove extra whitespace and normalize line breaks
  let cleaned = text
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Remove multiple empty lines
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
  
  return cleaned;
};

// Function to format code blocks or technical content
export const formatCodeBlock = (text) => {
  if (!text || typeof text !== 'string') return text;
  
  // Check if text contains code-like patterns
  if (text.includes('```') || text.includes('`') || text.includes('{') || text.includes('[')) {
    return (
      <div className="ai-code-block">
        {text}
      </div>
    );
  }
  
  return text;
};
