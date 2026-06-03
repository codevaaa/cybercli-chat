import { View, Text, TouchableOpacity, ScrollView } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { useState } from 'react'
import { Colors } from '@/constants/colors'
import { Icon } from '@/components/ui/Icon'

const c = Colors.dark

/**
 * Markdown renderer for chat — handles code blocks (copy), tables,
 * inline code, bold, headings, blockquotes, bullet/numbered lists.
 */
export function Markdown({ text }: { text: string }) {
  const blocks = parseBlocks(text)
  return (
    <View>
      {blocks.map((block, i) => {
        if (block.type === 'code') return <CodeBlock key={i} lang={block.lang!} code={block.content} />
        if (block.type === 'table') return <TableBlock key={i} raw={block.content} />
        return <InlineText key={i} text={block.content} />
      })}
    </View>
  )
}

interface Block { type: 'code' | 'table' | 'text'; content: string; lang?: string }

function parseBlocks(text: string): Block[] {
  const blocks: Block[] = []
  // First split out code blocks
  const codeParts = text.split(/(```[\w-]*\n[\s\S]*?```)/g)
  for (const part of codeParts) {
    const codeMatch = part.match(/^```([\w-]*)\n([\s\S]*?)```$/)
    if (codeMatch) {
      blocks.push({ type: 'code', lang: codeMatch[1] || 'code', content: codeMatch[2] })
      continue
    }
    // Within text, detect markdown tables (lines with | and a separator row)
    const lines = part.split('\n')
    let buffer: string[] = []
    let tableBuffer: string[] = []
    const flushText = () => { if (buffer.length) { blocks.push({ type: 'text', content: buffer.join('\n') }); buffer = [] } }
    const flushTable = () => { if (tableBuffer.length) { blocks.push({ type: 'table', content: tableBuffer.join('\n') }); tableBuffer = [] } }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const isTableRow = /^\s*\|.*\|\s*$/.test(line)
      const isSeparator = /^\s*\|?[\s:-]+\|[\s:|-]*$/.test(line)
      if (isTableRow || (isSeparator && tableBuffer.length)) {
        if (buffer.length) flushText()
        tableBuffer.push(line)
      } else {
        if (tableBuffer.length) flushTable()
        buffer.push(line)
      }
    }
    flushTable()
    flushText()
  }
  return blocks
}

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await Clipboard.setStringAsync(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <View style={{ marginVertical: 8, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: c.border }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', paddingHorizontal: 12, paddingVertical: 8 }}>
        <Text style={{ fontSize: 11, color: c.textDim, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' }}>{lang}</Text>
        <TouchableOpacity onPress={copy} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Icon name={copied ? 'check' : 'copy'} size={13} color={copied ? c.success : c.textMuted} />
          <Text style={{ fontSize: 11, color: copied ? c.success : c.textMuted, fontWeight: '600' }}>{copied ? 'Copied' : 'Copy'}</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal style={{ backgroundColor: '#0d0c0a' }} contentContainerStyle={{ padding: 14 }} showsHorizontalScrollIndicator={false}>
        <Text style={{ fontFamily: 'monospace', fontSize: 12.5, color: '#e0d6cc', lineHeight: 19 }}>{code.trimEnd()}</Text>
      </ScrollView>
    </View>
  )
}

function TableBlock({ raw }: { raw: string }) {
  const rows = raw.trim().split('\n').filter((l) => l.trim())
  // Remove separator row (---|---)
  const dataRows = rows.filter((r) => !/^\s*\|?[\s:-]+\|[\s:|-]*$/.test(r))
  const parsed = dataRows.map((r) =>
    r.split('|').map((cell) => cell.trim()).filter((_, i, arr) => !(i === 0 && arr[0] === '') && !(i === arr.length - 1 && arr[arr.length - 1] === ''))
  )
  if (!parsed.length) return null
  const header = parsed[0]
  const body = parsed.slice(1)

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
      <View style={{ borderWidth: 1, borderColor: c.border, borderRadius: 10, overflow: 'hidden' }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)' }}>
          {header.map((cell, i) => (
            <View key={i} style={{ minWidth: 110, padding: 10, borderRightWidth: i < header.length - 1 ? 1 : 0, borderRightColor: c.border }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: c.text }}>{cell}</Text>
            </View>
          ))}
        </View>
        {/* Body */}
        {body.map((row, ri) => (
          <View key={ri} style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: c.border }}>
            {row.map((cell, ci) => (
              <View key={ci} style={{ minWidth: 110, padding: 10, borderRightWidth: ci < row.length - 1 ? 1 : 0, borderRightColor: c.border }}>
                <Text style={{ fontSize: 13, color: c.textMuted }}>{cell}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  )
}

function InlineText({ text }: { text: string }) {
  if (!text.trim()) return null
  const lines = text.split('\n')
  return (
    <View>
      {lines.map((line, i) => {
        const h = line.match(/^(#{1,3})\s+(.*)/)
        if (h) {
          const level = h[1].length
          return (
            <Text key={i} style={{ fontSize: level === 1 ? 20 : level === 2 ? 17 : 15, fontWeight: '700', color: c.text, marginTop: 10, marginBottom: 4 }}>
              {renderInline(h[2])}
            </Text>
          )
        }
        const quote = line.match(/^>\s+(.*)/)
        if (quote) {
          return (
            <View key={i} style={{ flexDirection: 'row', marginVertical: 4 }}>
              <View style={{ width: 3, backgroundColor: c.accent, borderRadius: 2, marginRight: 10 }} />
              <Text style={{ fontSize: 15, color: c.textMuted, lineHeight: 22, flex: 1, fontStyle: 'italic' }}>{renderInline(quote[1])}</Text>
            </View>
          )
        }
        const b = line.match(/^[\s]*[-*]\s+(.*)/)
        if (b) {
          return (
            <View key={i} style={{ flexDirection: 'row', marginVertical: 3, paddingLeft: 4 }}>
              <Text style={{ color: c.accent, marginRight: 8, fontSize: 15, lineHeight: 22 }}>•</Text>
              <Text style={{ fontSize: 15, color: c.text, lineHeight: 22, flex: 1 }}>{renderInline(b[1])}</Text>
            </View>
          )
        }
        const n = line.match(/^[\s]*(\d+)\.\s+(.*)/)
        if (n) {
          return (
            <View key={i} style={{ flexDirection: 'row', marginVertical: 3, paddingLeft: 4 }}>
              <Text style={{ color: c.accent, marginRight: 8, fontWeight: '600', fontSize: 15, lineHeight: 22 }}>{n[1]}.</Text>
              <Text style={{ fontSize: 15, color: c.text, lineHeight: 22, flex: 1 }}>{renderInline(n[2])}</Text>
            </View>
          )
        }
        if (!line.trim()) return <View key={i} style={{ height: 8 }} />
        return (
          <Text key={i} style={{ fontSize: 15, color: c.text, lineHeight: 23 }} selectable>
            {renderInline(line)}
          </Text>
        )
      })}
    </View>
  )
}

function renderInline(line: string): React.ReactNode[] {
  const tokens = line.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g)
  return tokens.map((tok, i) => {
    if (tok.startsWith('**') && tok.endsWith('**')) {
      return <Text key={i} style={{ fontWeight: '700' }}>{tok.slice(2, -2)}</Text>
    }
    if (tok.startsWith('`') && tok.endsWith('`')) {
      return (
        <Text key={i} style={{ fontFamily: 'monospace', fontSize: 13.5, backgroundColor: 'rgba(255,255,255,0.08)', color: '#e8b89a' }}>
          {' '}{tok.slice(1, -1)}{' '}
        </Text>
      )
    }
    const link = tok.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (link) {
      return <Text key={i} style={{ color: c.accent, textDecorationLine: 'underline' }}>{link[1]}</Text>
    }
    return tok
  })
}
