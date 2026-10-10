import React, { useState } from 'react';
import { Briefcase, BookOpen, FileCheck, PhoneCall, Scale, ArrowRight, ShieldCheck, ExternalLink, X } from 'lucide-react';

const INTERACTIVE_TOOLS = [
  {
    id: 'tool-1',
    title: 'Rights Navigator',
    desc: 'Interactive guide to discover your fundamental and statutory rights based on your situation.',
    actionTarget: 'chat',
    query: '',
    greeting: "Welcome to the Rights Navigator! Briefly describe the situation or issue you're facing, and I will help identify your legal rights."
  },
  {
    id: 'tool-2',
    title: 'Scheme Eligibility Reader',
    desc: 'Check your eligibility for various state and central government welfare schemes.',
    actionTarget: 'chat',
    query: 'I want to check my eligibility for government welfare schemes.',
    greeting: "I can help you check your eligibility for government schemes. To start, could you share a bit about your demographics (e.g., age, occupation, state)?"
  },
  {
    id: 'tool-3',
    title: 'Conversational Form-Filler',
    desc: 'Draft legal notices, RTI applications, and complaints through a simple guided conversation.',
    actionTarget: 'chat',
    query: '',
    greeting: "Welcome to the Conversational Form-Filler! What type of document do you need to draft? (e.g., RTI Application, Legal Notice, Consumer Complaint)"
  }
];

const GUIDES = [
  {
    title: 'Know Your Rights: Tenant & Landlord Law',
    summary: 'Key provisions under Model Tenancy Act & State Rent Control laws.',
    tag: 'Housing',
    link: 'https://prsindia.org/billtrack/the-model-tenancy-act-2021'
  },
  {
    title: 'Consumer Protection Act 2019 Guide',
    summary: 'E-commerce rights, refund policies, and filing process in NCH portal.',
    tag: 'Consumer',
    link: 'https://consumerhelpline.gov.in/'
  },
  {
    title: 'Workplace Rights & Severance Guide',
    summary: 'Notice period terms, gratuity calculation, and unlawful termination remedies.',
    tag: 'Labor',
    link: 'https://labour.gov.in/'
  },
  {
    title: 'Government Welfare Schemes Guide',
    summary: 'Eligibility, documentation, and application procedures for state and central government welfare programs.',
    tag: 'Welfare',
    link: 'https://www.myscheme.gov.in/'
  }
];

const HELPLINES = [
  { name: 'National Emergency Number', number: '112', desc: 'Single emergency number for Police, Fire & Medical' },
  { name: 'Police Control Room', number: '100', desc: 'Immediate police assistance' },
  { name: 'National Cyber Crime Helpline', number: '1930', desc: 'Report cyber fraud & financial crimes' },
  { name: 'Women Helpline (Domestic Abuse)', number: '1091', desc: 'Emergency support for women in distress' },
  { name: 'Childline India (POCSO / Rights)', number: '1098', desc: 'Assistance for children in need of care' },
  { name: 'National Consumer Helpline (NCH)', number: '1915', desc: 'Free consumer grievance portal' },
  { name: 'National Legal Services Authority (NALSA)', number: '15100', desc: 'Free legal aid helpline' },
  { name: 'ElderLine (Senior Citizens)', number: '14567', desc: 'Legal and emotional support for the elderly' },
  { name: 'Kiran Mental Health Helpline', number: '1800-599-0019', desc: '24/7 toll-free mental health support' },
  { name: 'Anti-Ragging Helpline', number: '1800-180-5522', desc: 'UGC helpline against ragging in institutions' },
  { name: 'Divyangjan (Disability) Helpline', number: '1800-572-8980', desc: 'Support for persons with disabilities' },
  { name: 'RTI Information & Assistance', number: '1800-11-2355', desc: 'Central CIC Information desk' }
];

