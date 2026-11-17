import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

export default function CodeSyntaxHighlight({ language, value, showLineNumbers = false, customStyle }) {
  return (
    <SyntaxHighlighter
      language={language}
      style={oneDark}
      customStyle={{
        margin: 0,
        borderRadius: 0,
        background: '#1a1a1a',
        fontSize: '0.8125rem',
        ...customStyle,
      }}
      showLineNumbers={showLineNumbers}
    >
      {value}
    </SyntaxHighlighter>
  )
}
