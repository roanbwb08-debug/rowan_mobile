import React, { useState } from 'react'
import Markdown from 'react-markdown'
import { Check, Copy } from 'lucide-react'

interface RowanMarkdownProps {
  content: string
  theme?: 'light' | 'dark'
}

interface CodeBlockProps {
  language?: string
  value: string
  theme?: 'light' | 'dark'
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language = 'text', value, theme = 'light' }) => {
  const [copied, setCopied] = useState(false)
  const isDark = theme === 'dark'

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
    }
  }

  return (
    <div
      className={`my-3 rounded-xl border overflow-hidden text-xs font-mono transition-all ${
        isDark
          ? 'bg-[#0f141c] border-zinc-800 text-zinc-200'
          : 'bg-[#f8fafc] border-zinc-200 text-zinc-800'
      }`}
    >
      {/* Top Code Block Header */}
      <div
        className={`flex items-center justify-between px-3 py-1.5 border-b text-[11px] select-none ${
          isDark
            ? 'bg-[#151b26] border-zinc-800 text-zinc-400'
            : 'bg-zinc-100/90 border-zinc-200 text-zinc-600'
        }`}
      >
        <span className="font-semibold uppercase tracking-wider">{language || 'code'}</span>
        <button
          onClick={handleCopy}
          type="button"
          aria-label={copied ? 'Copied to clipboard' : 'Copy code to clipboard'}
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition-all cursor-pointer ${
            copied
              ? 'text-emerald-500 font-bold'
              : isDark
              ? 'hover:bg-zinc-800 text-zinc-300'
              : 'hover:bg-zinc-200 text-zinc-700'
          }`}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Text Content */}
      <pre className="p-3.5 overflow-x-auto text-[12px] leading-relaxed whitespace-pre font-mono">
        <code>{value}</code>
      </pre>
    </div>
  )
}

export const RowanMarkdown: React.FC<RowanMarkdownProps> = ({ content, theme = 'light' }) => {
  const isDark = theme === 'dark'

  return (
    <div
      className={`text-[13px] leading-relaxed select-text ${
        isDark ? 'text-zinc-200' : 'text-zinc-800'
      }`}
    >
      <Markdown
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '')
            const isInline = !match && typeof children === 'string' && !children.includes('\n')

            if (isInline) {
              return (
                <code
                  className={`px-1.5 py-0.5 rounded text-[11px] font-mono border ${
                    isDark
                      ? 'bg-zinc-900 border-zinc-800 text-cyan-300'
                      : 'bg-blue-50 border-blue-100 text-blue-700'
                  }`}
                  {...props}
                >
                  {children}
                </code>
              )
            }

            const codeText = String(children).replace(/\n$/, '')
            return (
              <CodeBlock
                language={match ? match[1] : ''}
                value={codeText}
                theme={theme}
              />
            )
          },
          p({ children }) {
            return <p className="mb-2.5 last:mb-0 leading-relaxed">{children}</p>
          },
          h1({ children }) {
            return (
              <h1 className={`text-base font-bold mt-4 mb-2 first:mt-0 ${isDark ? 'text-white' : 'text-zinc-950'}`}>
                {children}
              </h1>
            )
          },
          h2({ children }) {
            return (
              <h2 className={`text-sm font-bold mt-3.5 mb-1.5 first:mt-0 ${isDark ? 'text-white' : 'text-zinc-950'}`}>
                {children}
              </h2>
            )
          },
          h3({ children }) {
            return (
              <h3 className={`text-xs font-bold mt-3 mb-1 first:mt-0 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                {children}
              </h3>
            )
          },
          ul({ children }) {
            return <ul className="list-disc list-inside space-y-1 mb-2.5 pl-1">{children}</ul>
          },
          ol({ children }) {
            return <ol className="list-decimal list-inside space-y-1.5 mb-2.5 pl-1 font-normal">{children}</ol>
          },
          li({ children }) {
            return <li className="leading-relaxed">{children}</li>
          },
          blockquote({ children }) {
            return (
              <blockquote
                className={`border-l-2 pl-3 my-2.5 italic text-xs ${
                  isDark
                    ? 'border-blue-500 text-zinc-400 bg-zinc-900/30'
                    : 'border-blue-600 text-zinc-600 bg-blue-50/40'
                } py-1 rounded-r`}
              >
                {children}
              </blockquote>
            )
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto my-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
                  {children}
                </table>
              </div>
            )
          },
          thead({ children }) {
            return <thead className={isDark ? 'bg-zinc-900' : 'bg-zinc-100'}>{children}</thead>
          },
          th({ children }) {
            return (
              <th className={`px-3 py-2 text-left font-bold uppercase text-[10px] tracking-wider ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                {children}
              </th>
            )
          },
          td({ children }) {
            return (
              <td className={`px-3 py-2 border-t text-[11px] ${isDark ? 'border-zinc-800 text-zinc-300' : 'border-zinc-100 text-zinc-800'}`}>
                {children}
              </td>
            )
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
              >
                {children}
              </a>
            )
          },
          strong({ children }) {
            return <strong className={`font-bold ${isDark ? 'text-white' : 'text-zinc-950'}`}>{children}</strong>
          },
          em({ children }) {
            return <em className="italic">{children}</em>
          }
        }}
      >
        {content}
      </Markdown>
    </div>
  )
}
