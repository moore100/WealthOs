import { useNavigate } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
export default function GlobalAIButton() {
  const navigate = useNavigate()

  return (
    <button
      onClick={() => navigate('/ai-chat')}
      className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all hover:scale-105"
      title="Open AI Chat"
    >
      <Sparkles className="h-5 w-5" />
    </button>
  )
}
