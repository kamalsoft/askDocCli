import React, { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import mermaid from 'mermaid';

const MarkdownViewer = ({ content, onHeadingClick }) => {
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: 'default',
      securityLevel: 'loose',
    });
  }, []);

  useEffect(() => {
    if (content) {
      const timer = setTimeout(() => {
        const containers = document.querySelectorAll('.mermaid');
        if (containers.length > 0) mermaid.contentLoaded();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [content]);

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeSlug]}
      components={{
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          const lang = match ? match[1] : '';

          if (lang === 'mermaid') {
            return (
              <div className="mermaid" style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', margin: '1.5rem 0', display: 'flex', justifyContent: 'center' }}>
                {String(children).replace(/\n$/, '')}
              </div>
            );
          }

          return !inline && match ? (
            <SyntaxHighlighter
              style={vscDarkPlus}
              language={lang}
              PreTag="div"
              customStyle={{ borderRadius: '8px', margin: '1.5rem 0' }}
              {...props}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          ) : (
            <code className={className} {...props}>
              {children}
            </code>
          );
        },
        h1: (props) => <h1 {...props} onClick={() => onHeadingClick?.(props.id)} style={{ cursor: onHeadingClick ? 'pointer' : 'default' }} />,
        h2: (props) => <h2 {...props} onClick={() => onHeadingClick?.(props.id)} style={{ cursor: onHeadingClick ? 'pointer' : 'default' }} />,
        h3: (props) => <h3 {...props} onClick={() => onHeadingClick?.(props.id)} style={{ cursor: onHeadingClick ? 'pointer' : 'default' }} />,
        h4: (props) => <h4 {...props} onClick={() => onHeadingClick?.(props.id)} style={{ cursor: onHeadingClick ? 'pointer' : 'default' }} />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

export default MarkdownViewer;