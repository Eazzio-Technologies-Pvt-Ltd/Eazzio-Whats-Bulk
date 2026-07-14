import React, { useState, useEffect } from "react";
import logo from "../assets/logo.png";
import { 
  MessageSquare, 
  Send, 
  Users, 
  Shield, 
  Zap, 
  BarChart3, 
  ArrowRight, 
  Play, 
  CheckCheck, 
  Sparkles, 
  Smartphone, 
  Layers, 
  Menu, 
  X,
  Clock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function LandingPage({ onLaunchApp }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [playgroundText, setPlaygroundText] = useState("Hey there! 🚀 Just wanted to let you know that our new WhatsApp marketing tool is now live. Try it out!");
  const [hoveredPlan, setHoveredPlan] = useState(null);
  
  const getCardClassName = (index) => {
    const base = "bg-white border rounded-3xl p-8 transition-all duration-305 flex flex-col justify-between relative overflow-hidden group";
    if (hoveredPlan === index) {
      return `${base} border-emerald-500 shadow-xl scale-[1.04] z-20 bg-white/95 backdrop-blur-sm`;
    } else if (hoveredPlan !== null) {
      return `${base} border-slate-200 shadow-sm blur-[2px] opacity-50 scale-[0.96] pointer-events-none`;
    } else {
      return `${base} border-slate-200 shadow-sm hover:-translate-y-1`;
    }
  };

  // Typing simulation state for the hero phone mockup
  const [heroMessages, setHeroMessages] = useState([
    { id: 1, text: "Hey! How does the bulk sender work?", isSender: false, time: "10:30 AM", status: "read" },
  ]);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    const timer1 = setTimeout(() => {
      setIsTyping(true);
    }, 1500);

    const timer2 = setTimeout(() => {
      setIsTyping(false);
      setHeroMessages(prev => [
        ...prev,
        { id: 2, text: "It's super simple! Just type your message, add the recipient's name & number, and click send. 🚀", isSender: true, time: "10:31 AM", status: "read" }
      ]);
    }, 3500);

    const timer3 = setTimeout(() => {
      setIsTyping(true);
    }, 5500);

    const timer4 = setTimeout(() => {
      setIsTyping(false);
      setHeroMessages(prev => [
        ...prev,
        { id: 3, text: "Wow, is it really that fast? ⚡", isSender: false, time: "10:32 AM", status: "read" }
      ]);
    }, 7000);

    const timer5 = setTimeout(() => {
      setIsTyping(true);
    }, 9000);

    const timer6 = setTimeout(() => {
      setIsTyping(false);
      setHeroMessages(prev => [
        ...prev,
        { id: 4, text: "Yes! Delivered instantly with real-time status tracking right from the dashboard. Try it now!", isSender: true, time: "10:33 AM", status: "sent" }
      ]);
    }, 11500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearTimeout(timer5);
      clearTimeout(timer6);
    };
  }, []);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setMobileMenuOpen(false);
    }
  };

  return (
    <div className="min-h-screen text-slate-800 bg-slate-50 font-sans selection:bg-emerald-500 selection:text-white overflow-x-hidden relative">
      {/* Background ambient glowing blobs */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute top-[800px] right-1/4 w-[600px] h-[600px] bg-teal-500/3 rounded-full blur-[150px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[600px] left-10 w-[400px] h-[400px] bg-emerald-600/3 rounded-full blur-[100px] pointer-events-none z-0"></div>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-slate-200 px-6 py-4">
        <div className="w-full px-4 md:px-12 lg:px-16 flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <img src={logo} alt="Whats-Bulk Logo" className="w-10 h-10 object-contain" />
            <div>
              <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">Whats-Bulk</span>
              <span className="text-[10px] block font-mono text-emerald-600/90 -mt-1 font-semibold">SENDER</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <button onClick={() => scrollToSection("pricing")} className="hover:text-emerald-650 transition-colors">Pricing</button>
            <button onClick={() => scrollToSection("features")} className="hover:text-emerald-650 transition-colors">Features</button>
            <button onClick={() => scrollToSection("playground")} className="hover:text-emerald-650 transition-colors">Live Preview</button>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <button 
              onClick={onLaunchApp}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl transition-all duration-200 shadow-md shadow-emerald-600/10 hover:shadow-emerald-600/20 active:scale-95 flex items-center gap-1.5"
            >
              Launch Dashboard <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile menu toggle */}
          <button 
            className="md:hidden text-slate-600 hover:text-emerald-600 transition-colors p-1"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden mt-4 pt-4 border-t border-slate-200 flex flex-col gap-4 text-slate-600 text-base pb-2"
            >
              <button onClick={() => scrollToSection("pricing")} className="text-left py-2 hover:text-emerald-605 transition-colors">Pricing</button>
              <button onClick={() => scrollToSection("features")} className="text-left py-2 hover:text-emerald-605 transition-colors">Features</button>
              <button onClick={() => scrollToSection("playground")} className="text-left py-2 hover:text-emerald-605 transition-colors">Live Preview</button>
              <button 
                onClick={onLaunchApp}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all duration-200 text-center shadow-md shadow-emerald-600/10 mt-2 flex items-center justify-center gap-2"
              >
                Launch Dashboard <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section className="relative w-full px-6 md:px-12 lg:px-16 pt-12 pb-24 md:pt-20 md:pb-32 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center z-10">
        <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-xs font-semibold text-emerald-700">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Smart Automation for WhatsApp</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1] text-slate-900">
            Reach Customers Directly on <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">WhatsApp</span>
          </h1>

          <p className="text-slate-600 text-lg md:text-xl max-w-2xl mx-auto lg:mx-0 leading-relaxed">
            Send message campaigns, notify customers, and streamline WhatsApp outreach in seconds. Zero coding required, robust anti-ban delays, and instant delivery monitoring.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
            <button 
              onClick={onLaunchApp}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-base px-8 py-4 rounded-xl transition-all duration-200 shadow-lg shadow-emerald-600/10 hover:shadow-emerald-600/20 active:scale-98 flex items-center justify-center gap-2 group"
            >
              Start Sending Messages 
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </button>
            <button 
              onClick={() => scrollToSection("playground")}
              className="bg-white hover:bg-slate-100 text-slate-800 font-semibold text-base px-8 py-4 rounded-xl transition-all duration-200 border border-slate-205 shadow-sm active:scale-98 flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 text-emerald-600 fill-emerald-600/25" />
              Try Interactive Preview
            </button>
          </div>

          {/* Short Trust Badges */}
          <div className="pt-4 border-t border-slate-200 max-w-md mx-auto lg:mx-0 grid grid-cols-3 gap-4 text-center lg:text-left">
            <div>
              <div className="text-xl font-bold text-emerald-600">100%</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Delivery Rate</div>
            </div>
            <div>
              <div className="text-xl font-bold text-teal-600">&lt; 2s</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Setup Time</div>
            </div>
            <div>
              <div className="text-xl font-bold text-sky-600">Secure</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Local Session</div>
            </div>
          </div>
        </div>

        {/* Hero Image/Phone Mockup */}
        <div className="lg:col-span-5 flex justify-center relative">
          <div className="absolute inset-0 bg-emerald-500/5 rounded-full filter blur-[80px] -z-10 w-72 h-72 mx-auto my-auto"></div>
          
          {/* Phone Frame */}
          <div className="w-[310px] h-[610px] rounded-[40px] border-[8px] border-slate-300 bg-slate-100 shadow-xl relative overflow-hidden flex flex-col">
            
            {/* Camera notch */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-32 h-4 bg-slate-300 rounded-full z-30"></div>
            
            {/* Phone Header */}
            <div className="bg-slate-100 border-b border-slate-200 px-4 pt-6 pb-3 flex items-center gap-2.5 z-20">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center font-bold text-emerald-700 text-sm">
                C
              </div>
              <div>
                <div className="font-semibold text-xs text-slate-800 flex items-center gap-1">
                  Customer Support
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                </div>
                <div className="text-[9px] text-emerald-600 font-medium">Online</div>
              </div>
              <div className="ml-auto flex gap-3 text-slate-500">
                <Smartphone className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 p-3 bg-[#efeae2] space-y-3 overflow-y-auto text-xs scrollbar-none flex flex-col justify-end">
              {heroMessages.map(msg => (
                <div 
                  key={msg.id} 
                  className={`max-w-[80%] p-2.5 rounded-2xl shadow-sm ${
                    msg.isSender 
                      ? "bg-[#d9fdd3] text-slate-900 font-medium rounded-tr-none self-end" 
                      : "bg-white text-slate-800 rounded-tl-none self-start"
                  }`}
                >
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  <div className={`text-[8px] mt-1 text-right flex items-center justify-end gap-0.5 ${
                    msg.isSender ? "text-slate-500" : "text-slate-400"
                  }`}>
                    <span>{msg.time}</span>
                    {msg.isSender && (
                      msg.status === "read" ? <CheckCheck className="w-3 h-3 text-sky-500" /> : <CheckCheck className="w-3 h-3" />
                    )}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="bg-white text-slate-500 p-2.5 rounded-2xl rounded-tl-none self-start max-w-[80%] flex items-center gap-1 shadow-sm border border-slate-100">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              )}
            </div>

            {/* Phone Footer Input bar */}
            <div className="p-3 bg-slate-105 border-t border-slate-200 flex items-center gap-2 z-20">
              <div className="flex-1 bg-white rounded-full px-3 py-1.5 border border-slate-200 text-[10px] text-slate-450">
                Message...
              </div>
              <div className="w-7 h-7 rounded-full bg-[#00a884] flex items-center justify-center text-white">
                <Send className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 w-full px-6 md:px-12 lg:px-16 bg-slate-100/50 border-y border-slate-200 relative z-10">
        <div className="w-full px-4 md:px-12 lg:px-16">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-xs font-semibold text-emerald-700">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>Flexible Pricing Plans</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900">
              Pricing designed for your business scale
            </h2>
            <p className="text-slate-600 text-base md:text-lg">
              No contracts, no setup fees. Switch or cancel your plan at any time.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 items-stretch">
            {/* Card 1: Free */}
            <div 
              onMouseEnter={() => setHoveredPlan(0)} 
              onMouseLeave={() => setHoveredPlan(null)} 
              className={getCardClassName(0)}
            >
              <div className="space-y-6">
                <div>
                  <span className="text-xs font-bold text-slate-450 uppercase tracking-widest">Basic</span>
                  <h3 className="text-xl font-bold text-slate-900 mt-1">Free Trial</h3>
                  <p className="text-slate-505 text-xs mt-1">Perfect for trying out Whats-Bulk Sender.</p>
                </div>
                <div className="flex items-baseline">
                  <span className="text-5xl font-extrabold text-slate-900">₹0</span>
                  <span className="text-slate-500 text-sm ml-2">/month</span>
                </div>
                <div className="border-t border-slate-100 pt-6">
                  <ul className="space-y-3.5">
                    <li className="flex items-center gap-2.5 text-xs text-slate-600">
                      <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>100 Messages / day</span>
                    </li>
                    <li className="flex items-center gap-2.5 text-xs text-slate-600">
                      <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>1 WhatsApp Session</span>
                    </li>
                    <li className="flex items-center gap-2.5 text-xs text-slate-600">
                      <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Staggered sending delays</span>
                    </li>
                    <li className="flex items-center gap-2.5 text-xs text-slate-600">
                      <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Community support</span>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="mt-8 pt-4">
                <button onClick={onLaunchApp} className="w-full py-3 rounded-xl border border-emerald-600 text-emerald-600 font-bold hover:bg-emerald-50 transition-colors text-sm">
                  Get Started
                </button>
              </div>
            </div>

            {/* Card 2: Starter */}
            <div 
              onMouseEnter={() => setHoveredPlan(1)} 
              onMouseLeave={() => setHoveredPlan(null)} 
              className={getCardClassName(1)}
            >
              <div className="space-y-6">
                <div>
                  <span className="text-xs font-bold text-slate-455 uppercase tracking-widest">Growth</span>
                  <h3 className="text-xl font-bold text-slate-900 mt-1">Starter</h3>
                  <p className="text-slate-550 text-xs mt-1">Ideal for small businesses & startups.</p>
                </div>
                <div className="flex items-baseline">
                  <span className="text-5xl font-extrabold text-slate-900">₹99</span>
                  <span className="text-slate-500 text-sm ml-2">/month</span>
                </div>
                <div className="border-t border-slate-100 pt-6">
                  <ul className="space-y-3.5">
                    <li className="flex items-center gap-2.5 text-xs text-slate-600">
                      <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>2,500 Messages / day</span>
                    </li>
                    <li className="flex items-center gap-2.5 text-xs text-slate-600">
                      <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>3 WhatsApp Sessions</span>
                    </li>
                    <li className="flex items-center gap-2.5 text-xs text-slate-600">
                      <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Custom Name variables</span>
                    </li>
                    <li className="flex items-center gap-2.5 text-xs text-slate-600">
                      <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Media & Doc Attachments</span>
                    </li>
                    <li className="flex items-center gap-2.5 text-xs text-slate-600">
                      <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Email Support</span>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="mt-8 pt-4">
                <button onClick={onLaunchApp} className="w-full py-3 rounded-xl border border-emerald-600 text-emerald-600 font-bold hover:bg-emerald-50 transition-colors text-sm">
                  Choose Starter
                </button>
              </div>
            </div>

            {/* Card 3: Pro */}
            <div 
              onMouseEnter={() => setHoveredPlan(2)} 
              onMouseLeave={() => setHoveredPlan(null)} 
              className={getCardClassName(2)}
            >
              <div className="space-y-6">
                <div>
                  <span className="text-xs font-bold text-slate-455 uppercase tracking-widest">Business</span>
                  <h3 className="text-xl font-bold text-slate-900 mt-1">Pro Plan</h3>
                  <p className="text-slate-550 text-xs mt-1">For marketing agencies & power users.</p>
                </div>
                <div className="flex items-baseline">
                  <span className="text-5xl font-extrabold text-slate-900">₹199</span>
                  <span className="text-slate-500 text-sm ml-2">/month</span>
                </div>
                <div className="border-t border-slate-100 pt-6">
                  <ul className="space-y-3.5">
                    <li className="flex items-center gap-2.5 text-xs text-slate-600">
                      <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Unlimited Messages / day</span>
                    </li>
                    <li className="flex items-center gap-2.5 text-xs text-slate-600">
                      <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>10 WhatsApp Sessions</span>
                    </li>
                    <li className="flex items-center gap-2.5 text-xs text-slate-600">
                      <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Fast Staggered Sending</span>
                    </li>
                    <li className="flex items-center gap-2.5 text-xs text-slate-600">
                      <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Cloud backup for attachments</span>
                    </li>
                    <li className="flex items-center gap-2.5 text-xs text-slate-600">
                      <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Priority 24/7 Support</span>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="mt-8 pt-4">
                <button onClick={onLaunchApp} className="w-full py-3 rounded-xl border border-emerald-600 text-emerald-600 font-bold hover:bg-emerald-50 transition-colors text-sm">
                  Go Pro Now
                </button>
              </div>
            </div>

            {/* Card 4: Enterprise */}
            <div 
              onMouseEnter={() => setHoveredPlan(3)} 
              onMouseLeave={() => setHoveredPlan(null)} 
              className={getCardClassName(3)}
            >
              <div className="space-y-6">
                <div>
                  <span className="text-xs font-bold text-slate-455 uppercase tracking-widest">Enterprise</span>
                  <h3 className="text-xl font-bold text-slate-900 mt-1">Enterprise</h3>
                  <p className="text-slate-550 text-xs mt-1">Custom tools for high volume teams.</p>
                </div>
                <div className="flex items-baseline">
                  <span className="text-5xl font-extrabold text-slate-900">₹299</span>
                  <span className="text-slate-500 text-sm ml-2">/month</span>
                </div>
                <div className="border-t border-slate-100 pt-6">
                  <ul className="space-y-3.5">
                    <li className="flex items-center gap-2.5 text-xs text-slate-600">
                      <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Everything in Pro</span>
                    </li>
                    <li className="flex items-center gap-2.5 text-xs text-slate-600">
                      <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Unlimited Accounts</span>
                    </li>
                    <li className="flex items-center gap-2.5 text-xs text-slate-600">
                      <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>API Integrations access</span>
                    </li>
                    <li className="flex items-center gap-2.5 text-xs text-slate-600">
                      <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Dedicated Session Manager</span>
                    </li>
                    <li className="flex items-center gap-2.5 text-xs text-slate-600">
                      <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Account Manager support</span>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="mt-8 pt-4">
                <button onClick={onLaunchApp} className="w-full py-3 rounded-xl border border-emerald-600 text-emerald-600 font-bold hover:bg-emerald-50 transition-colors text-sm">
                  Contact Sales
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Cards Grid Section */}
      <section id="features" className="bg-slate-100/50 border-y border-slate-200 py-20 relative z-10">
        <div className="w-full px-6 md:px-12 lg:px-16">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900">
              Built for Speed, Engineered for Safety
            </h2>
            <p className="text-slate-600 text-base md:text-lg">
              Everything you need to broadcast marketing messages, client notifications, and announcements through WhatsApp with built-in safeguards.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white border border-slate-200 p-8 rounded-2xl hover:border-emerald-500/30 hover:shadow-md transition-all duration-300 group hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Instant Message Delivery</h3>
              <p className="text-slate-655 text-sm leading-relaxed">
                Connect and broadcast in real-time. Messages are sent sequentially with instant updates on success or error logs.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white border border-slate-200 p-8 rounded-2xl hover:border-emerald-500/30 hover:shadow-md transition-all duration-300 group hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Shield className="w-6 h-6 text-teal-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Anti-Ban Mechanisms</h3>
              <p className="text-slate-655 text-sm leading-relaxed">
                Uses organic staggered delays and connection handling to match natural typing patterns, protecting your WhatsApp account from restrictions.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white border border-slate-200 p-8 rounded-2xl hover:border-emerald-500/30 hover:shadow-md transition-all duration-300 group hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Real-time Campaign Monitor</h3>
              <p className="text-slate-655 text-sm leading-relaxed">
                Detailed delivery indicators (Sending, Success, Error status) let you know exactly who received your message and when.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white border border-slate-200 p-8 rounded-2xl hover:border-emerald-500/30 hover:shadow-md transition-all duration-300 group hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Custom Recipient Fields</h3>
              <p className="text-slate-655 text-sm leading-relaxed">
                Address recipients by their names. Personalizing your messages increases click-through rates and client satisfaction dramatically.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white border border-slate-200 p-8 rounded-2xl hover:border-emerald-500/30 hover:shadow-md transition-all duration-300 group hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-sky-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Smartphone className="w-6 h-6 text-sky-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Seamless Session Persistence</h3>
              <p className="text-slate-655 text-sm leading-relaxed">
                Scan once and stay logged in. Our local session technology remembers your QR configuration so you can start sending instantly every time.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-white border border-slate-200 p-8 rounded-2xl hover:border-emerald-500/30 hover:shadow-md transition-all duration-300 group hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Layers className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">No Backend Coding Needed</h3>
              <p className="text-slate-655 text-sm leading-relaxed">
                Simple, beautiful web interface controls the powerful backend driver automatically. Just input your messaging details and watch it run.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Mockup Playground Section */}
      <section id="playground" className="py-20 w-full px-6 md:px-12 lg:px-16 relative z-10">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900">
            See Your Messages in Action
          </h2>
          <p className="text-slate-600 text-base">
            Type anything in the composer below and preview exactly how it will be delivered and rendered on a client's WhatsApp device screen.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-slate-100/40 border border-slate-200 p-8 rounded-3xl backdrop-blur-sm">
          {/* Playground Left: Composer Input */}
          <div className="lg:col-span-6 space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2.5">
                Live Composer
              </label>
              <textarea
                value={playgroundText}
                onChange={(e) => setPlaygroundText(e.target.value)}
                placeholder="Type your WhatsApp notification body..."
                className="w-full h-44 p-4 rounded-xl bg-white border border-slate-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition-all text-sm text-slate-900 placeholder-slate-400 resize-none leading-relaxed"
              />
            </div>

            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Quick Templates</span>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => setPlaygroundText("Hello {{Name}}! 👋 Your order #1085 has been shipped. Track your shipment live here: bit.ly/track-order-now")}
                  className="bg-white border border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-slate-700 text-xs px-3 py-1.5 rounded-lg transition-all"
                >
                  📦 Order Shipped
                </button>
                <button 
                  onClick={() => setPlaygroundText("Hi {{Name}}, ⚠️ friendly reminder that our consulting session is starting in 15 minutes. Join link: zoom.us/j/meeting")}
                  className="bg-white border border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-slate-700 text-xs px-3 py-1.5 rounded-lg transition-all"
                >
                  ⏰ Meeting Reminder
                </button>
                <button 
                  onClick={() => setPlaygroundText("Hey {{Name}}! 🌟 Thank you for subscribing. Here is your exclusive 20% discount code: WELCOME20")}
                  className="bg-white border border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-slate-700 text-xs px-3 py-1.5 rounded-lg transition-all"
                >
                  🔥 Promo Discount
                </button>
              </div>
            </div>
          </div>

          {/* Playground Right: Realtime Preview Frame */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="w-[340px] bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden flex flex-col">
              
              {/* WhatsApp Mock Topbar */}
              <div className="bg-slate-100 border-b border-slate-200 px-4 py-3 flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-xs font-bold text-slate-800">Live Preview Container</span>
                <span className="text-[9px] text-slate-500 ml-auto font-mono">Mobile View</span>
              </div>

              {/* Chat Area */}
              <div className="h-64 p-4 bg-[#efeae2] flex flex-col justify-center">
                <div className="bg-[#d9fdd3] text-slate-900 p-3 rounded-2xl rounded-tr-none self-end max-w-[90%] shadow-sm relative group">
                  <p className="text-xs leading-relaxed font-semibold whitespace-pre-wrap">
                    {playgroundText.replace("{{Name}}", "Amit")}
                  </p>
                  <div className="text-[8px] text-slate-500 mt-1.5 text-right flex items-center justify-end gap-0.5">
                    <span>12:00 PM</span>
                    <CheckCheck className="w-3.5 h-3.5 text-sky-500 stroke-[2]" />
                  </div>
                </div>
              </div>

              {/* Tips footer */}
              <div className="p-3 bg-slate-100 border-t border-slate-200 text-center">
                <p className="text-[10px] text-slate-600">
                  Tip: Use <code className="text-emerald-700 bg-slate-200/50 px-1 py-0.5 rounded font-mono">{"{{Name}}"}</code> inside variables to personalize messages.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-12 px-6 bg-white relative z-10">
        <div className="w-full px-4 md:px-12 lg:px-16 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Whats-Bulk Logo" className="w-8 h-8 object-contain" />
            <span className="font-bold text-lg bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">Whats-Bulk</span>
          </div>

          <p className="text-slate-500 text-xs">
            © {new Date().getFullYear()} Whats-Bulk Sender. Built with privacy and optimization. All rights reserved.
          </p>

          <div className="flex gap-4 text-xs text-slate-500">
            <button className="hover:text-emerald-600 transition-colors">Privacy Policy</button>
            <span>•</span>
            <button className="hover:text-emerald-600 transition-colors">Terms of Service</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
