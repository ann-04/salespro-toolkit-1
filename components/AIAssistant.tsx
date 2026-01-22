
import React, { useState, useRef, useEffect } from 'react';
import { DataService } from '../services/api';
import { Message, Product } from '../types';

const AIAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', content: 'Hello! I am your SalesPro Assistant. I can help you with product information, sales strategies, and general queries. How can I assist you today?' }
  ]);
  const [products, setProducts] = useState<Product[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    DataService.getProducts().then(setProducts).catch(console.error);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Construct dynamic context
      const productContext = products.map(p =>
        `- Product: ${p.name}\n  Category: ${p.category}\n  Problem Solved: ${p.problemSolved}\n  Description: ${p.description}`
      ).join('\n\n');

      const context = `
        You are a highly knowledgeable AI assistant for the SalesPro Toolkit.
        
        You have access to the following product portfolio:
        ${productContext}
        
        Your Goal: Help sales professionals by answering questions about these products, suggesting sales strategies, and providing general assistance.
        
        Guidelines:
        - If the user asks about a specific product in the portfolio, use the provided context.
        - If the user asks a general question (e.g., "Draft a cold email", "Explain cloud security"), use your general knowledge to answer helpfully.
        - Be professional, concise, and persuasive.
      `;

      // Call Backend API
      const result = await DataService.chatWithAI(messages.concat(userMsg), context);

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.response || "I'm sorry, I couldn't process that request."
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { id: 'err', role: 'assistant', content: "Error connecting to AI. Please check your network." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
      <header className="p-4 bg-slate-900 text-white flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="font-bold">Conversational Assistant</h3>
        </div>
        <span className="text-xs text-slate-400 px-2 py-1 bg-slate-800 rounded">Powered by Gemini</span>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-4 rounded-2xl shadow-sm ${m.role === 'user'
              ? 'bg-blue-600 text-white rounded-tr-none'
              : 'bg-slate-100 text-slate-800 rounded-tl-none'
              }`}>
              <p className="text-sm leading-relaxed">{m.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 p-4 rounded-2xl rounded-tl-none animate-pulse text-slate-400 text-xs">
              AI is thinking...
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      <div className="p-4 border-t border-slate-100">
        <div className="flex space-x-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1 px-4 py-3 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ask anything about products, sales strategies..."
          />
          <button
            onClick={handleSend}
            disabled={isLoading}
            className="bg-slate-900 text-white p-3 rounded-xl hover:bg-slate-800 transition disabled:opacity-50"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
