import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, ShieldCheck, Siren, FileText, Car, Users, LogOut, Menu, X, 
  Activity, AlertTriangle, Key, MapPin, CheckCircle, Clock, CreditCard, 
  Settings, Database, Bell, Upload, ChevronRight, Play, Cpu, Lock,
  Search, Filter, Download, FileCheck, Check, XCircle, AlertOctagon,
  Zap, DollarSign, Mail, Phone, Globe, Edit2, Save, Trash2, Plus, ChevronDown, Eye, ExternalLink, Map, ShieldAlert, Shield,
  Sparkles, Camera, Scan, Wifi, WifiOff, ServerCrash, CloudUpload, EyeOff, RefreshCw
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import { GoogleGenAI } from "@google/genai";
import { doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, collection, onSnapshot, query, where, Timestamp, writeBatch } from 'firebase/firestore'; 

import { Role, User, Accident, Claim, ClaimStatus, VerificationStatus, Severity, View, Vehicle, BlockchainLog } from './types';
import { MOCK_USERS, MOCK_ACCIDENTS, MOCK_CLAIMS, MOCK_VEHICLES, MOCK_NOTIFICATIONS, MOCK_BLOCKCHAIN_LOGS } from './constants';
import DashboardCard from './components/DashboardCard';
import ChatAssistant from './components/ChatAssistant';
import { db, isMock, auth } from './firebase';
import { loginUser, logoutUser, registerUser, loginWithGoogle, resetPassword } from './authService';

// --- Types for Modals ---
type ModalType = 
  | 'NEW_CLAIM' | 'VIEW_CLAIM' | 'VIEW_ACCIDENT' | 'MANAGE_VEHICLE' 
  | 'ADD_USER' | 'EDIT_USER' | 'DELETE_USER' | 'RENEW_INSURANCE'
  | null;

type SystemStatus = 'ONLINE' | 'DB_DOWN' | 'OFFLINE';

// --- Toast System ---
interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

const ToastContainer = ({ toasts, removeToast }: { toasts: Toast[], removeToast: (id: number) => void }) => (
  <div className="fixed top-24 right-6 z-[100] flex flex-col gap-2">
    {toasts.map(t => (
      <div key={t.id} className={`min-w-[300px] p-4 rounded-xl shadow-2xl border flex items-center gap-3 animate-fade-in-left backdrop-blur-md ${
        t.type === 'success' ? 'bg-emerald-900/90 border-emerald-500 text-white' : 
        t.type === 'error' ? 'bg-rose-900/90 border-rose-500 text-white' : 
        'bg-slate-800/90 border-indigo-500 text-white'
      }`}>
        {t.type === 'success' ? <CheckCircle size={20} className="text-emerald-400" /> : 
         t.type === 'error' ? <AlertOctagon size={20} className="text-rose-400" /> : 
         <Bell size={20} className="text-indigo-400" />}
        <span className="font-medium text-sm">{t.message}</span>
        <button onClick={() => removeToast(t.id)} className="ml-auto opacity-60 hover:opacity-100"><X size={16} /></button>
      </div>
    ))}
  </div>
);

// --- Modal Component ---
const Modal = ({ title, onClose, children }: { title: string, onClose: () => void, children?: React.ReactNode }) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
    <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto flex flex-col animate-scale-in">
      <div className="flex justify-between items-center p-6 border-b border-slate-700 bg-slate-900/50">
        <h3 className="text-xl font-bold text-white">{title}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition">
          <X size={24} />
        </button>
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  </div>
);

// --- Shared Components ---

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    'Active': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    'Approved': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    'Verified': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    'Pending': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'Under Review': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'Repair': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    'Rejected': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    'Critical': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    'Severe': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    'Moderate': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'Minor': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    'Unverified': 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  };
  
  const defaultStyle = 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || defaultStyle}`}>
      {status}
    </span>
  );
};

const Table = ({ headers, children }: { headers: string[], children?: React.ReactNode }) => (
  <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-slate-400">
        <thead className="bg-slate-900/50 text-xs uppercase font-semibold text-slate-500">
          <tr>
            {headers.map((h, i) => <th key={i} className="px-6 py-4 tracking-wider">{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700">
          {children}
        </tbody>
      </table>
    </div>
  </div>
);

interface SidebarItemProps {
  view: View;
  label: string;
  icon: React.ElementType;
  active: boolean;
  onClick: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ label, icon: Icon, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
      active 
        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' 
        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`}
  >
    <Icon size={20} />
    {label}
  </button>
);

// --- Public Pages Components ---

