import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import EmojiPicker from 'emoji-picker-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Send, Smile } from 'lucide-react'

export function ChatPanel({ open, onOpenChange, patient }) {
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (open && patient) {
      fetchMessages()
    }
  }, [open, patient])

  const fetchMessages = async () => {
    const token = localStorage.getItem('token')
    try {
      const res = await axios.get(`http://localhost:8000/patients/${patient.id}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setMessages(res.data)
      scrollToBottom()
    } catch (error) {
      console.error(error)
    }
  }

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollIntoView({ behavior: 'smooth' })
      }
    }, 100)
  }

  const handleSend = async (e) => {
    e?.preventDefault()
    if (!newMessage.trim()) return

    const token = localStorage.getItem('token')
    try {
      await axios.post(`http://localhost:8000/patients/${patient.id}/messages`, 
        { content: newMessage, direction: 'out' }, 
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setNewMessage('')
      setShowEmojiPicker(false)
      fetchMessages()
    } catch (error) {
      console.error(error)
    }
  }

  const onEmojiClick = (emojiObject) => {
    setNewMessage(prev => prev + emojiObject.emoji)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] glass border-l border-white/10 text-white flex flex-col p-0 z-[100]">
        <SheetHeader className="p-6 border-b border-white/10 bg-black/20">
          <SheetTitle className="text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Chat con {patient?.name}
          </SheetTitle>
          <p className="text-sm text-zinc-400">{patient?.phone}</p>
        </SheetHeader>
        
        <ScrollArea className="flex-1 p-6 flex flex-col gap-4">
          {messages.length === 0 ? (
             <div className="text-center text-zinc-500 text-sm mt-10 flex flex-col items-center">
               <div className="p-3 bg-white/5 rounded-full mb-3">
                 <Send className="w-6 h-6 text-zinc-400" />
               </div>
               No hay mensajes aún.<br/>Envía el primer WhatsApp.
             </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`flex w-full mb-4 ${msg.direction === 'out' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2 shadow-sm ${
                  msg.direction === 'out' 
                    ? 'bg-green-600 text-white rounded-tr-sm' 
                    : 'bg-white/10 text-white rounded-tl-sm border border-white/5'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <p className="text-[10px] opacity-70 mt-1 text-right">
                    {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={scrollRef} />
        </ScrollArea>

        <div className="p-4 border-t border-white/10 bg-black/20 relative">
          {showEmojiPicker && (
            <div className="absolute bottom-[80px] right-4 z-50 shadow-2xl">
              <EmojiPicker onEmojiClick={onEmojiClick} theme="dark" />
            </div>
          )}
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <Button 
              type="button" 
              variant="ghost" 
              size="icon" 
              className="text-zinc-400 hover:text-white shrink-0"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <Smile className="w-5 h-5" />
            </Button>
            <Input 
              value={newMessage} 
              onChange={e => setNewMessage(e.target.value)} 
              placeholder="Escribe un mensaje..." 
              className="bg-white/5 border-white/10 text-white flex-1 rounded-full px-4 min-w-0"
            />
            <Button type="submit" size="icon" className="rounded-full bg-green-500 hover:bg-green-600 text-white shrink-0">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  )
}
