import { Send, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { AiOrb } from '../components/ui/AiOrb'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { InlineError } from '../components/ui/ErrorState'
import { PageHeader } from '../components/ui/PageHeader'
import { getApiErrorMessage } from '../services/api'
import { fetchAssistantCapabilities, sendChatMessage, type ChatTurn } from '../services/assistant'
import type { ChatSource } from '../types'

interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
  mode?: 'local' | 'llm'
  sources?: ChatSource[]
}

const FALLBACK_PROMPTS = [
  'What should I learn next?',
  'Which roles match my current skills?',
  'What skills appear most frequently in my recommended jobs?',
  'How can I improve my resume?',
]

export default function CareerAssistant() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [prompts, setPrompts] = useState<string[]>(FALLBACK_PROMPTS)
  const [llmEnabled, setLlmEnabled] = useState<boolean | null>(null)
  const [capabilityNote, setCapabilityNote] = useState<string | null>(null)

  const endRef = useRef<HTMLDivElement>(null)
  const nextId = useRef(1)

  useEffect(() => {
    let cancelled = false
    fetchAssistantCapabilities()
      .then((capabilities) => {
        if (cancelled) return
        setLlmEnabled(capabilities.llm_enabled)
        setCapabilityNote(capabilities.note)
        if (capabilities.suggested_prompts.length) {
          setPrompts(capabilities.suggested_prompts)
        }
      })
      .catch(() => {
        // Capabilities are informational - the chat still works without them.
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, sending])

  const send = async (text: string) => {
    const message = text.trim()
    if (!message || sending) return

    const userMessage: Message = { id: nextId.current++, role: 'user', content: message }
    setMessages((current) => [...current, userMessage])
    setInput('')
    setSending(true)
    setError(null)

    // Build the history from everything said before this turn.
    const history: ChatTurn[] = [...messages, userMessage].map((item) => ({
      role: item.role,
      content: item.content,
    }))

    try {
      const response = await sendChatMessage(message, history)
      setMessages((current) => [
        ...current,
        {
          id: nextId.current++,
          role: 'assistant',
          content: response.reply,
          mode: response.mode,
          sources: response.sources,
        },
      ])
      if (response.suggested_prompts.length) setPrompts(response.suggested_prompts)
    } catch (caught) {
      setError(getApiErrorMessage(caught))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI career assistant"
        subtitle="Grounded in your profile, skills, roadmap and assessment results."
        actions={
          llmEnabled !== null && (
            <Badge tone={llmEnabled ? 'success' : 'brand'}>
              {llmEnabled ? 'LLM mode' : 'Local reasoning mode'}
            </Badge>
          )
        }
      />

      {capabilityNote && (
        <p className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-[11px] leading-relaxed text-slate-500">
          {capabilityNote}
        </p>
      )}

      <section className="sb-glass flex min-h-[26rem] flex-col rounded-2xl p-5">
        <div className="flex-1 space-y-4 overflow-y-auto pr-1">
          {messages.length === 0 && (
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <div className="sb-float">
                <AiOrb size={120} />
              </div>
              <div>
                <h2 className="font-display text-base font-semibold text-white">
                  Ask about your career data
                </h2>
                <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-400">
                  Every answer is built from your own stored profile, skills, roadmap and
                  assessment results - not generic advice.
                </p>
              </div>
            </div>
          )}

          {messages.map((message) =>
            message.role === 'user' ? (
              <div key={message.id} className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-brand-500/20 px-4 py-2.5 text-sm text-white ring-1 ring-brand-400/25">
                  {message.content}
                </div>
              </div>
            ) : (
              <div key={message.id} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-aqua-500">
                  <Sparkles className="h-3.5 w-3.5 text-white" />
                </span>
                <div className="max-w-[85%] space-y-2">
                  <div className="rounded-2xl rounded-tl-sm border border-white/8 bg-white/5 px-4 py-3">
                    <p className="whitespace-pre-line text-sm leading-relaxed text-slate-200">
                      {message.content}
                    </p>
                  </div>

                  {(message.sources?.length ?? 0) > 0 && (
                    <ul className="flex flex-wrap gap-1.5">
                      {message.sources?.map((source, index) => (
                        <li key={index}>
                          <span
                            title={source.detail}
                            className="inline-flex rounded-full bg-white/6 px-2.5 py-1 text-[10px] text-slate-400 ring-1 ring-white/10"
                          >
                            {source.label}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {message.mode === 'local' && (
                    <p className="text-[10px] text-slate-600">
                      Answered with on-device reasoning from your stored data.
                    </p>
                  )}
                </div>
              </div>
            ),
          )}

          {sending && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Sparkles className="h-3.5 w-3.5 animate-pulse text-brand-300" />
              Thinking…
            </div>
          )}

          <div ref={endRef} />
        </div>

        {error && (
          <div className="mt-4">
            <InlineError message={error} />
          </div>
        )}

        {prompts.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {prompts.slice(0, 5).map((prompt) => (
              <button
                key={prompt}
                type="button"
                disabled={sending}
                onClick={() => void send(prompt)}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-slate-300 transition hover:border-brand-400/30 hover:text-white disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        <form
          className="mt-4 flex items-end gap-2 border-t border-white/8 pt-4"
          onSubmit={(event) => {
            event.preventDefault()
            void send(input)
          }}
        >
          <label htmlFor="assistant-input" className="sr-only">
            Ask the career assistant
          </label>
          <textarea
            id="assistant-input"
            rows={1}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                void send(input)
              }
            }}
            placeholder="Ask about your skills, gaps, roadmap or opportunities…"
            className="max-h-32 flex-1 resize-y rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:border-brand-400/40 focus:outline-none"
          />
          <Button type="submit" loading={sending} icon={<Send className="h-4 w-4" />}>
            Send
          </Button>
        </form>
      </section>
    </div>
  )
}
