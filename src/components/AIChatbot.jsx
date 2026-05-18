import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Minimize2, Sparkles } from 'lucide-react';
import styles from './AIChatbot.module.css';

function buildHostelContext(hostel) {
  if (!hostel) return '';
  return `You are a helpful assistant for StuNest, India's student housing platform.
Current hostel: "${hostel.name}"
Address: ${hostel.address}
Price: Rs.${hostel.price?.toLocaleString('en-IN')}/month
Type: ${hostel.type?.toUpperCase()} for ${hostel.category === 'both' ? 'boys & girls' : hostel.category}
Rating: ${hostel.rating} stars (${hostel.review_count || 0} reviews)
Facilities: ${(hostel.facilities || []).join(', ')}
Distance from college: ${hostel.distance != null ? hostel.distance + ' km' : 'varies'}
Vacancy: ${hostel.vacancy_count != null ? hostel.vacancy_count + ' rooms available' : 'contact owner'}
Phone: ${hostel.phone || 'not listed'}
${hostel.is_verified ? 'This hostel is VERIFIED by StuNest.' : ''}
${hostel.is_premium ? 'This is a PREMIUM listing.' : ''}
Answer questions concisely (under 3 sentences). For visit scheduling, direct students to WhatsApp/call.`;
}

function localAnswer(question) {
  const q = question.toLowerCase();
  if (q.includes('price') || q.includes('rent') || q.includes('cost')) return 'Monthly rents on StuNest range from Rs.4,500 to Rs.15,000 depending on location, facilities, and room type. Use the filters on the search page to find options within your budget.';
  if (q.includes('book') || q.includes('reserve') || q.includes('token')) return 'You can reserve a room by paying a Rs.200 token on the hostel details page. This holds the room for 48 hours while you confirm with the owner.';
  if (q.includes('visit') || q.includes('tour') || q.includes('see')) return 'Click "WhatsApp Owner" on the hostel details page to schedule a visit directly — no middlemen.';
  if (q.includes('verif')) return 'StuNest verifies hostels through physical inspection. Look for the green Verified badge on listings.';
  if (q.includes('food') || q.includes('mess') || q.includes('meal')) return 'Many hostels provide 3 meals a day. Check the Food Menu tab on the hostel details page to see the weekly schedule.';
  if (q.includes('wifi') || q.includes('internet')) return 'Most premium hostels on StuNest offer high-speed Wi-Fi. Look for the Wi-Fi tag in the facilities section.';
  if (q.includes('girls') || q.includes('women') || q.includes('female')) return 'StuNest has dedicated Girls hostels and PGs with female wardens and CCTV. Use the Girls filter on the search page.';
  if (q.includes('boys') || q.includes('male')) return 'We have many Boys-only hostels and PGs near major colleges. Apply the Boys filter on the search page.';
  if (q.includes('vacancy') || q.includes('available') || q.includes('room')) return 'Room availability is shown in real-time on each listing. A green badge indicates rooms are available.';
  if (q.includes('distance') || q.includes('walk') || q.includes('km')) return 'Distances are calculated from your selected college to each hostel. Results are sorted by nearest first by default.';
  if (q.includes('cancel') || q.includes('refund')) return 'Token bookings are refundable if cancelled within 24 hours. Check the hostel policy by contacting the owner.';
  if (q.includes('grievance') || q.includes('complaint')) return 'You can file a grievance in the Grievance tab on any hostel details page. Unresolved issues affect the hostel listing status.';
  if (q.includes('hello') || q.includes('hi') || q.includes('hey')) return 'Hi! I am the StuNest AI assistant. Ask me anything about hostels, pricing, booking, or facilities.';
  if (q.includes('thank')) return 'You are welcome! Let me know if you have any other questions.';
  return 'For specific details, check the hostel details page or contact the owner via WhatsApp. You can also search and filter hostels by price, facilities, and distance on our search page.';
}