export default function Resources({ onNavigate }) {
  const [activeTab, setActiveTab] = useState('templates');
  const [expandedCardId, setExpandedCardId] = useState(null);
  const [schemeData, setSchemeData] = useState({
    age: '',
    gender: 'Male',
    state: '',
    occupation: 'Student',
    income: ''
  });
  const [formData, setFormData] = useState({
    docType: 'Legal Notice',
    sender: '',
    recipient: '',
    issue: ''
  });

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const query = `I need to draft a ${formData.docType}. My name/party name is ${formData.sender}. The recipient/opposite party is ${formData.recipient}. The brief issue is: ${formData.issue}. Please help me draft this document.`;
    
    const tool = INTERACTIVE_TOOLS.find(t => t.id === 'tool-3');
    setExpandedCardId(null);
    onNavigate(tool.actionTarget, query, false, tool.greeting);
  };

  const handleSchemeSubmit = (e) => {
    e.preventDefault();
    const query = `I am a ${schemeData.age} year old ${schemeData.gender} ${schemeData.occupation} living in ${schemeData.state} with an annual income of ₹${schemeData.income || 'Not specified'}. Please analyze what central and state government welfare schemes I am eligible for and tell me how to apply.`;
    
    const tool = INTERACTIVE_TOOLS.find(t => t.id === 'tool-2');
    setExpandedCardId(null);
    onNavigate(tool.actionTarget, query, false, tool.greeting);
  };

  return (
    <div className="resources-container">
      <div className="resources-header">
        <div>
          <h2 className="resources-title">
            <Briefcase size={26} className="resources-title-icon" /> Legal Resources & Knowledge Hub
          </h2>
          <p className="resources-subtitle">Free legal notice templates, statutory guides, and national helpline directories.</p>
        </div>
      </div>

      <div className="resources-tabs">
        <button 
          className={`resource-tab ${activeTab === 'templates' ? 'active' : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          <FileCheck size={18} /> Interactive Tools
        </button>
        <button 
          className={`resource-tab ${activeTab === 'guides' ? 'active' : ''}`}
          onClick={() => setActiveTab('guides')}
        >
          <BookOpen size={18} /> Rights & Legal Guides
        </button>
        <button 
          className={`resource-tab ${activeTab === 'helplines' ? 'active' : ''}`}
          onClick={() => setActiveTab('helplines')}
        >
          <PhoneCall size={18} /> National Helplines
        </button>
      </div>

      {activeTab === 'templates' && (
        <div className="resources-grid">
          {INTERACTIVE_TOOLS.map((tool) => (
            <div key={tool.id} className="resource-card" style={expandedCardId === tool.id ? { width: '100%' } : {}}>
              {expandedCardId === tool.id ? (
                <div style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 className="resource-card-title" style={{ margin: 0 }}>{tool.id === 'tool-2' ? 'Check Eligibility Data' : 'Draft Document'}</h3>
                    <button onClick={() => setExpandedCardId(null)} style={{ background: 'none', border: 'none', color: 'var(--color-text-light)', cursor: 'pointer' }}>
                      <X size={20} />
                    </button>
                  </div>
                  {tool.id === 'tool-2' ? (
                    <form onSubmit={handleSchemeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--color-text-light)' }}>Age</label>
                          <input required type="number" value={schemeData.age} onChange={e => setSchemeData({...schemeData, age: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-text)' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--color-text-light)' }}>Gender</label>
                          <select value={schemeData.gender} onChange={e => setSchemeData({...schemeData, gender: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-text)' }}>
                            <option>Male</option>
                            <option>Female</option>
                            <option>Other</option>
                          </select>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--color-text-light)' }}>State</label>
                          <input required type="text" placeholder="State" value={schemeData.state} onChange={e => setSchemeData({...schemeData, state: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-text)' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--color-text-light)' }}>Occupation</label>
                          <select value={schemeData.occupation} onChange={e => setSchemeData({...schemeData, occupation: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-text)' }}>
                            <option>Student</option>
                            <option>Farmer</option>
                            <option>Salaried</option>
                            <option>Business</option>
                            <option>Unemployed</option>
                            <option>Senior</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--color-text-light)' }}>Annual Income (₹) (Optional)</label>
                        <select value={schemeData.income} onChange={e => setSchemeData({...schemeData, income: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-text)' }}>
                          <option value="">Select Income Bracket</option>
                          <option value="Below ₹1 Lakh">Below ₹1 Lakh</option>
                          <option value="₹1 Lakh - ₹3 Lakhs">₹1 Lakh - ₹3 Lakhs</option>
                          <option value="₹3 Lakhs - ₹5 Lakhs">₹3 Lakhs - ₹5 Lakhs</option>
                          <option value="₹5 Lakhs - ₹8 Lakhs">₹5 Lakhs - ₹8 Lakhs</option>
                          <option value="Above ₹8 Lakhs">Above ₹8 Lakhs</option>
                        </select>
                      </div>
                      <button type="submit" className="btn-primary" style={{ marginTop: '8px', width: '100%' }}>Check Eligibility</button>
                    </form>
                  ) : (
                    <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--color-text-light)' }}>Document Type</label>
                        <select value={formData.docType} onChange={e => setFormData({...formData, docType: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-text)' }}>
                          <option>Legal Notice</option>
                          <option>RTI Application</option>
                          <option>Consumer Complaint</option>
                          <option>Other Document</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--color-text-light)' }}>Your Name / Party</label>
                        <input required type="text" placeholder="e.g. Rahul Sharma" value={formData.sender} onChange={e => setFormData({...formData, sender: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-text)' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--color-text-light)' }}>Recipient / Opposite Party</label>
                        <input required type="text" placeholder="e.g. ABC Electronics" value={formData.recipient} onChange={e => setFormData({...formData, recipient: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-text)' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--color-text-light)' }}>Brief Issue / Description</label>
                        <textarea required placeholder="e.g. Bought a laptop that broke in 2 days..." value={formData.issue} onChange={e => setFormData({...formData, issue: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-text)', minHeight: '60px', resize: 'vertical' }} />
                      </div>
                      <button type="submit" className="btn-primary" style={{ marginTop: '8px', width: '100%' }}>Draft Document</button>
                    </form>
                  )}
                </div>
              ) : (
                <>
                  <div className="resource-card-icon">
                    <FileCheck size={24} />
                  </div>
                  <h3 className="resource-card-title">{tool.title}</h3>
                  <p className="resource-card-desc">{tool.desc}</p>
                  <button 
                    className="btn-primary" 
                    style={{ width: '100%', marginTop: '16px', fontSize: '0.9rem' }}
                    onClick={() => {
                      if (tool.id === 'tool-2' || tool.id === 'tool-3') {
                        setExpandedCardId(tool.id);
                      } else {
                        onNavigate(tool.actionTarget, tool.query, false, tool.greeting);
                      }
                    }}
                  >
                    Use Tool <ArrowRight size={16} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'guides' && (
        <div className="resources-grid">
          {GUIDES.map((guide, idx) => (
            <div key={idx} className="resource-card">
              <span className="resource-tag">{guide.tag}</span>
              <h3 className="resource-card-title" style={{ marginTop: '10px' }}>{guide.title}</h3>
              <p className="resource-card-desc">{guide.summary}</p>
              <a 
                className="btn-secondary" 
                style={{ width: '100%', marginTop: '16px', fontSize: '0.9rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', textDecoration: 'none' }}
                href={guide.link}
                target="_blank"
                rel="noopener noreferrer"
              >
                Read Official Guide <ExternalLink size={16} />
              </a>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'helplines' && (
        <div className="resources-grid">
          {HELPLINES.map((h, idx) => (
            <div key={idx} className="resource-card helpline-card">
              <div className="helpline-icon">
                <ShieldCheck size={24} />
              </div>
              <h3 className="resource-card-title">{h.name}</h3>
              <div className="helpline-number">{h.number}</div>
              <p className="resource-card-desc">{h.desc}</p>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
