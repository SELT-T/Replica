// src/pages/HelpSupport.jsx
import React, { useState } from "react";
import {
  LifeBuoy, Mail, Phone, MessageCircle, FileText, Video,
  ChevronDown, ChevronUp, Send, CheckCircle, ExternalLink,
  Search, AlertCircle, HelpCircle
} from "lucide-react";

export default function HelpSupport() {
  // --- STATE MANAGEMENT ---
  const [activeFAQ, setActiveFAQ] = useState(null);
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);
  const [ticketSent, setTicketSent] = useState(false);

  // --- HANDLERS ---
  const toggleFAQ = (index) => {
    setActiveFAQ(activeFAQ === index ? null : index);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;

    setSending(true);
    // Simulate Backend API Call
    setTimeout(() => {
      setSending(false);
      setTicketSent(true);
      setFormData({ name: "", email: "", subject: "", message: "" });
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => setTicketSent(false), 5000);
    }, 1500);
  };

  // --- DATA: FAQS ---
  const faqs = [
    {
      q: "How often does the data sync with Tally?",
      a: "Data sync frequency depends on your settings. By default, it auto-syncs every 2 hours. You can also trigger a 'Manual Sync' from the Analyst Dashboard anytime."
    },
    {
      q: "Why can't I see the latest invoices?",
      a: "Please check if the 'Tally Connector' is running on your server. Also, try clearing the application cache from Settings > Advanced > Clear Cache."
    },
    {
      q: "How do I add a new Salesman user?",
      a: "Go to Settings > User & Role Management. You can invite a new user via email and assign them the 'Salesman' role. They will receive login credentials via email."
    },
    {
      q: "Is my data secure?",
      a: "Yes, we use end-to-end encryption for data transfer. You can also enable Two-Factor Authentication (2FA) in Settings > Security for extra protection."
    },
    {
      q: "Can I export reports to PDF?",
      a: "Absolutely! Every report page (Sales, Outstanding, Hierarchy) has an 'Export' button at the top right corner supporting both PDF and Excel formats."
    }
  ];

  return (
    <div className="p-4 md:p-6 min-h-screen bg-gray-50 text-slate-800 font-sans pb-20">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER HERO SECTION */}
        <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm text-center relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600"></div>
           <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <LifeBuoy size={40} className="text-blue-600 animate-bounce-slow" />
           </div>
           <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 tracking-tight">How can we help you today?</h1>
           <p className="text-slate-500 max-w-2xl mx-auto text-lg">
             Search our knowledge base, explore FAQs, or get in touch with our support team directly.
           </p>
           
           {/* Search Bar */}
           <div className="mt-8 max-w-lg mx-auto relative group">
             <Search className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-blue-600 transition-colors" size={20} />
             <input 
               type="text" 
               placeholder="Search for answers (e.g., 'Tally Sync', 'Invoice')..." 
               className="w-full bg-gray-50 border border-gray-200 rounded-full py-3.5 pl-12 pr-6 text-gray-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none shadow-inner transition-all placeholder:text-gray-400"
             />
           </div>
        </div>

        {/* QUICK CONTACT CARDS */}
        <div className="grid md:grid-cols-3 gap-6">
          <ContactCard 
            icon={<Phone size={24} />} 
            title="Call Support" 
            info="+91 9300000326" 
            sub="Mon-Fri, 10am - 7pm"
            action="Call Now"
            link="tel:+919300000326"
            color="text-blue-600"
            bg="bg-blue-50"
            borderColor="border-blue-100"
          />
          <ContactCard 
            icon={<Mail size={24} />} 
            title="Email Us" 
            info="support@sel-t.com" 
            sub="Response within 24 hours"
            action="Send Email"
            link="mailto:support@sel-t.com"
            color="text-emerald-600"
            bg="bg-emerald-50"
            borderColor="border-emerald-100"
          />
          <ContactCard 
            icon={<MessageCircle size={24} />} 
            title="WhatsApp Chat" 
            info="Live Chat Support" 
            sub="Available 24/7 for urgent issues"
            action="Chat Now"
            link="https://wa.me/919300000326"
            color="text-green-600"
            bg="bg-green-50"
            borderColor="border-green-100"
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN: FAQs & RESOURCES */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* FAQ SECTION */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <HelpCircle size={22} className="text-blue-600"/> Frequently Asked Questions
              </h2>
              <div className="space-y-3">
                {faqs.map((item, index) => (
                  <div key={index} className={`border rounded-xl overflow-hidden transition-all duration-200 ${activeFAQ === index ? "border-blue-200 bg-blue-50/30" : "border-gray-200 bg-white"}`}>
                    <button 
                      onClick={() => toggleFAQ(index)}
                      className="w-full flex justify-between items-center p-4 text-left hover:bg-gray-50 transition-colors"
                    >
                      <span className={`font-semibold ${activeFAQ === index ? "text-blue-700" : "text-gray-700"}`}>{item.q}</span>
                      {activeFAQ === index ? <ChevronUp size={20} className="text-blue-600" /> : <ChevronDown size={20} className="text-gray-400" />}
                    </button>
                    {activeFAQ === index && (
                      <div className="p-4 pt-0 text-slate-600 text-sm leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="h-px w-full bg-blue-100 mb-3"></div>
                        <p>{item.a}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* DOCUMENTATION LINKS */}
            <div className="grid sm:grid-cols-2 gap-4">
               <DocCard icon={<FileText size={20} />} title="User Manual" desc="Comprehensive guide for all features." />
               <DocCard icon={<Video size={20} />} title="Video Tutorials" desc="Step-by-step video walkthroughs." />
            </div>

          </div>

          {/* RIGHT COLUMN: CONTACT FORM */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg sticky top-6">
               <div className="flex items-center gap-3 mb-2">
                 <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                    <AlertCircle size={24} />
                 </div>
                 <h2 className="text-xl font-bold text-gray-900">Raise a Ticket</h2>
               </div>
               <p className="text-slate-500 text-sm mb-6 pl-1">Facing an issue? Fill out the form below and our tech team will resolve it.</p>

               {ticketSent ? (
                 <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center animate-in zoom-in duration-300">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle size={32} className="text-green-600" />
                    </div>
                    <h3 className="text-gray-900 font-bold text-lg mb-1">Ticket #2938 Created!</h3>
                    <p className="text-slate-600 text-sm mb-4">We have received your request. Check your email for updates.</p>
                    <button onClick={() => setTicketSent(false)} className="text-sm text-blue-600 font-semibold hover:underline">Send another message</button>
                 </div>
               ) : (
                 <form onSubmit={handleSubmit} className="space-y-4">
                   <div>
                     <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1.5">Your Name</label>
                     <input 
                       type="text" name="name" required
                       value={formData.name} onChange={handleInputChange}
                       className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-800 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                       placeholder="e.g. John Doe"
                     />
                   </div>
                   <div>
                     <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1.5">Email Address</label>
                     <input 
                       type="email" name="email" required
                       value={formData.email} onChange={handleInputChange}
                       className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-800 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                       placeholder="nomail@example.com"
                     />
                   </div>
                   <div>
                     <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1.5">Subject</label>
                     <div className="relative">
                        <select 
                          name="subject"
                          value={formData.subject} onChange={handleInputChange}
                          className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-800 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none appearance-none transition-all"
                        >
                          <option value="">Select Issue Type</option>
                          <option value="Technical Bug">Technical Bug</option>
                          <option value="Data Sync Issue">Data Sync Issue</option>
                          <option value="Feature Request">Feature Request</option>
                          <option value="Billing">Billing & Account</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-3.5 text-gray-400 pointer-events-none" size={16}/>
                     </div>
                   </div>
                   <div>
                     <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1.5">Message</label>
                     <textarea 
                       name="message" required
                       value={formData.message} onChange={handleInputChange}
                       className="w-full h-32 bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-800 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none resize-none transition-all"
                       placeholder="Describe your issue in detail..."
                     />
                   </div>
                   
                   <button 
                     type="submit" 
                     disabled={sending}
                     className="w-full bg-gray-900 hover:bg-black text-white font-bold py-3.5 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-[0.98]"
                   >
                     {sending ? "Sending..." : <>Submit Ticket <Send size={18} /></>}
                   </button>
                 </form>
               )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

/* --- REUSABLE COMPONENTS (White Theme) --- */

function ContactCard({ icon, title, info, sub, action, link, color, bg, borderColor }) {
  return (
    <div className={`bg-white p-6 rounded-xl border ${borderColor} shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-300 group`}>
      <div className={`w-12 h-12 rounded-full ${bg} flex items-center justify-center mb-4 ${color} group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-1">{title}</h3>
      <p className={`text-xl font-bold ${color} mb-1`}>{info}</p>
      <p className="text-gray-400 text-xs mb-5 font-medium">{sub}</p>
      <a 
        href={link} target="_blank" rel="noreferrer"
        className={`inline-flex items-center gap-1 text-sm font-bold ${color} hover:underline transition-all`}
      >
        {action} <ExternalLink size={14} />
      </a>
    </div>
  );
}

function DocCard({ icon, title, desc }) {
  return (
    <a href="#" className="flex items-center gap-4 bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group">
      <div className="p-3 bg-gray-50 rounded-lg text-gray-500 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
        {icon}
      </div>
      <div>
        <h4 className="font-bold text-gray-800 group-hover:text-blue-700 transition-colors">{title}</h4>
        <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
      </div>
      <ExternalLink size={16} className="ml-auto text-gray-300 group-hover:text-blue-500 transition-colors" />
    </a>
  );
}
