import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, Loader2 } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { User } from '../types';

interface Message {
  role: 'user' | 'model';
  text: string;
}

interface ChatAssistantProps {
  currentUser: User | null;
}

const ChatAssistant: React.FC<ChatAssistantProps> = ({ currentUser }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Personalize greeting when user changes
  useEffect(() => {
    if (currentUser) {
      const firstName = currentUser.name.split(' ')[0];
      setMessages([{
        role: 'model',
        text: `Hi ${firstName}! I am SafeGuard AI. I see you are logged in as a ${currentUser.role.toLowerCase()}. How can I assist you today?`
      }]);
    } else {
      setMessages([{
        role: 'model',
        text: 'Hello! I am SafeGuard AI. How can I assist you with your insurance, safety, or claims today?'
      }]);
    }
  }, [currentUser]);

  const handleSend = async () => {
    if (!input.trim() || !process.env.API_KEY) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const roleContext = currentUser 
        ? `The user's name is ${currentUser.name}. They are logged in as a ${currentUser.role}.` 
        : "The user is a guest (not logged in).";
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [{ text: userMessage }]
          }
        ],
        config: {
          systemInstruction: `You are SafeGuard AI, an advanced assistant for a Smart Accident Detection & Insurance Claim platform. 
          ${roleContext}
          Your goal is to help users understand vehicle safety, the insurance claim process, and interpret accident data.
          Always address the user by name if known.
          Keep responses professional, empathetic (especially regarding accidents), and concise.`
        }
      });

      const text = response.text || "I apologize, I couldn't process that request.";
      setMessages(prev => [...prev, { role: 'model', text }]);
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { role: 'model', text: "I'm having trouble connecting to the server. Please try again later." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-lg transition-all transform hover:scale-105 flex items-center gap-2"
        >
          <MessageSquare size={24} />
          <span className="font-medium hidden md:inline">AI Assistant</span>
        </button>
      )}

      {isOpen && (
        <div className="bg-white w-80 md:w-96 h-[500px] rounded-2xl shadow-2xl flex flex-col border border-gray-200 overflow-hidden animate-fade-in-up">
          {/* Header */}
          <div className="bg-indigo-600 p-4 flex justify-between items-center text-white">
            <div className="flex items-center gap-2">
              <Bot size={20} />
              <h3 className="font-semibold">SafeGuard AI</h3>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-indigo-700 p-1 rounded">
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg p-3 text-sm ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-br-none' 
                    : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 p-3 rounded-lg rounded-bl-none shadow-sm flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin text-indigo-600" />
                  <span className="text-xs text-gray-500">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t border-gray-200">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about claims, safety..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button 
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatAssistant;