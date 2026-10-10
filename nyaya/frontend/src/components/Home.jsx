import React, { useState, useEffect } from 'react';
import { Search, ArrowRight, House, Briefcase, FileText, Landmark, ShieldAlert, Clock, AlertCircle, Book, Scale, Gavel, FileSignature } from 'lucide-react';
import { getCases } from '../utils/storage';
import VoiceMicButton from './VoiceMicButton';

const CITIZEN_CATEGORIES = [
  { id: 'tenant', title: 'Tenant Rights', icon: House, greeting: "Hello! I specialize in Tenant Rights. Are you dealing with a security deposit issue, an eviction, or a lease dispute?" },
  { id: 'consumer', title: 'Consumer Complaints', icon: Search, greeting: "Hello! I can help you navigate consumer protection laws. What product, service, or seller are you having trouble with?" },
  { id: 'workplace', title: 'Workplace Issues', icon: Briefcase, greeting: "Hello! I'm here to assist with workplace rights. Are you facing problems with wrongful termination, unpaid wages, or harassment?" },
  { id: 'rti', title: 'RTI Applications', icon: FileText, greeting: "Hello! I can help you draft a Right to Information (RTI) application." },
  { id: 'harassment', title: 'Sexual Harassment / Abuse', icon: AlertCircle, greeting: "Hello. I'm here to support you in a safe space. I can provide information on your legal rights, workplace POSH laws, and protective measures regarding sexual harassment or abuse. How can I help you today?" },
  { id: 'cybercrime', title: 'Cybercrime', icon: ShieldAlert, greeting: "Hello! I can help you understand your legal options regarding cybercrime. Are you dealing with online fraud, identity theft, or digital harassment?" },
];

const PRO_CATEGORIES = [
  { id: 'caselaw', title: 'Case Law Research', icon: Book, greeting: "I am ready to assist with legal research. Please provide the issue, relevant statutes, or specific judgments you are looking to analyze." },
  { id: 'bareacts', title: 'Statutes & Bare Acts', icon: Scale, greeting: "I can help lookup and interpret specific sections across the BNS, BNSS, BSA, IPC, CrPC, and other Indian statutes. What are you looking for?" },
  { id: 'bail', title: 'Bail Application Drafting', icon: Gavel, greeting: "I can assist in drafting bail applications." },
  { id: 'legalnotice', title: 'Legal Notice Drafting', icon: FileSignature, greeting: "Please provide the details for the legal notice, including the parties involved, the cause of action, and the specific demands." },
];

export default function Home({ onNavigate, userPersona, user }) {
  const getUserName = (user) => {
    if (!user) return '';
    if (user.user_metadata?.full_name) return user.user_metadata.full_name.split(' ')[0];
    if (user.user_metadata?.name) return user.user_metadata.name.split(' ')[0];
    if (user.email) return user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1);
    return '';
  };
  
  const userName = getUserName(user);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentCase, setRecentCase] = useState(null);

  useEffect(() => {
    const fetchCases = async () => {
      const cases = await getCases();
      if (cases.length > 0) {
        setRecentCase(cases[0]);
      }
    };
    fetchCases();
  }, []);

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return 'Unknown date';
    const date = new Date(dateStr);
    const diffInSeconds = Math.floor((new Date() - date) / 1000);
    if (diffInSeconds < 60) return 'Saved just now';
    if (diffInSeconds < 3600) return `Saved ${Math.floor(diffInSeconds / 60)} mins ago`;
    if (diffInSeconds < 86400) return `Saved ${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `Saved ${Math.floor(diffInSeconds / 86400)} days ago`;
  };

  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      onNavigate('chat', searchQuery, true); // True to auto-send from search bar
    } else {
      onNavigate('chat');
    }
  };

  return (
    <div className="home-single-screen">
      {/* Compact Hero Section */}
      <section className="home-hero">
        <h2>{userName ? `Hi ${userName}, how can we help you today?` : 'Hi, how can we help you today?'}</h2>
        <p>Explain your legal situation in plain words, and we'll guide you through your rights.</p>
      </section>

      {/* Search Input Bar */}
      <div className="home-search-bar">
        <input 
          type="text" 
          placeholder="E.g., My landlord isn't returning my deposit..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSearchSubmit();
          }}
        />
        <VoiceMicButton 
          className="mic-btn--sm"
          onFinal={(text) => setSearchQuery((prev) => (prev.trim() ? prev + ' ' + text : text))}
        />
        <button onClick={handleSearchSubmit} className="search-submit-btn" aria-label="Search">
          <ArrowRight size={20} />
        </button>
      </div>

      {/* Common Topics Grid */}
      <section className="home-topics-section">
        <h3 className="home-section-title">
          {userPersona === 'lawyer' ? 'Professional Tools & Drafting' : 'Common Legal Topics'}
        </h3>
        <div className="home-categories-grid">
          {(userPersona === 'lawyer' ? PRO_CATEGORIES : CITIZEN_CATEGORIES).map((cat) => (
            <div 
              key={cat.id} 
              className="home-category-card"
              onClick={() => {
                if (cat.id === 'rti') onNavigate('rti');
                else if (cat.id === 'bail') onNavigate('bail');
                else onNavigate('chat', '', false, cat.greeting); // Empty query, no auto-send, custom greeting
              }}
            >
              <div className="home-category-icon">
                <cat.icon size={28} />
              </div>
              <span className="home-category-label">{cat.title}</span>
            </div>
          ))}
        </div>
      </section>
      
      {/* Recent Activity Card */}
      {recentCase && (
        <section className="home-recent-card">
          <div className="recent-left">
            <div className="recent-badge">
              <Clock size={14} /> {recentCase.status}
            </div>
            <div>
              <div className="recent-title">{recentCase.title}</div>
              <div className="recent-meta">{recentCase.category} • {formatTimeAgo(recentCase.date)}</div>
            </div>
          </div>
          <button className="btn-secondary recent-resume-btn" onClick={() => recentCase.category === 'RTI Application' ? onNavigate('rti', '', true, '', recentCase.id) : onNavigate('chat', '', true, '', recentCase.id)}>
            Resume <ArrowRight size={14} />
          </button>
        </section>
      )}
    </div>
  );
}