const HowItWorksView = () => (
  <div className="min-h-screen bg-slate-900 text-white pt-24 pb-12 px-4">
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold text-center mb-12">How SafeGuard Works</h1>
      <div className="space-y-12 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-indigo-500 before:to-transparent">
        {[
          { icon: Car, title: "1. Accident Detected", desc: "IoT sensors on the vehicle detect impact G-force and sudden deceleration in real-time." },
          { icon: Cpu, title: "2. AI Analysis", desc: "Our Cloud AI analyzes sensor data to determine severity, vehicle damage, and passenger risk." },
          { icon: Database, title: "3. Blockchain Record", desc: "A tamper-proof hash of the accident data is instantly minted to the blockchain for legal proof." },
          { icon: Siren, title: "4. Emergency Response", desc: "Alerts are sent to nearest hospitals and police stations with precise GPS coordinates." },
          { icon: DollarSign, title: "5. Instant Claim", desc: "Insurance claims are auto-generated and processed based on the verified AI & Blockchain data." }
        ].map((step, i) => (
          <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className="flex items-center justify-center w-10 h-10 rounded-full border border-indigo-500 bg-slate-900 group-[.is-active]:bg-indigo-600 text-slate-500 group-[.is-active]:text-slate-100 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
              <step.icon size={20} />
            </div>
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
              <h3 className="font-bold text-lg text-indigo-400 mb-2">{step.title}</h3>
              <p className="text-slate-400">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const FeaturesView = () => (
  <div className="min-h-screen bg-slate-900 text-white pt-24 pb-12 px-4">
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold mb-4">Powerful Features</h1>
        <p className="text-slate-400">Everything you need for modern fleet safety and insurance automation.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { icon: Zap, title: "Real-time Detection", desc: "Millisecond-level accident detection using advanced accelerometer and gyroscope data." },
          { icon: Lock, title: "Blockchain Verified", desc: "Immutable accident records preventing insurance fraud and data manipulation." },
          { icon: Cpu, title: "AI Forensics", desc: "Automated accident reconstruction and severity analysis using Machine Learning." },
          { icon: Siren, title: "Emergency SOS", desc: "Automatic dispatch of emergency services when critical impacts are detected." },
          { icon: FileCheck, title: "Smart Claims", desc: "Paperless, instant insurance claim processing with AI damage estimation." },
          { icon: Globe, title: "Global Coverage", desc: "Works anywhere with GPS and cellular connectivity." },
        ].map((feat, i) => (
          <div key={i} className="bg-slate-800 p-8 rounded-2xl border border-slate-700 hover:border-indigo-500 transition-colors group">
            <div className="w-12 h-12 bg-indigo-900/50 rounded-lg flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
              <feat.icon size={24} />
            </div>
            <h3 className="text-xl font-bold mb-3">{feat.title}</h3>
            <p className="text-slate-400">{feat.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const PricingView = ({ onChoosePlan }: { onChoosePlan: (plan: string) => void }) => (
  <div className="min-h-screen bg-slate-900 text-white pt-24 pb-12 px-4">
    <div className="max-w-5xl mx-auto">
      <h1 className="text-4xl font-bold text-center mb-16">Simple Pricing</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { name: "Basic", price: "₹999", period: "/mo", desc: "For individual drivers", features: ["1 Vehicle", "Accident Detection", "SMS Alerts"] },
          { name: "Pro", price: "₹2,499", period: "/mo", desc: "For families & small biz", features: ["5 Vehicles", "AI Analysis", "Auto-Insurance Claim", "24/7 Support"], recommended: true },
          { name: "Fleet", price: "Custom", period: "", desc: "For enterprise logistics", features: ["Unlimited Vehicles", "API Access", "Dedicated Account Manager", "Custom Integrations"] },
        ].map((plan, i) => (
          <div key={i} className={`relative bg-slate-800 p-8 rounded-2xl border ${plan.recommended ? 'border-indigo-500 shadow-2xl shadow-indigo-500/20' : 'border-slate-700'} flex flex-col`}>
            {plan.recommended && <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-600 text-white px-4 py-1 rounded-full text-sm font-bold">Most Popular</div>}
            <h3 className="text-xl font-bold text-slate-300">{plan.name}</h3>
            <div className="mt-4 mb-6">
              <span className="text-4xl font-bold text-white">{plan.price}</span>
              <span className="text-slate-500">{plan.period}</span>
            </div>
            <p className="text-slate-400 mb-8 text-sm">{plan.desc}</p>
            <ul className="space-y-4 mb-8 flex-1">
              {plan.features.map((f, j) => (
                <li key={j} className="flex items-center gap-2 text-sm text-slate-300">
                  <Check size={16} className="text-indigo-400" /> {f}
                </li>
              ))}
            </ul>
            <button 
              onClick={() => onChoosePlan(plan.name)}
              className={`w-full py-3 rounded-xl font-bold transition ${plan.recommended ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}
            >
              Choose Plan
            </button>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const ContactView = ({ onNavigate, notify }: { onNavigate: (v: View) => void, notify: (m: string, t?: 'success' | 'error') => void }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if(!name || !email || !message) return notify("Please fill all fields", "error");
    
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "support_tickets"), {
        name, email, message, 
        createdAt: new Date().toISOString(),
        status: 'OPEN'
      });
      notify("Message sent successfully!", "success");
      setName(''); setEmail(''); setMessage('');
    } catch(e) {
      console.error(e);
      notify("Failed to send message", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans">
      <nav className="fixed w-full z-50 bg-slate-900/80 backdrop-blur-lg border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate(View.LANDING)}>
              <ShieldCheck className="text-indigo-500 w-8 h-8" />
              <span className="text-2xl font-bold">SafeGuard</span>
            </div>
            <button onClick={() => onNavigate(View.LANDING)} className="text-slate-400 hover:text-white transition">Back</button>
          </div>
        </div>
     </nav>
    <div className="pt-24 pb-12 px-4 flex items-center justify-center min-h-screen">
      <div className="w-full max-w-lg bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-xl">
        <h1 className="text-2xl font-bold mb-2">Contact Support</h1>
        <p className="text-slate-400 mb-8">We usually respond within 2 hours.</p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Name</label>
            <input value={name} onChange={e => setName(e.target.value)} type="text" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition text-white" placeholder="John Doe" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition text-white" placeholder="john@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Message</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition h-32 text-white" placeholder="How can we help?"></textarea>
          </div>
          <button onClick={handleSubmit} disabled={isSubmitting} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg transition shadow-lg shadow-indigo-500/20 disabled:opacity-50">
            {isSubmitting ? 'Sending...' : 'Send Message'}
          </button>
        </div>

        <div className="mt-8 flex justify-between text-slate-400 text-sm">
          <div className="flex items-center gap-2"><Mail size={16} /> support@safeguard.ai</div>
          <div className="flex items-center gap-2"><Phone size={16} /> +1 (555) 000-0000</div>
        </div>
      </div>
    </div>
    </div>
  );
};

const AuthPage = ({ type, onLogin, onGoogleLogin, onBack, onResetPassword }: { type: 'LOGIN' | 'REGISTER', onLogin: (email: string, pass: string, role: Role) => void, onGoogleLogin: () => void, onBack: () => void, onResetPassword: (email: string) => void }) => {
  const [role, setRole] = useState<Role>(Role.DRIVER);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-900 to-slate-900"></div>
      <div className="w-full max-w-md bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 p-8 relative z-10">
        <div className="flex justify-center mb-6">
          <div className="p-3 bg-indigo-600 rounded-xl">
             <ShieldCheck size={32} className="text-white" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-white text-center mb-2">
          {type === 'LOGIN' ? 'Welcome Back' : 'Create Account'}
        </h2>
        <p className="text-slate-400 text-center mb-8">
          {type === 'LOGIN' ? 'Sign in to access your dashboard' : 'Join the future of insurance'}
        </p>

        <div className="space-y-4">
          {type === 'REGISTER' && (
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Select Role</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.values(Role).map((r) => (
                  <button 
                    key={r}
                    onClick={() => setRole(r)}
                    className={`p-2 rounded text-sm font-medium transition ${role === r ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Email Address</label>
            <input 
              type="email" 
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" 
              placeholder="name@example.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onLogin(email, password, role)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Password</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none pr-10" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onLogin(email, password, role)}
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {type === 'LOGIN' && (
              <div className="flex justify-end mt-1">
                <button onClick={() => onResetPassword(email)} className="text-xs text-indigo-400 hover:text-indigo-300">
                  Forgot Password?
                </button>
              </div>
            )}
          </div>

          <button 
            onClick={() => onLogin(email, password, role)}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg transition shadow-lg shadow-indigo-500/20 mt-2"
          >
            {type === 'LOGIN' ? 'Sign In' : 'Get Started'}
          </button>

          <div className="flex items-center gap-2 my-2">
            <div className="h-[1px] bg-slate-700 flex-1"></div>
            <span className="text-slate-500 text-xs uppercase">Or</span>
            <div className="h-[1px] bg-slate-700 flex-1"></div>
          </div>

          <button 
            onClick={onGoogleLogin}
            className="w-full bg-white text-slate-900 font-bold py-3 rounded-lg transition hover:bg-gray-100 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>
        </div>
        
        <div className="mt-6 text-center">
          <button onClick={onBack} className="text-slate-500 hover:text-white text-sm">
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

const LandingPage = ({ onNavigate, systemStatus }: { onNavigate: (v: View) => void, systemStatus: SystemStatus }) => {
  
  const getStatusConfig = () => {
    switch(systemStatus) {
      case 'ONLINE': return { color: 'bg-emerald-500', text: 'text-emerald-400', label: 'System Online' };
      case 'DB_DOWN': return { color: 'bg-amber-500', text: 'text-amber-400', label: 'Database Error' };
      default: return { color: 'bg-rose-500', text: 'text-rose-400', label: 'System Offline' };
    }
  };

  const statusConfig = getStatusConfig();

  return (
  <div className="min-h-screen bg-slate-900 text-white font-sans overflow-hidden">
     {/* Navbar */}
     <nav className="fixed w-full z-50 bg-slate-900/80 backdrop-blur-lg border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate(View.LANDING)}>
              <ShieldCheck className="text-indigo-500 w-8 h-8" />
              <span className="text-2xl font-bold">SafeGuard</span>
            </div>
            <div className="hidden md:flex space-x-8 text-sm font-medium text-slate-300">
              <button onClick={() => onNavigate(View.FEATURES)} className="hover:text-white transition">Features</button>
              <button onClick={() => onNavigate(View.HOW_IT_WORKS)} className="hover:text-white transition">How it Works</button>
              <button onClick={() => onNavigate(View.PRICING)} className="hover:text-white transition">Pricing</button>
              <button onClick={() => onNavigate(View.CONTACT)} className="hover:text-white transition">Contact</button>
            </div>
            <div className="flex items-center gap-4">
               <div className={`flex items-center gap-2 px-3 py-1 rounded-full border bg-slate-900 ${statusConfig.text} border-current opacity-80`}>
                 <div className={`w-2 h-2 rounded-full ${statusConfig.color} animate-pulse`}></div>
                 <span className="text-xs font-bold">{statusConfig.label}</span>
               </div>
               <button onClick={() => onNavigate(View.LOGIN)} className="bg-indigo-600 hover:bg-indigo-500 px-5 py-2 rounded-lg font-bold transition shadow-lg shadow-indigo-500/20">
                 Login
               </button>
            </div>
          </div>
        </div>
     </nav>

     {/* Hero */}
     <div className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
       <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] -z-10"></div>
       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
         <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800 border border-slate-700 text-indigo-400 text-sm font-medium mb-8 animate-fade-in-up">
           <span className="relative flex h-2 w-2">
             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
             <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
           </span>
           Live Accident Prevention System
         </div>
         <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-8">
           Next Gen <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Insurance</span> <br/>
           Powered by AI & Blockchain
         </h1>
         <p className="mt-6 text-xl text-slate-400 max-w-3xl mx-auto mb-10">
           Real-time accident detection, instant claims processing, and immutable record keeping. 
           SafeGuard protects drivers and insurers with cutting-edge technology.
         </p>
         <div className="flex flex-col sm:flex-row gap-4 justify-center">
           <button onClick={() => onNavigate(View.REGISTER)} className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-lg transition shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2">
             Get Protected Now <ChevronRight size={20} />
           </button>
           <button onClick={() => onNavigate(View.HOW_IT_WORKS)} className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-lg border border-slate-700 transition flex items-center justify-center gap-2">
             <Play size={20} /> Watch Demo
           </button>
         </div>
         
         <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
            {/* Logos placeholders */}
            {['Tesla', 'Toyota', 'Allianz', 'Geico'].map((brand, i) => (
              <div key={i} className="flex items-center justify-center text-xl font-bold text-slate-500">{brand}</div>
            ))}
         </div>
       </div>
     </div>
  </div>
  );
};

// --- Driver Views ---

const DriverClaimsView = ({ 
  claims, 
  onOpenNewClaim, 
  onViewClaim 
}: { 
  claims: Claim[], 
  onOpenNewClaim: () => void, 
  onViewClaim: (c: Claim) => void 
}) => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <h2 className="text-2xl font-bold text-white">Insurance Claims</h2>
      <button onClick={onOpenNewClaim} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-lg shadow-indigo-500/20 flex items-center gap-2">
        <Plus size={16} /> New Claim
      </button>
    </div>
    {claims.length === 0 ? (
      <div className="text-center py-10 bg-slate-800 rounded-xl border border-slate-700">
        <p className="text-slate-400">No claims filed yet.</p>
      </div>
    ) : (
      <Table headers={['Claim ID', 'Date', 'Amount', 'Status', 'Fraud Risk', 'Actions']}>
        {claims.map((claim) => (
          <tr key={claim.id} className="hover:bg-slate-700/50 transition">
            <td className="px-6 py-4 font-mono text-xs text-indigo-400">{claim.id}</td>
            <td className="px-6 py-4 text-slate-300">{new Date(claim.submittedAt).toLocaleDateString()}</td>
            <td className="px-6 py-4 text-white font-medium">₹{claim.amount.toLocaleString()}</td>
            <td className="px-6 py-4"><StatusBadge status={claim.status} /></td>
            <td className="px-6 py-4">
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div className={`h-full ${claim.fraudProbability > 50 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${claim.fraudProbability}%` }}></div>
                </div>
                <span className="text-xs">{claim.fraudProbability}%</span>
              </div>
            </td>
            <td className="px-6 py-4">
              <button onClick={() => onViewClaim(claim)} className="text-indigo-400 hover:text-white text-xs font-bold flex items-center gap-1">
                <Eye size={14} /> VIEW
              </button>
            </td>
          </tr>
        ))}
      </Table>
    )}
  </div>
);

const DriverDocumentsView = ({ notify }: { notify: (m: string, t?: 'success' | 'error') => void }) => {
  const [docs, setDocs] = useState([
    { title: "Driving License", date: "Exp: 2025-10-12", status: "Verified" },
    { title: "Vehicle Registration", date: "Exp: 2024-05-20", status: "Verified" },
    { title: "Insurance Policy", date: "Exp: 2024-08-15", status: "Pending Renewal" },
  ]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      // Simulate Database Update for documents could be added here
      setDocs(prev => [...prev, { title: file.name, date: "Uploaded Just Now", status: "Pending Review" }]);
      notify("Document uploaded successfully (Pending Verification)", "success");
    }
  };

  const handleDownload = (title: string) => {
    notify(`Downloading ${title}...`, "success");
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">My Documents</h2>
      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {docs.map((doc, i) => (
          <div key={i} className="bg-slate-800 p-6 rounded-xl border border-slate-700 flex flex-col justify-between h-48">
            <div className="flex justify-between items-start">
              <div className="p-3 bg-indigo-500/10 rounded-lg text-indigo-400">
                <FileText size={24} />
              </div>
              <StatusBadge status={doc.status} />
            </div>
            <div>
              <h3 className="font-bold text-white truncate" title={doc.title}>{doc.title}</h3>
              <p className="text-sm text-slate-400">{doc.date}</p>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => handleDownload(doc.title)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded text-xs font-medium flex items-center justify-center gap-2 transition">
                <Download size={14} /> Download
              </button>
            </div>
          </div>
        ))}
        <div 
          onClick={handleUploadClick}
          className="bg-slate-800/50 border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center h-48 hover:border-indigo-500 hover:bg-slate-800 transition cursor-pointer group"
        >
          <div className="p-4 bg-slate-700 rounded-full mb-3 group-hover:bg-indigo-600 transition-colors text-white">
            <Upload size={24} />
          </div>
          <span className="text-sm text-slate-400 font-medium group-hover:text-white">Upload Document</span>
        </div>
      </div>
    </div>
  );
};

const DriverAIScoreView = () => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold text-white">AI Safety Score</h2>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 flex flex-col items-center justify-center text-center min-w-[0]">
        <div className="relative w-48 h-48 mx-auto">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={[{ value: 92 }, { value: 8 }]}
                innerRadius={60}
                outerRadius={80}
                startAngle={90}
                endAngle={-270}
                dataKey="value"
              >
                <Cell fill="#6366f1" />
                <Cell fill="#334155" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-4xl font-bold text-white">92</span>
            <span className="text-xs text-slate-400 uppercase tracking-widest">Excellent</span>
          </div>
        </div>
        <p className="text-slate-400 mt-4 text-sm px-4">Your driving is safer than 94% of drivers in your area.</p>
      </div>

      <div className="col-span-2 bg-slate-800 p-6 rounded-2xl border border-slate-700">
        <h3 className="font-bold text-white mb-6">Risk Factors Analysis</h3>
        <div className="space-y-6">
          {[
            { label: "Harsh Braking", val: 12, max: 100, color: "bg-emerald-500" },
            { label: "Speeding > 120km/h", val: 5, max: 100, color: "bg-emerald-500" },
            { label: "Night Driving", val: 45, max: 100, color: "bg-yellow-500" },
            { label: "Cornering Stability", val: 88, max: 100, color: "bg-indigo-500" },
          ].map((item, i) => (
            <div key={i}>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-300">{item.label}</span>
                <span className="text-slate-400">{item.val}% Risk</span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div className={`h-full ${item.color}`} style={{ width: `${item.val}%` }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
    
    <div className="bg-indigo-900/20 border border-indigo-500/30 p-6 rounded-xl flex items-start gap-4">
      <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
        <Cpu size={24} />
      </div>
      <div>
        <h4 className="font-bold text-white mb-1">AI Recommendation</h4>
        <p className="text-slate-300 text-sm">Based on your recent trips, try to reduce speed on curves during night time. This will improve your score to 95+ and reduce insurance premiums by 5%.</p>
      </div>
    </div>
  </div>
);

const NotificationsView = ({ notifications, notify }: { notifications: any[], notify: (m: string) => void }) => {
  
  const markAllRead = async () => {
    try {
        const unread = notifications.filter(n => !n.read);
        if (unread.length === 0) {
            notify("No new notifications to mark as read");
            return;
        }
        
        await Promise.all(unread.map(n => {
            if (n.id && !n.id.startsWith('n')) {
                 setDoc(doc(db, "notifications", n.id), { read: true }, { merge: true });
            }
        }));
        
        notify("All notifications marked as read");
    } catch(e) {
        console.error(e);
        notify("Failed to update notifications");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Notifications</h2>
        <button onClick={markAllRead} className="text-sm text-indigo-400 hover:text-white transition">Mark all as read</button>
      </div>
      <div className="space-y-4">
        {notifications.length === 0 && <p className="text-slate-500">No notifications.</p>}
        {notifications.map((n) => (
          <div key={n.id} className={`bg-slate-800 p-4 rounded-xl border ${n.read ? 'border-slate-700' : 'border-indigo-500/50'} flex gap-4 transition hover:bg-slate-700/50`}>
            <div className={`mt-1 p-2 rounded-lg ${n.type === 'ALERT' ? 'bg-red-500/20 text-red-400' : n.type === 'SUCCESS' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
              <Bell size={18} />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <h4 className={`font-bold ${n.read ? 'text-slate-300' : 'text-white'}`}>{n.title}</h4>
                <span className="text-xs text-slate-500">{n.date}</span>
              </div>
              <p className="text-sm text-slate-400 mt-1">{n.message}</p>
            </div>
            {!n.read && <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2"></div>}
          </div>
        ))}
      </div>
    </div>
  );
};

const DriverProfileView = ({ user, onUpdate, notify }: { user: User, onUpdate: (u: User) => void, notify: (m: string) => void }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState(user);
  const [expandedSetting, setExpandedSetting] = useState<number | null>(null);

  useEffect(() => {
    setProfile(user);
  }, [user]);

  const handleSave = async () => {
    try {
        await setDoc(doc(db, "users", user.id), {
            name: profile.name,
            email: profile.email
        }, { merge: true });
        onUpdate(profile);
        setIsEditing(false);
        notify("Profile updated successfully on Database");
    } catch(e) {
        console.error(e);
        notify("Failed to update profile");
    }
  };

  const settingsItems = [
    { 
      icon: ShieldCheck, 
      label: 'Password & Security',
      content: (
        <div className="space-y-3 p-4 bg-slate-900/50 mt-2 rounded-lg border border-slate-700">
          <h4 className="text-sm font-bold text-white mb-2">Change Password</h4>
          <input type="password" placeholder="Current Password" className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none" />
          <input type="password" placeholder="New Password" className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none" />
          <button onClick={() => notify("Password updated successfully")} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded text-sm font-medium w-full">Update Password</button>
        </div>
      )
    },
    { 
      icon: Bell, 
      label: 'Notification Preferences',
      content: (
        <div className="space-y-2 p-4 bg-slate-900/50 mt-2 rounded-lg border border-slate-700">
           {['Email Alerts', 'SMS Notifications', 'Push Notifications', 'Weekly Report'].map((opt, i) => (
             <label key={i} className="flex items-center gap-3 text-sm text-slate-300 cursor-pointer">
               <input type="checkbox" defaultChecked className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-indigo-600" />
               {opt}
             </label>
           ))}
           <button onClick={() => notify("Preferences saved")} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded text-sm font-medium w-full mt-2">Save Preferences</button>
        </div>
      )
    },
    { 
      icon: CreditCard, 
      label: 'Payment Methods',
      content: (
        <div className="p-4 bg-slate-900/50 mt-2 rounded-lg border border-slate-700 text-center">
          <p className="text-sm text-slate-400 mb-3">No payment methods saved.</p>
          <button onClick={() => notify("Add Card modal opened")} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded text-sm font-medium inline-flex items-center gap-2">
            <Plus size={16} /> Add New Card
          </button>
        </div>
      )
    },
    { 
      icon: Globe, 
      label: 'Language & Region',
      content: (
        <div className="p-4 bg-slate-900/50 mt-2 rounded-lg border border-slate-700 space-y-3">
          <div>
            <label className="text-xs text-slate-500 uppercase font-bold block mb-1">Language</label>
            <select className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none">
              <option>English (US)</option>
              <option>Hindi</option>
              <option>Spanish</option>
              <option>French</option>
            </select>
          </div>
          <button onClick={() => notify("Region settings updated")} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded text-sm font-medium w-full">Save Changes</button>
        </div>
      )
    },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 flex flex-col items-center text-center relative">
        <button 
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          className={`absolute top-4 right-4 p-2 rounded-lg text-white transition ${isEditing ? 'bg-green-600 hover:bg-green-500' : 'bg-slate-700 hover:bg-indigo-600'}`}
        >
          {isEditing ? <Save size={18} /> : <Edit2 size={18} />}
        </button>

        <div className="relative group">
          <img src={profile.avatar} alt={profile.name} className="w-24 h-24 rounded-full border-4 border-slate-900 shadow-xl" />
          {isEditing && (
             <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center cursor-pointer">
               <Upload size={20} className="text-white" />
             </div>
          )}
        </div>
        
        <div className="mt-4 w-full">
          {isEditing ? (
             <input 
               value={profile.name} 
               onChange={(e) => setProfile({...profile, name: e.target.value})}
               className="bg-slate-900 border border-slate-600 rounded px-3 py-1 text-center text-white font-bold text-xl w-full max-w-xs focus:ring-2 focus:ring-indigo-500 outline-none"
             />
          ) : (
            <h2 className="text-2xl font-bold text-white">{profile.name}</h2>
          )}
          
          {isEditing ? (
             <input 
               value={profile.email} 
               onChange={(e) => setProfile({...profile, email: e.target.value})}
               className="bg-slate-900 border border-slate-600 rounded px-3 py-1 text-center text-slate-400 text-sm w-full max-w-xs mt-2 focus:ring-2 focus:ring-indigo-500 outline-none"
             />
          ) : (
            <p className="text-slate-400">{profile.email}</p>
          )}
        </div>

        <div className="mt-6 flex gap-4">
          <div className="bg-slate-900 px-6 py-2 rounded-lg">
            <div className="text-xs text-slate-500 uppercase font-bold">Role</div>
            <div className="text-white font-medium">{profile.role}</div>
          </div>
          <div className="bg-slate-900 px-6 py-2 rounded-lg">
             <div className="text-xs text-slate-500 uppercase font-bold">Member Since</div>
             <div className="text-white font-medium">Oct 2023</div>
          </div>
        </div>
      </div>
      
      <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
        <div className="p-4 bg-slate-900/50 font-bold text-white border-b border-slate-700">Account Settings</div>
        <div className="divide-y divide-slate-700">
          {settingsItems.map((item, i) => (
            <div key={i}>
              <button 
                onClick={() => setExpandedSetting(expandedSetting === i ? null : i)}
                className={`w-full flex items-center justify-between p-4 text-slate-300 hover:bg-slate-700/50 hover:text-white transition ${expandedSetting === i ? 'bg-slate-700/50 text-white' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <item.icon size={20} className="text-indigo-400" />
                  <span>{item.label}</span>
                </div>
                {expandedSetting === i ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              {expandedSetting === i && (
                <div className="px-4 pb-4 animate-fade-in-down">
                  {item.content}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- Admin Views ---

interface AdminUsersViewProps {
  users: User[];
  onAdd: () => void;
  onEdit: (user: User) => void;
  onDelete: (userId: string) => void;
}

const AdminUsersView = ({ users, onAdd, onEdit, onDelete }: AdminUsersViewProps) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">User Management</h2>
        <div className="flex gap-2">
          <input type="text" placeholder="Search users..." className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
          <button onClick={onAdd} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2">
            <Plus size={16} /> Add User
          </button>
        </div>
      </div>
      <Table headers={['User', 'Role', 'Email', 'Status', 'Actions']}>
        {users.map((u) => (
          <tr key={u.id} className="hover:bg-slate-700/50 transition">
            <td className="px-6 py-4 flex items-center gap-3">
              <img src={u.avatar} className="w-8 h-8 rounded-full" />
              <span className="text-white font-medium">{u.name}</span>
            </td>
            <td className="px-6 py-4">
              <span className="bg-slate-700 text-slate-300 px-2 py-1 rounded text-xs font-bold">{u.role}</span>
            </td>
            <td className="px-6 py-4">{u.email}</td>
            <td className="px-6 py-4"><StatusBadge status="Active" /></td>
            <td className="px-6 py-4 flex gap-2">
              <button className="text-slate-400 hover:text-white" onClick={() => onEdit(u)}><Edit2 size={16} /></button>
              <button className="text-slate-400 hover:text-rose-500" onClick={() => onDelete(u.id)}><Trash2 size={16} /></button>
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
};

const AdminVehiclesView = ({ vehicles, notify, onManageVehicle }: { vehicles: Vehicle[], notify: (m: string) => void, onManageVehicle: (v: any) => void }) => (
  <div className="space-y-6">
     <h2 className="text-2xl font-bold text-white">Fleet Management</h2>
     {vehicles.length === 0 ? <p className="text-slate-500">No vehicles found in database.</p> : (
     <Table headers={['Vehicle', 'VIN', 'Owner', 'Status', 'Insurance Exp', 'Risk Score', 'Actions']}>
      {vehicles.map((v) => (
        <tr key={v.id} className="hover:bg-slate-700/50 transition">
          <td className="px-6 py-4">
            <div className="font-medium text-white">{v.model}</div>
            <div className="text-xs text-slate-500">{v.plate}</div>
          </td>
          <td className="px-6 py-4 font-mono text-xs">{v.vin}</td>
          <td className="px-6 py-4">User #{v.ownerId}</td>
          <td className="px-6 py-4"><StatusBadge status={v.status} /></td>
          <td className="px-6 py-4 text-sm text-slate-400">
             {new Date(v.insuranceExpiry).toLocaleDateString()}
          </td>
          <td className="px-6 py-4">
            <span className={`font-bold ${v.riskScore > 80 ? 'text-green-400' : 'text-amber-400'}`}>{v.riskScore}</span>
          </td>
          <td className="px-6 py-4 text-indigo-400 text-xs font-bold cursor-pointer hover:text-white" onClick={() => onManageVehicle(v)}>MANAGE</td>
        </tr>
      ))}
     </Table>
     )}
  </div>
);

const AdminAnalyticsView = () => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold text-white">AI Analytics Center</h2>
    
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 min-w-[0]">
        <h3 className="font-bold text-white mb-6">Accident Heatmap (Time of Day)</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={[
              { time: '00:00', val: 20 }, { time: '04:00', val: 10 }, { time: '08:00', val: 80 },
              { time: '12:00', val: 50 }, { time: '16:00', val: 90 }, { time: '20:00', val: 60 }, { time: '24:00', val: 30 }
            ]}>
              <defs>
                <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="time" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }} />
              <Area type="monotone" dataKey="val" stroke="#6366f1" fillOpacity={1} fill="url(#colorVal)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 min-w-[0]">
        <h3 className="font-bold text-white mb-6">Accident Severity Distribution</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={[
                  { name: 'Minor', value: 45, fill: '#10b981' },
                  { name: 'Moderate', value: 30, fill: '#f59e0b' },
                  { name: 'Severe', value: 20, fill: '#ef4444' },
                  { name: 'Critical', value: 5, fill: '#7f1d1d' }
                ]}
                innerRadius={60}
                outerRadius={80}
                dataKey="value"
                label
              >
              </Pie>
              <RechartsTooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  </div>
);

const AdminSettingsView = ({ notify }: { notify: (m: string, t?: 'success' | 'error') => void }) => {
  const [isSeeding, setIsSeeding] = useState(false);

  const handleSeedDatabase = async () => {
    if(!confirm("Are you sure? This will upload local mock data to your Firebase Firestore instance.")) return;
    
    setIsSeeding(true);
    try {
      // Try using backend first
      let success = false;
      try {
        const response = await fetch('http://127.0.0.1:8000/api/seed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ users: MOCK_USERS, vehicles: MOCK_VEHICLES, accidents: MOCK_ACCIDENTS, claims: MOCK_CLAIMS, logs: MOCK_BLOCKCHAIN_LOGS }),
        });
        if (response.ok) {
          success = true;
          const data = await response.json();
          notify(data.message || 'Database synced via API', 'success');
        }
      } catch(e) {
        console.warn("Backend API unavailable, falling back to client-side seeding");
      }

      // Fallback to client-side Firestore seeding
      if (!success) {
        const batch = writeBatch(db);
        
        MOCK_USERS.forEach(u => batch.set(doc(db, "users", u.id), u, { merge: true }));
        MOCK_VEHICLES.forEach(v => batch.set(doc(db, "vehicles", v.id), v, { merge: true }));
        MOCK_ACCIDENTS.forEach(a => batch.set(doc(db, "accidents", a.id), a, { merge: true }));
        MOCK_CLAIMS.forEach(c => batch.set(doc(db, "claims", c.id), c, { merge: true }));
        MOCK_BLOCKCHAIN_LOGS.forEach((l, i) => batch.set(doc(db, "blockchain_logs", `log_${i}`), l, { merge: true }));
        
        await batch.commit();
        notify('Database & Logs synced via Client (Fallback)', 'success');
      }
    } catch (error: any) {
      console.error(error);
      notify(`Sync Failed: ${error.message}`, 'error');
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <h2 className="text-2xl font-bold text-white">System Configuration</h2>
      
      <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 space-y-8">
        <div>
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Cpu size={20} /> AI Detection Thresholds</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm text-slate-400 block mb-2">G-Force Trigger (g)</label>
              <input type="number" defaultValue="2.5" className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:border-indigo-500 outline-none transition" />
            </div>
            <div>
              <label className="text-sm text-slate-400 block mb-2">Impact Confidence (%)</label>
              <input type="number" defaultValue="85" className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:border-indigo-500 outline-none transition" />
            </div>
          </div>
        </div>

        <div className="border-t border-slate-700 pt-8">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Database size={20} /> Blockchain Sync</h3>
          <div className="flex items-center justify-between bg-slate-900 p-4 rounded-lg">
            <div>
              <p className="text-white font-medium">Auto-Mint Accident Records</p>
              <p className="text-sm text-slate-500">Automatically push verified accidents to Ethereum Mainnet</p>
            </div>
            <div className="w-12 h-6 bg-indigo-600 rounded-full relative cursor-pointer">
              <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-700 pt-8">
           <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><CloudUpload size={20} /> Database Management</h3>
           <div className="bg-slate-900 p-4 rounded-lg flex flex-col md:flex-row items-center justify-between gap-4">
             <div>
               <p className="text-white font-medium">Initialize Database Tables</p>
               <p className="text-sm text-slate-500">Upload local mock data to Firebase Firestore (Auto-Creates Collections)</p>
             </div>
             <button 
               onClick={handleSeedDatabase}
               disabled={isSeeding}
               className={`px-6 py-2 rounded-lg font-bold text-white transition flex items-center gap-2 ${isSeeding ? 'bg-slate-600 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-500/20'}`}
             >
               {isSeeding ? 'Uploading...' : 'Sync Data to DB'}
             </button>
           </div>
        </div>

        <div className="border-t border-slate-700 pt-8">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Bell size={20} /> Emergency Alerts</h3>
          <div className="space-y-3">
            {['Police Station', 'Ambulance Service', 'Insurance Provider', 'Family Contacts'].map((item, i) => (
              <label key={i} className="flex items-center gap-3 text-slate-300">
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-indigo-600 focus:ring-offset-0 focus:ring-0" />
                Notify {item}
              </label>
            ))}
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button onClick={() => notify("System configuration saved successfully", 'success')} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-indigo-500/20">Save Changes</button>
        </div>
      </div>
    </div>
  );
};

const BlockchainLogsView = ({ logs }: { logs: BlockchainLog[] }) => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold text-white">Immutable Audit Log</h2>
    {logs.length === 0 ? <p className="text-slate-500">No blockchain records found.</p> : (
    <Table headers={['Block', 'Timestamp', 'Action', 'Hash', 'Status']}>
      {logs.map((log, i) => (
        <tr key={i} className="hover:bg-slate-700/50 transition font-mono text-xs">
          <td className="px-6 py-4 text-indigo-400">#{log.block}</td>
          <td className="px-6 py-4 text-slate-300">{log.timestamp}</td>
          <td className="px-6 py-4 text-white font-bold">{log.action}</td>
          <td className="px-6 py-4 text-slate-500">{log.hash}</td>
          <td className="px-6 py-4">
             <span className={`px-2 py-1 rounded ${log.status === 'Confirmed' ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'}`}>
               {log.status}
             </span>
          </td>
        </tr>
      ))}
    </Table>
    )}
  </div>
);

// --- Police & Insurance Views ---

const PoliceDashboardView = ({ notify, onViewAccident }: { notify: (m: string) => void, onViewAccident: (a: Accident) => void }) => {
  const [accidents, setAccidents] = useState<Accident[]>(MOCK_ACCIDENTS);

  // Fetch accidents
  useEffect(() => {
    const q = collection(db, "accidents");
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const items: any[] = [];
        querySnapshot.forEach((doc) => {
            items.push({ id: doc.id, ...doc.data() });
        });
        if(items.length > 0) setAccidents(items);
    });
    return () => unsubscribe();
  }, []);

  const verifyIncident = async (id: string) => {
    try {
        await setDoc(doc(db, "accidents", id), {
            policeVerification: VerificationStatus.VERIFIED
        }, { merge: true });
        notify("Incident verified on Database & Blockchain");
    } catch(e) {
        console.error(e);
        notify("Failed to verify incident");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
         <h2 className="text-2xl font-bold text-white">Jurisdiction Overview</h2>
         <div className="bg-red-500/10 text-red-400 px-4 py-2 rounded-full flex items-center gap-2 animate-pulse border border-red-500/20">
           <Siren size={18} /> {accidents.filter(a => a.severity !== Severity.MINOR).length} Active Incidents
         </div>
      </div>
      
      {accidents.length === 0 ? <p className="text-slate-500 text-center py-10">No active incidents.</p> : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accidents.map((acc) => (
          <div key={acc.id} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col">
            <div className="h-40 bg-slate-900 relative cursor-pointer" onClick={() => onViewAccident(acc)}>
              <img src={acc.images?.[0] || 'https://via.placeholder.com/300'} className="w-full h-full object-cover opacity-60 hover:opacity-100 transition" />
              <div className="absolute top-2 right-2">
                <StatusBadge status={acc.severity} />
              </div>
            </div>
            <div className="p-5 flex-1 flex flex-col">
              <h3 className="font-bold text-white mb-1 cursor-pointer hover:text-indigo-400" onClick={() => onViewAccident(acc)}>{acc.location?.address || 'Unknown Location'}</h3>
              <p className="text-xs text-slate-400 mb-4">{new Date(acc.timestamp).toLocaleString()}</p>
              
              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Hash</span>
                  <span className="font-mono text-indigo-400">{acc.blockchainHash ? acc.blockchainHash.substring(0,8) : '0x...'}...</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Confidence</span>
                  <span className="text-green-400">98% (AI)</span>
                </div>
              </div>

              {acc.policeVerification === VerificationStatus.VERIFIED ? (
                <div className="mt-auto w-full bg-green-500/20 text-green-400 py-2 rounded-lg text-center font-bold flex items-center justify-center gap-2">
                  <CheckCircle size={16} /> Verified
                </div>
              ) : (
                <button 
                  onClick={() => verifyIncident(acc.id)}
                  className="mt-auto w-full bg-slate-700 hover:bg-indigo-600 text-white py-2 rounded-lg transition"
                >
                  Verify Incident
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
};

const InsuranceReviewView = ({ notify }: { notify: (m: string, t?: 'success' | 'error') => void }) => {
  const [claims, setClaims] = useState<Claim[]>(MOCK_CLAIMS);
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  
  useEffect(() => {
    const q = collection(db, "claims");
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const items: any[] = [];
        querySnapshot.forEach((doc) => {
            items.push({ id: doc.id, ...doc.data() });
        });
        if(items.length > 0) {
            setClaims(items);
            if(!selectedClaimId) setSelectedClaimId(items[0].id);
        } else {
            setClaims([]);
        }
    });
    return () => unsubscribe();
  }, []);

  const selectedClaim = claims.find(c => c.id === selectedClaimId) || claims[0];

  const handleDecision = async (id: string, status: ClaimStatus) => {
    try {
        await setDoc(doc(db, "claims", id), {
            status: status
        }, { merge: true });
        notify(`Claim ${status === ClaimStatus.APPROVED ? 'Approved' : 'Rejected'} on Database`, status === ClaimStatus.APPROVED ? 'success' : 'error');
    } catch(e) {
        console.error(e);
        notify("Failed to update claim status");
    }
  };

  if (!selectedClaim) return <div className="p-10 text-center bg-slate-800 rounded-xl border border-slate-700"><p className="text-slate-400">No claims available for review.</p></div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-140px)]">
      {/* List */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-700 bg-slate-900/50">
          <h3 className="font-bold text-white">Pending Claims ({claims.filter(c => c.status === ClaimStatus.UNDER_REVIEW || c.status === ClaimStatus.PENDING).length})</h3>
        </div>
        <div className="flex-1 overflow-y-auto">
          {claims.map((c) => (
             <div 
               key={c.id} 
               onClick={() => setSelectedClaimId(c.id)}
               className={`p-4 border-b border-slate-700 cursor-pointer transition ${selectedClaimId === c.id ? 'bg-slate-700 border-l-4 border-l-indigo-500' : 'hover:bg-slate-700/50'}`}
             >
               <div className="flex justify-between mb-1">
                 <span className="font-mono text-xs text-indigo-400">{c.id}</span>
                 <span className="text-xs text-slate-400">{new Date(c.submittedAt).toLocaleDateString()}</span>
               </div>
               <div className="font-bold text-white mb-1">₹{c.amount.toLocaleString()}</div>
               <StatusBadge status={c.status} />
             </div>
          ))}
        </div>
      </div>

      {/* Detail */}
      <div className="lg:col-span-2 bg-slate-800 rounded-2xl border border-slate-700 p-6 overflow-y-auto">
         <div className="flex justify-between items-start mb-6">
           <div>
             <h2 className="text-2xl font-bold text-white">Claim #{selectedClaim.id}</h2>
             <p className="text-slate-400">Submitted by {selectedClaim.driverId === 'u1' ? 'Alex Driver' : 'Unknown'}</p>
           </div>
           <div className="text-right">
             <div className="text-3xl font-bold text-white">₹{selectedClaim.amount.toLocaleString()}</div>
             <StatusBadge status={selectedClaim.status} />
           </div>
         </div>

         <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
               <h4 className="text-sm text-slate-500 uppercase mb-2">AI Fraud Analysis</h4>
               <div className="flex items-center gap-3">
                 <div className={`text-2xl font-bold ${selectedClaim.fraudProbability > 50 ? 'text-red-400' : 'text-green-400'}`}>
                   {selectedClaim.fraudProbability}%
                 </div>
                 <div className="text-xs text-slate-400">{selectedClaim.fraudProbability > 50 ? 'High Risk' : 'Low Risk'}</div>
               </div>
               <div className="h-1.5 bg-slate-700 rounded-full mt-2 overflow-hidden">
                 <div 
                   className={`h-full ${selectedClaim.fraudProbability > 50 ? 'bg-red-500' : 'bg-green-500'}`} 
                   style={{ width: `${selectedClaim.fraudProbability}%` }}
                 ></div>
               </div>
            </div>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
               <h4 className="text-sm text-slate-500 uppercase mb-2">Blockchain Proof</h4>
               <div className="flex items-center gap-2 text-indigo-400 font-mono text-sm break-all">
                 <Database size={16} /> 0x7f9...a3b1
               </div>
               <div className="mt-2 text-xs text-green-400 flex items-center gap-1">
                 <CheckCircle size={12} /> Verified on-chain
               </div>
            </div>
         </div>

         <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 mb-6">
           <h4 className="text-sm text-slate-500 uppercase mb-2">AI Damage Assessment</h4>
           <p className="text-slate-300 text-sm leading-relaxed">
             {selectedClaim.aiNotes || 'No AI notes available.'}
           </p>
         </div>

         {(selectedClaim.status === ClaimStatus.UNDER_REVIEW || selectedClaim.status === ClaimStatus.PENDING) && (
           <div className="flex gap-4 border-t border-slate-700 pt-6">
             <button 
               onClick={() => handleDecision(selectedClaim.id, ClaimStatus.APPROVED)}
               className="flex-1 bg-green-600 hover:bg-green-500 text-white py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
             >
               <CheckCircle size={20} /> Approve Claim
             </button>
             <button 
               onClick={() => handleDecision(selectedClaim.id, ClaimStatus.REJECTED)}
               className="flex-1 bg-rose-600 hover:bg-rose-500 text-white py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20"
             >
               <XCircle size={20} /> Reject Claim
             </button>
           </div>
         )}
      </div>
    </div>
  );
};

// --- Main App Logic Update ---

const DashboardLayout: React.FC<{ 
  user: User; 
  currentView: View;
  onNavigate: (view: View) => void;
  onLogout: () => void; 
  systemStatus: SystemStatus;
  children: React.ReactNode;
}> = ({ user, currentView, onNavigate, onLogout, systemStatus, children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const getMenu = () => {
    switch (user.role) {
      case Role.DRIVER:
        return [
          { view: View.DRIVER_DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
          { view: View.DRIVER_LIVE, label: 'Live Tracking', icon: MapPin },
          { view: View.DRIVER_ACCIDENTS, label: 'Accidents', icon: AlertTriangle },
          { view: View.DRIVER_CLAIMS, label: 'Insurance Claims', icon: FileText },
          { view: View.DRIVER_DOCUMENTS, label: 'Documents', icon: Upload },
          { view: View.DRIVER_AI_SCORE, label: 'AI Risk Score', icon: Cpu },
          { view: View.DRIVER_NOTIFICATIONS, label: 'Notifications', icon: Bell },
          { view: View.DRIVER_PROFILE, label: 'Profile', icon: Users },
        ];
      case Role.ADMIN:
        return [
          { view: View.ADMIN_DASHBOARD, label: 'Overview', icon: LayoutDashboard },
          { view: View.ADMIN_USERS, label: 'User Management', icon: Users },
          { view: View.ADMIN_VEHICLES, label: 'Vehicles', icon: Car },
          { view: View.ADMIN_ACCIDENTS, label: 'Accident Monitor', icon: Siren },
          { view: View.ADMIN_ANALYTICS, label: 'AI Analytics', icon: Activity },
          { view: View.ADMIN_BLOCKCHAIN, label: 'Blockchain Logs', icon: Database },
          { view: View.ADMIN_SETTINGS, label: 'System Settings', icon: Settings },
        ];
      case Role.POLICE:
        return [
          { view: View.POLICE_DASHBOARD, label: 'Incident Feed', icon: Siren },
        ];
      case Role.INSURANCE:
        return [
          { view: View.INSURANCE_DASHBOARD, label: 'Claims Dashboard', icon: LayoutDashboard },
          { view: View.INSURANCE_REVIEW, label: 'Review Claims', icon: FileText },
          { view: View.INSURANCE_PAYMENTS, label: 'Payments', icon: CreditCard },
        ];
      default: return [];
    }
  };

  const handleNotificationClick = () => {
    onNavigate(View.DRIVER_NOTIFICATIONS);
  };

  const getStatusConfig = () => {
    switch(systemStatus) {
      case 'ONLINE': return { color: 'bg-emerald-500', text: 'text-emerald-400', label: 'System Online' };
      case 'DB_DOWN': return { color: 'bg-amber-500', text: 'text-amber-400', label: 'Database Error' };
      default: return { color: 'bg-rose-500', text: 'text-rose-400', label: 'System Offline' };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <div className="flex h-screen bg-slate-900 overflow-hidden text-slate-300 font-sans">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex items-center gap-2 font-bold text-xl text-white">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <ShieldCheck size={20} className="text-white" />
            </div>
            <span>SafeGuard</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-slate-400">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-4 flex flex-col h-[calc(100%-80px)]">
          <div className="flex items-center gap-3 mb-8 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <img src={user.avatar} alt="User" className="w-10 h-10 rounded-full border-2 border-indigo-500" />
            <div className="overflow-hidden">
              <p className="font-semibold text-sm text-white truncate">{user.name}</p>
              <p className="text-xs text-slate-400 capitalize">{user.role.toLowerCase()}</p>
            </div>
          </div>

          <nav className="space-y-1 flex-1 overflow-y-auto scrollbar-hide">
            {getMenu().map((item, idx) => (
              <SidebarItem 
                key={idx} 
                {...item} 
                active={currentView === item.view} 
                onClick={() => {
                  onNavigate(item.view);
                  setSidebarOpen(false);
                }} 
              />
            ))}
          </nav>

          <div className="pt-4 mt-4 border-t border-slate-800">
            <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 rounded-xl transition-colors">
              <LogOut size={20} />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Top Header */}
        <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 h-16 flex items-center justify-between px-6 z-40">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden text-slate-400 hover:text-white">
              <Menu size={24} />
            </button>
            <h2 className="text-lg font-semibold text-white hidden sm:block">
              {currentView.split('_').slice(1).join(' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
            </h2>
          </div>
          <div className="flex items-center gap-4">
             <div className={`hidden md:flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-mono transition-colors duration-300 bg-slate-900 ${statusConfig.text} border-current opacity-80`}>
               <span className="relative flex h-2 w-2">
                 {systemStatus !== 'OFFLINE' && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${statusConfig.color} opacity-75`}></span>}
                 <span className={`relative inline-flex rounded-full h-2 w-2 ${statusConfig.color}`}></span>
               </span>
               <span className="font-bold">{statusConfig.label}</span>
             </div>
             <button onClick={handleNotificationClick} className="relative p-2 text-slate-400 hover:text-white transition">
               <Bell size={20} />
               <span className="absolute top-1 right-1 w-2 h-2 bg-indigo-500 rounded-full border border-slate-900"></span>
             </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 scrollbar-hide">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>

      <ChatAssistant currentUser={user} />
    </div>
  );
};

// --- App Component with Full Routing ---

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>('OFFLINE');
  const [currentView, setCurrentView] = useState<View>(View.LANDING);
  
  // Data State (Fetch from Firestore)
  const [claims, setClaims] = useState<Claim[]>(MOCK_CLAIMS);
  const [vehicles, setVehicles] = useState<Vehicle[]>(MOCK_VEHICLES);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [notifications, setNotifications] = useState<any[]>(MOCK_NOTIFICATIONS);
  const [blockchainLogs, setBlockchainLogs] = useState<BlockchainLog[]>(MOCK_BLOCKCHAIN_LOGS);
  
  // Modal State
  const [modalType, setModalType] = useState<ModalType>(null);
  const [modalData, setModalData] = useState<any>(null);

  // Forms State
  const [newClaimForm, setNewClaimForm] = useState({ amount: '', desc: '', date: '' });
  const [userForm, setUserForm] = useState({ name: '', email: '', role: Role.DRIVER });
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  // AI Analysis State
  const [claimImage, setClaimImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<null | { cost: number, severity: string, description: string, confidence: number }>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Toast State
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const rootRes = await fetch("http://127.0.0.1:8000/");
        if (!rootRes.ok) throw new Error("API Down");

        const dbRes = await fetch("http://127.0.0.1:8000/health/db");
        if (dbRes.ok) {
            const data = await dbRes.json();
            if (data.database === "connected") {
                setSystemStatus('ONLINE');
            } else {
                setSystemStatus('DB_DOWN');
            }
        } else {
            setSystemStatus('DB_DOWN');
        }
      } catch (e) {
        setSystemStatus('OFFLINE');
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  // --- Real-time Data Listeners ---
  useEffect(() => {
    // We listen regardless of system status to support client-side only mode
    // Listen for Claims
    const unsubClaims = onSnapshot(collection(db, 'claims'), (snapshot) => {
        const data: any[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if(data.length > 0) setClaims(data);
    });

    // Listen for Notifications
    const unsubNotifs = onSnapshot(collection(db, 'notifications'), (snapshot) => {
        const data: any[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if(data.length > 0) setNotifications(data);
    });

    // Listen for Users (Admin view)
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
        const data: any[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if(data.length > 0) setUsers(data);
    });
    
    // Listen for Vehicles
    const unsubVehicles = onSnapshot(collection(db, 'vehicles'), (snapshot) => {
        const data: any[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if(data.length > 0) setVehicles(data);
    });

    // Listen for Blockchain Logs
    const unsubLogs = onSnapshot(collection(db, 'blockchain_logs'), (snapshot) => {
        const data: any[] = snapshot.docs.map(doc => doc.data());
        if(data.length > 0) setBlockchainLogs(data);
    });

    return () => { unsubClaims(); unsubNotifs(); unsubUsers(); unsubVehicles(); unsubLogs(); };
  }, []);

  const redirectBasedOnRole = (role: Role) => {
      switch (role) {
        case Role.DRIVER: setCurrentView(View.DRIVER_DASHBOARD); break;
        case Role.ADMIN: setCurrentView(View.ADMIN_DASHBOARD); break;
        case Role.POLICE: setCurrentView(View.POLICE_DASHBOARD); break;
        case Role.INSURANCE: setCurrentView(View.INSURANCE_DASHBOARD); break;
        default: setCurrentView(View.DRIVER_DASHBOARD);
      }
  };
  
  const handleResetPassword = async (email: string) => {
    if(!email) return showToast("Please enter your email address first", "error");
    try {
      await resetPassword(email);
      showToast("Password reset email sent! Check your inbox.", "success");
    } catch(e: any) {
      console.error(e);
      showToast("Error sending reset email: " + e.message, "error");
    }
  };

  const handleAuthAction = async (email: string, password: string, role: Role) => {
    // 1. Validation
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
        showToast("Please enter a valid email address", "error");
        return;
    }
    if (!password || password.length < 6) {
        showToast("Password must be at least 6 characters", "error");
        return;
    }

    try {
      if (isMock) {
        console.warn("Using Mock Login (No valid Firebase API Key found)");
        const mockUser = MOCK_USERS.find(u => u.role === role);
        if (mockUser) {
           setCurrentUser(mockUser);
           redirectBasedOnRole(role);
           showToast("Demo Mode: Logged In", "success");
           return;
        }
      }

      let userCredential;
      let isNewRegistration = false;

      // Check currentView to decide action
      if (currentView === View.REGISTER) {
        isNewRegistration = true;
        userCredential = await registerUser(cleanEmail, password);
      } else {
        userCredential = await loginUser(cleanEmail, password);
      }

      const { user, token } = userCredential;
      let profile: any = null;

      if (isNewRegistration) {
        // Create user profile in Firestore if registering
        const newProfile = {
          name: cleanEmail.split('@')[0], // Default name from email
          email: cleanEmail,
          role: role, // Use the selected role explicitly
          avatar: `https://ui-avatars.com/api/?name=${cleanEmail.split('@')[0]}&background=random`
        };
        await setDoc(doc(db, "users", user.uid), newProfile);
        profile = newProfile;
        showToast("Registration successful", "success");
      } else {
        // Fetch existing profile
        const snap = await getDoc(doc(db, "users", user.uid));
        if (!snap.exists()) {
          // If no profile exists (legacy user?), create one based on current context or default
           const newProfile = {
            name: user.email?.split('@')[0] || 'User',
            email: user.email,
            role: Role.DRIVER,
            avatar: `https://ui-avatars.com/api/?name=${user.email}&background=random`
          };
          await setDoc(doc(db, "users", user.uid), newProfile);
          profile = newProfile;
        } else {
          profile = snap.data();
        }
        showToast("Login successful", "success");
      }

      setCurrentUser({
        id: user.uid,
        name: profile.name || profile.full_name,
        email: profile.email,
        role: profile.role,
        avatar: profile.avatar || profile.avatar_url
      });

      // Redirect using the actual profile role
      redirectBasedOnRole(profile.role);

      localStorage.setItem("token", token);
      
    } catch (err: any) {
      console.error("Auth Error:", err);
      let msg = "Authentication failed. Please try again.";
      if (err.code === 'auth/email-already-in-use') msg = 'Email already registered. Please login.';
      else if (err.code === 'auth/invalid-credential') msg = 'Incorrect email or password.';
      showToast(msg, "error");
    }
  };

  const handleGoogleLogin = async () => {
    try {
      if (isMock) {
        const mockUser = MOCK_USERS[0];
        setCurrentUser(mockUser);
        redirectBasedOnRole(mockUser.role);
        showToast("Demo Mode: Logged in (Google Simulated)", "success");
        return;
      }
      const { user, token } = await loginWithGoogle();
      
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      
      let profile: any;

      if (userSnap.exists()) {
        profile = userSnap.data();
        showToast("Welcome back!", "success");
      } else {
        const newProfile = {
          name: user.displayName || user.email?.split('@')[0],
          email: user.email,
          role: Role.DRIVER, // Default role for Google Login
          avatar: user.photoURL
        };
        await setDoc(userRef, newProfile);
        profile = newProfile;
        showToast("Account created successfully!", "success");
      }

      setCurrentUser({
        id: user.uid,
        name: profile.name || profile.full_name,
        email: profile.email,
        role: profile.role,
        avatar: profile.avatar || profile.avatar_url
      });

      redirectBasedOnRole(profile.role);
      localStorage.setItem("token", token);

    } catch (err: any) {
      console.error(err);
      
      if (err.code === 'auth/unauthorized-domain') {
        showToast(`Domain unauthorized. Falling back to Demo Mode.`, "info");
        const mockUser = {
           id: 'google_mock_' + Date.now(),
           name: 'Demo Google User',
           email: 'demo@gmail.com',
           role: Role.DRIVER,
           avatar: 'https://ui-avatars.com/api/?name=Google+User&background=random'
        };
        setCurrentUser(mockUser);
        redirectBasedOnRole(Role.DRIVER);
        return;
      }

      showToast("Google Sign-In failed", "error");
    }
  };

  const handleLogout = async () => {
    try {
      if (!isMock) {
        await logoutUser();
      }
      localStorage.removeItem("token");
      setCurrentUser(null);
      setCurrentView(View.LANDING);
      showToast("Logged out successfully");
    } catch (err) {
      console.error(err);
    }
  };
  
  const handleUpdateProfile = (updatedUser: User) => {
    setCurrentUser(updatedUser);
  };

  // Create Claim Logic with Firestore
  const handleCreateClaim = async () => {
    if(!newClaimForm.amount || !newClaimForm.desc) {
      showToast("Please fill all fields", "error");
      return;
    }
    
    try {
        const newClaim = {
          accidentId: 'acc_manual_' + Date.now(),
          driverId: currentUser?.id || 'u1',
          amount: Number(newClaimForm.amount),
          status: ClaimStatus.PENDING,
          fraudProbability: analysisResult?.confidence ? 100 - analysisResult.confidence : 50,
          submittedAt: new Date().toISOString(),
          aiNotes: newClaimForm.desc
        };

        // Update Firestore
        await addDoc(collection(db, "claims"), newClaim);
        
        showToast("Claim submitted successfully to Database!", "success");
        setModalType(null);
        setNewClaimForm({ amount: '', desc: '', date: '' });
        setClaimImage(null);
        setAnalysisResult(null);
    } catch(e) {
        console.error(e);
        showToast("Failed to create claim", "error");
    }
  };

  // Real Gemini Analysis Logic
  const runGeminiAnalysis = async (base64Data: string) => {
    setIsAnalyzing(true);
    try {
      const cleanBase64 = base64Data.split(',')[1] || base64Data;
      if (!process.env.API_KEY) {
        setTimeout(() => {
          setAnalysisResult({
             cost: 125000,
             severity: 'Moderate',
             description: 'Simulated (No API Key): Detected dent on front bumper and scratched headlight assembly.',
             confidence: 94
           });
           setIsAnalyzing(false);
           showToast("AI Analysis Complete (Demo Mode)", "info");
        }, 2000);
        return;
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
            { text: "Analyze this vehicle accident image. Return a raw JSON object (no markdown) with these fields: cost (estimated integer INR repair cost), severity (Minor, Moderate, Severe, Critical), description (concise summary of damage), confidence (0-100 integer)." }
          ]
        }
      });

      const text = response.text || "{}";
      const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const result = JSON.parse(cleanText);
      
      setAnalysisResult(result);
      showToast("AI Analysis Complete!", "success");
    } catch (error) {
      console.error("AI Error", error);
      showToast("AI Analysis Failed", "error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setClaimImage(base64String);
        runGeminiAnalysis(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAutoFill = () => {
    if (analysisResult) {
      setNewClaimForm(prev => ({
        ...prev,
        amount: analysisResult.cost.toString(),
        desc: analysisResult.description
      }));
      showToast("Form auto-filled from AI Analysis", "success");
    }
  };

  const handleSaveUser = async () => {
    if (!userForm.name || !userForm.email) {
      showToast("Name and Email are required", "error");
      return;
    }
    
    try {
        if (modalType === 'ADD_USER') {
          await addDoc(collection(db, "users"), {
            name: userForm.name,
            email: userForm.email,
            role: userForm.role,
            avatar: `https://picsum.photos/200/200?random=${Date.now()}`
          });
          showToast("User added successfully to Database");
        } else if (modalType === 'EDIT_USER' && modalData) {
          await setDoc(doc(db, "users", modalData.id), {
             name: userForm.name,
             email: userForm.email,
             role: userForm.role
          }, { merge: true });
          showToast("User updated successfully");
        }
        setModalType(null);
        setUserForm({ name: '', email: '', role: Role.DRIVER });
        setModalData(null);
    } catch (e) {
        console.error(e);
        showToast("Failed to save user", "error");
    }
  };

  const handleDeleteUser = async () => {
    if (userToDelete) {
      showToast("User deleted logic executed (DB update requires admin privs)");
      setModalType(null);
      setUserToDelete(null);
    }
  };

  const handleChoosePlan = (planName: string) => {
    showToast(`You have selected the ${planName} plan. Redirecting to payment...`, "success");
    setTimeout(() => {
       setCurrentView(View.LOGIN);
    }, 1500);
  };

  const handleRenewInsurance = () => {
    if (modalData) {
      // Simulate frontend update optimistically, but also update DB
      setDoc(doc(db, "vehicles", modalData.id), {
        insuranceExpiry: new Date(new Date(modalData.insuranceExpiry).setFullYear(new Date(modalData.insuranceExpiry).getFullYear() + 1)).toISOString()
      }, { merge: true });
      showToast(`Insurance renewed for ${modalData.model} until next year!`, "success");
      setModalType(null);
    }
  };

  const renderModalContent = () => {
    switch (modalType) {
      case 'NEW_CLAIM':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Accident Date</label>
                    <input type="date" className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-indigo-500" 
                      value={newClaimForm.date} onChange={e => setNewClaimForm({...newClaimForm, date: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Estimated Amount (₹)</label>
                    <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                      value={newClaimForm.amount} onChange={e => setNewClaimForm({...newClaimForm, amount: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Description / AI Notes</label>
                    <textarea className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white h-32 focus:outline-none focus:border-indigo-500 text-sm"
                      value={newClaimForm.desc} onChange={e => setNewClaimForm({...newClaimForm, desc: e.target.value})} placeholder="Describe the incident..."></textarea>
                  </div>
               </div>

               <div className="space-y-4">
                  <label className="block text-sm text-slate-400 mb-1">Evidence Photo (AI Scan)</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-slate-900/50 border-2 border-dashed border-slate-700 rounded-xl h-48 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-slate-800 transition group relative overflow-hidden"
                  >
                     <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                     
                     {!claimImage ? (
                       <>
                         <div className="p-3 bg-slate-800 rounded-full text-slate-400 group-hover:text-indigo-400 transition mb-2">
                           <Camera size={24} />
                         </div>
                         <p className="text-xs text-slate-500 group-hover:text-slate-300">Click to upload photo</p>
                       </>
                     ) : (
                       <img src={claimImage} className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition" />
                     )}

                     {isAnalyzing && (
                       <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                          <Scan className="text-indigo-400 animate-pulse w-12 h-12 mb-2" />
                          <p className="text-indigo-400 font-mono text-xs animate-pulse">ANALYZING...</p>
                       </div>
                     )}
                  </div>

                  {analysisResult && (
                    <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-3 animate-fade-in-up">
                       <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm mb-2">
                          <Sparkles size={14} />
                          <h3>AI Assessment</h3>
                       </div>
                       <div className="flex justify-between text-xs mb-2">
                          <span className="text-slate-400">Est. Repair Cost:</span>
                          <span className="text-white font-bold">₹{analysisResult.cost.toLocaleString()}</span>
                       </div>
                       <div className="flex justify-between text-xs mb-3">
                          <span className="text-slate-400">Severity:</span>
                          <span className="text-amber-400 font-bold">{analysisResult.severity}</span>
                       </div>
                       <button 
                         onClick={handleAutoFill}
                         className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 rounded transition flex items-center justify-center gap-2"
                       >
                         <CheckCircle size={12} /> Auto-fill Form
                       </button>
                    </div>
                  )}
               </div>
            </div>

            <button onClick={handleCreateClaim} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg transition shadow-lg shadow-emerald-500/20">
              Submit Claim
            </button>
          </div>
        );
      case 'ADD_USER':
      case 'EDIT_USER':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Full Name</label>
              <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} placeholder="Jane Doe" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Email Address</label>
              <input type="email" className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} placeholder="jane@example.com" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Role</label>
              <select className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value as Role})}>
                {Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <button onClick={handleSaveUser} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg transition">
              {modalType === 'ADD_USER' ? 'Create User' : 'Save Changes'}
            </button>
          </div>
        );
      case 'DELETE_USER':
        return (
          <div className="space-y-4 text-center">
            <div className="mx-auto w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-500 mb-4">
               <AlertOctagon size={32} />
            </div>
            <h3 className="text-lg font-bold text-white">Delete User?</h3>
            <p className="text-slate-400 text-sm">Are you sure you want to remove this user from the system? This action cannot be undone.</p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModalType(null)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-lg transition">Cancel</button>
              <button onClick={handleDeleteUser} className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 rounded-lg transition">Delete</button>
            </div>
          </div>
        );
      case 'VIEW_CLAIM':
        return modalData && (
          <div className="space-y-4">
             <div className="flex justify-between items-center border-b border-slate-700 pb-2">
               <span className="text-slate-400">Claim ID</span>
               <span className="font-mono text-indigo-400">{modalData.id}</span>
             </div>
             <div className="flex justify-between items-center border-b border-slate-700 pb-2">
               <span className="text-slate-400">Amount</span>
               <span className="text-white font-bold">₹{modalData.amount.toLocaleString()}</span>
             </div>
             <div className="flex justify-between items-center border-b border-slate-700 pb-2">
               <span className="text-slate-400">Status</span>
               <StatusBadge status={modalData.status} />
             </div>
             <div className="pt-2">
               <h4 className="font-bold text-white mb-2">AI Assessment</h4>
               <p className="text-slate-400 text-sm bg-slate-900 p-3 rounded-lg">{modalData.aiNotes}</p>
             </div>
          </div>
        );
      case 'VIEW_ACCIDENT':
         return modalData && (
           <div className="space-y-4">
             <img src={modalData.images?.[0] || 'https://via.placeholder.com/400'} className="w-full h-48 object-cover rounded-lg" />
             <div className="grid grid-cols-2 gap-4">
               <div className="bg-slate-900 p-3 rounded">
                 <div className="text-xs text-slate-500">Location</div>
                 <div className="text-white text-sm">{modalData.location?.address || 'Unknown Location'}</div>
               </div>
               <div className="bg-slate-900 p-3 rounded">
                  <div className="text-xs text-slate-500">Severity</div>
                  <div className="text-white text-sm font-bold text-red-400">{modalData.severity}</div>
               </div>
             </div>
             <div>
                <h4 className="font-bold text-white mb-2">AI Forensics</h4>
                <p className="text-slate-400 text-sm bg-slate-900 p-3 rounded-lg">{modalData.aiAnalysis}</p>
             </div>
           </div>
         );
      case 'MANAGE_VEHICLE':
         return modalData && (
           <div className="space-y-4">
             <h4 className="font-bold text-white">{modalData.model} ({modalData.plate})</h4>
             <div className="space-y-2">
                <label className="text-sm text-slate-400">Status</label>
                <select className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" 
                  defaultValue={modalData.status}
                  onChange={(e) => {
                     const newStatus = e.target.value;
                     setDoc(doc(db, "vehicles", modalData.id), { status: newStatus }, { merge: true });
                     showToast(`Vehicle status updated to ${newStatus}`);
                  }}
                >
                  <option value="Active">Active</option>
                  <option value="Repair">Repair</option>
                  <option value="Totaled">Totaled</option>
                </select>
             </div>
           </div>
         );
      case 'RENEW_INSURANCE':
        return modalData && (
          <div className="space-y-6">
             <div className="flex items-center gap-4 p-4 bg-indigo-900/20 border border-indigo-500/30 rounded-xl">
                <ShieldCheck className="text-indigo-400 w-12 h-12" />
                <div>
                   <h3 className="font-bold text-white text-lg">Renew Policy</h3>
                   <p className="text-slate-400 text-sm">Comprehensive Coverage for {modalData.model}</p>
                </div>
             </div>
             
             <div className="space-y-3">
               <div className="flex justify-between text-sm">
                 <span className="text-slate-400">Current Expiry</span>
                 <span className="text-rose-400 font-bold">{new Date(modalData.insuranceExpiry).toLocaleDateString()}</span>
               </div>
               <div className="flex justify-between text-sm">
                 <span className="text-slate-400">New Expiry</span>
                 <span className="text-emerald-400 font-bold">
                   {new Date(new Date(modalData.insuranceExpiry).setFullYear(new Date(modalData.insuranceExpiry).getFullYear() + 1)).toLocaleDateString()}
                 </span>
               </div>
               <div className="border-t border-slate-700 my-4"></div>
               <div className="flex justify-between items-center">
                 <span className="text-white font-bold text-lg">Total Premium</span>
                 <span className="text-white font-bold text-2xl">₹24,999</span>
               </div>
             </div>

             <div className="bg-slate-900 p-4 rounded-lg border border-slate-700 flex items-center gap-3">
               <CreditCard className="text-slate-400" />
               <div className="flex-1">
                 <div className="text-white text-sm font-medium">•••• •••• •••• 4242</div>
                 <div className="text-xs text-slate-500">Expires 12/25</div>
               </div>
               <span className="text-xs text-indigo-400 font-bold cursor-pointer">CHANGE</span>
             </div>

             <button onClick={handleRenewInsurance} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2">
               <CheckCircle size={20} /> Confirm Payment
             </button>
          </div>
        );
      default: return null;
    }
  };

  const getModalTitle = () => {
    switch(modalType) {
      case 'NEW_CLAIM': return 'File New Claim';
      case 'VIEW_CLAIM': return 'Claim Details';
      case 'VIEW_ACCIDENT': return 'Accident Report';
      case 'MANAGE_VEHICLE': return 'Manage Vehicle';
      case 'ADD_USER': return 'Add New User';
      case 'EDIT_USER': return 'Edit User';
      case 'DELETE_USER': return 'Confirm Deletion';
      case 'RENEW_INSURANCE': return 'Insurance Renewal';
      default: return '';
    }
  };

  // Render logic based on CurrentView
  const renderContent = () => {
    switch (currentView) {
      // --- Public Views ---
      case View.LANDING: return <LandingPage onNavigate={setCurrentView} systemStatus={systemStatus} />;
      case View.HOW_IT_WORKS: return <HowItWorksView />;
      case View.FEATURES: return <FeaturesView />;
      case View.PRICING: return <PricingView onChoosePlan={handleChoosePlan} />;
      case View.CONTACT: return <ContactView onNavigate={setCurrentView} notify={showToast} />;
      case View.LOGIN: return <AuthPage type="LOGIN" onLogin={handleAuthAction} onGoogleLogin={handleGoogleLogin} onBack={() => setCurrentView(View.LANDING)} onResetPassword={handleResetPassword} />;
      case View.REGISTER: return <AuthPage type="REGISTER" onLogin={handleAuthAction} onGoogleLogin={handleGoogleLogin} onBack={() => setCurrentView(View.LANDING)} onResetPassword={handleResetPassword} />;

      // --- Driver Views ---
      case View.DRIVER_DASHBOARD: {
        const myVehicle = vehicles.find(v => v.ownerId === currentUser?.id) || vehicles[0];
        const expiryDate = myVehicle ? new Date(myVehicle.insuranceExpiry) : new Date();
        const today = new Date();
        const daysLeft = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
        const isExpired = daysLeft < 0;
        const isExpiringSoon = daysLeft <= 30;

        return (
          <div className="space-y-6">
            {(isExpiringSoon || isExpired) && myVehicle && (
              <div className={`p-4 rounded-xl border flex items-center justify-between animate-fade-in-down ${isExpired ? 'bg-rose-900/30 border-rose-500/50' : 'bg-amber-900/30 border-amber-500/50'}`}>
                <div className="flex items-center gap-3">
                  <AlertTriangle className={isExpired ? 'text-rose-400' : 'text-amber-400'} />
                  <div>
                    <h4 className={`font-bold ${isExpired ? 'text-rose-400' : 'text-amber-400'}`}>
                      {isExpired ? 'Insurance Expired' : 'Insurance Expiring Soon'}
                    </h4>
                    <p className="text-sm text-slate-300">
                      Your policy for {myVehicle.model} {isExpired ? `expired on ${expiryDate.toLocaleDateString()}` : `expires in ${daysLeft} days`}.
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => { setModalType('RENEW_INSURANCE'); setModalData(myVehicle); }}
                  className="bg-white text-slate-900 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-200 transition"
                >
                  Renew Now
                </button>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
               <DashboardCard title="Safety Score" value={myVehicle?.riskScore || 90} icon={<ShieldCheck />} trend="+2.4%" trendUp={true} />
               <DashboardCard title="Monthly Premium" value="₹2,499" icon={<DollarSign />} />
               <DashboardCard title="Total Trips" value="1,240" icon={<MapPin />} trend="+12%" trendUp={true} />
               <DashboardCard title="Active Claims" value={claims.filter(c => c.driverId === currentUser?.id && c.status !== ClaimStatus.APPROVED && c.status !== ClaimStatus.REJECTED).length} icon={<FileText />} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                  <h3 className="font-bold text-white mb-4">Recent Activity</h3>
                  <div className="space-y-4">
                    {[1,2,3].map(i => (
                      <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-700/50 transition">
                        <div className="bg-indigo-900/50 p-2 rounded-lg text-indigo-400"><Car size={20} /></div>
                        <div className="flex-1">
                          <div className="font-bold text-white text-sm">Trip to Downtown</div>
                          <div className="text-xs text-slate-500">Today, 24km • 45 mins</div>
                        </div>
                        <div className="text-emerald-400 font-bold text-sm">98 Score</div>
                      </div>
                    ))}
                  </div>
               </div>
               
               <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 flex flex-col items-center justify-center text-center">
                  <div className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/30">
                    <ShieldCheck size={40} className="text-white" />
                  </div>
                  <h3 className="font-bold text-white text-lg">System Active</h3>
                  <p className="text-slate-400 text-sm mt-2 mb-6">Your vehicle is currently protected by SafeGuard AI.</p>
                  <button className="w-full bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg font-medium transition">
                    View Vehicle Status
                  </button>
               </div>
            </div>
          </div>
        );
      }
      case View.DRIVER_CLAIMS:
        return <DriverClaimsView claims={claims.filter(c => c.driverId === currentUser?.id || currentUser?.role === Role.ADMIN)} onOpenNewClaim={() => setModalType('NEW_CLAIM')} onViewClaim={(c) => { setModalData(c); setModalType('VIEW_CLAIM'); }} />;
      case View.DRIVER_DOCUMENTS:
        return <DriverDocumentsView notify={showToast} />;
      case View.DRIVER_AI_SCORE:
        return <DriverAIScoreView />;
      case View.DRIVER_NOTIFICATIONS:
        return <NotificationsView notifications={notifications} notify={showToast} />;
      case View.DRIVER_PROFILE:
        return currentUser ? <DriverProfileView user={currentUser} onUpdate={handleUpdateProfile} notify={showToast} /> : null;
      case View.DRIVER_LIVE:
        return <div className="flex items-center justify-center h-full text-slate-500">Live Tracking Map Integration Placeholder</div>;
      case View.DRIVER_ACCIDENTS:
        return <div className="flex items-center justify-center h-full text-slate-500">Accident History Placeholder</div>;

      // ... Admin Views ...
      case View.ADMIN_DASHBOARD:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <DashboardCard title="Total Users" value={users.length} icon={<Users />} trend="+12%" trendUp={true} />
            <DashboardCard title="Active Vehicles" value={vehicles.length} icon={<Car />} trend="+5%" trendUp={true} />
            <DashboardCard title="Pending Claims" value={claims.filter(c => c.status === ClaimStatus.UNDER_REVIEW).length} icon={<FileText />} color="bg-indigo-900" />
            <DashboardCard title="Blockchain Tx" value={blockchainLogs.length} icon={<Database />} trend="+100%" trendUp={true} />
          </div>
        );
      case View.ADMIN_USERS:
        return <AdminUsersView users={users} onAdd={() => { setModalType('ADD_USER'); setUserForm({ name: '', email: '', role: Role.DRIVER }); }} onEdit={(u) => { setModalData(u); setUserForm({ name: u.name, email: u.email, role: u.role }); setModalType('EDIT_USER'); }} onDelete={(id) => { setUserToDelete(id); setModalType('DELETE_USER'); }} />;
      case View.ADMIN_VEHICLES:
        return <AdminVehiclesView vehicles={vehicles} notify={showToast} onManageVehicle={(v) => { setModalData(v); setModalType('MANAGE_VEHICLE'); }} />;
      case View.ADMIN_ANALYTICS:
        return <AdminAnalyticsView />;
      case View.ADMIN_BLOCKCHAIN:
        return <BlockchainLogsView logs={blockchainLogs} />;
      case View.ADMIN_SETTINGS:
        return <AdminSettingsView notify={showToast} />;
      
      // ... Police Views ...
      case View.POLICE_DASHBOARD:
        return <PoliceDashboardView notify={showToast} onViewAccident={(a) => { setModalData(a); setModalType('VIEW_ACCIDENT'); }} />;

      // ... Insurance Views ...
      case View.INSURANCE_DASHBOARD:
        return (
          <div className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <DashboardCard title="Claims to Review" value={claims.filter(c => c.status === ClaimStatus.UNDER_REVIEW || c.status === ClaimStatus.PENDING).length} icon={<FileText />} color="bg-indigo-900" />
               <DashboardCard title="Payouts This Month" value="₹12.4L" icon={<DollarSign />} trend="-5%" trendUp={true} />
               <DashboardCard title="Fraud Detected" value="3" icon={<ShieldAlert />} trend="+1" trendUp={false} />
             </div>
             <InsuranceReviewView notify={showToast} />
          </div>
        );
      case View.INSURANCE_REVIEW:
        return <InsuranceReviewView notify={showToast} />;
      case View.INSURANCE_PAYMENTS:
        return (
          <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500">
             <CreditCard size={64} className="mb-4 opacity-20" />
             <h3 className="text-xl font-bold text-white mb-2">Payment Processing</h3>
             <p className="max-w-md text-center">
               This module is connected to the Stripe & Crypto Payment Gateway. 
               Transactions are settled automatically based on Claim Status.
             </p>
          </div>
        );
      default: return null;
    }
  };

  const isPublicView = [
    View.LANDING, View.HOW_IT_WORKS, View.FEATURES, View.PRICING, 
    View.CONTACT, View.LOGIN, View.REGISTER
  ].includes(currentView);

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      {modalType && (
        <Modal title={getModalTitle()} onClose={() => setModalType(null)}>
          {renderModalContent()}
        </Modal>
      )}

      {isPublicView ? (
        <>
          {renderContent()}
          {/* Chat assistant on public pages as guest */}
          <ChatAssistant currentUser={null} /> 
        </>
      ) : (
        /* If logged in or in protected view */
        <DashboardLayout 
           user={currentUser!} 
           currentView={currentView}
           onNavigate={setCurrentView}
           onLogout={handleLogout}
           systemStatus={systemStatus}
        >
          {renderContent()}
        </DashboardLayout>
      )}
    </>
  );
};

export default App;