async function callGroqAPI(messages, systemPrompt) {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  if (backendUrl) {
    try {
      const response = await fetch(`${backendUrl.replace(/\/$/, '')}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages, systemPrompt })
      });
      if (response.ok) {
        const data = await response.json();
        return data.reply || null;
      }
    } catch (e) {
      console.warn("Railway backend AI proxy failed, falling back to client-direct API", e);
    }
  }

  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) return null;
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))
        ],
        max_tokens: 200,
        temperature: 0.6,
      })
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data?.choices?.[0]?.message?.content || null;
  } catch {
    return null;
  }
}

export default function AIChatbot({ hostel }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: hostel
      ? `Hi! I can answer questions about ${hostel.name} — pricing, facilities, vacancy, food, or how to book.`
      : `Hi! I am the StuNest AI assistant. Ask me anything about finding student hostels, pricing, booking, or facilities.`
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 100); }, [open]);

  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput('');
    const newMessages = [...messages, { role: 'user', content: q }];
    setMessages(newMessages);
    setLoading(true);

    const systemPrompt = hostel
      ? buildHostelContext(hostel)
      : 'You are a helpful assistant for StuNest, India\'s student housing platform. Help students find hostels, understand pricing, book rooms, and answer accommodation questions. Keep answers under 3 sentences.';

    const aiReply = await callGroqAPI(newMessages, systemPrompt);
    setMessages(prev => [...prev, { role: 'assistant', content: aiReply || localAnswer(q) }]);
    setLoading(false);
  };

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  const quickPrompts = hostel
    ? ['What facilities are available?', 'Is there any vacancy?', 'How do I book a room?', 'What is the food like?']
    : ['How do I find hostels near my college?', 'What is a token booking?', 'Are hostels verified?', 'How much does it cost?'];

  return (
    <>
      <button className={`${styles.fabBtn} ${open ? styles.fabOpen : ''}`} onClick={() => setOpen(o => !o)} aria-label="AI Chat">
        {open ? <X size={22} /> : <MessageCircle size={22} />}
        {!open && <span className={styles.fabPulse} />}
      </button>

      {open && (
        <div className={styles.chatWindow}>
          <div className={styles.chatHeader}>
            <div className={styles.headerLeft}>
              <div className={styles.botAvatar}><Bot size={18} /></div>
              <div>
                <p className={styles.headerTitle}>StuNest AI <span className={styles.poweredBy}>powered by Groq</span></p>
                <p className={styles.headerSub}>{hostel ? hostel.name : 'Hostel Discovery Assistant'}</p>
              </div>
            </div>
            <button className={styles.minimizeBtn} onClick={() => setOpen(false)}><Minimize2 size={16} /></button>
          </div>

          <div className={styles.messages}>
            {messages.map((m, i) => (
              <div key={i} className={`${styles.msgRow} ${m.role === 'user' ? styles.msgUser : styles.msgBot}`}>
                {m.role === 'assistant' && <div className={styles.msgAvatar}><Bot size={14} /></div>}
                <div className={styles.msgBubble}>
                  {m.content.split('\n').map((line, j) => <p key={j}>{line}</p>)}
                </div>
                {m.role === 'user' && <div className={`${styles.msgAvatar} ${styles.userAvatar}`}><User size={14} /></div>}
              </div>
            ))}
            {loading && (
              <div className={`${styles.msgRow} ${styles.msgBot}`}>
                <div className={styles.msgAvatar}><Bot size={14} /></div>
                <div className={`${styles.msgBubble} ${styles.typing}`}><span /><span /><span /></div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {messages.length === 1 && (
            <div className={styles.quickPrompts}>
              {quickPrompts.map((q, i) => (
                <button key={i} className={styles.promptBtn} onClick={() => { setInput(q); setTimeout(() => inputRef.current?.focus(), 50); }}>{q}</button>
              ))}
            </div>
          )}

          <div className={styles.inputArea}>
            <input ref={inputRef} className={styles.chatInput} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey} placeholder="Ask anything about hostels..." disabled={loading} />
            <button className={styles.sendBtn} onClick={send} disabled={!input.trim() || loading}><Send size={16} /></button>
          </div>
        </div>
      )}
    </>
  );
}
