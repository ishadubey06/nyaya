import React, { useState, useEffect } from 'react';
import { FolderOpen, ArrowRight, PlusCircle, Clock } from 'lucide-react';
import { getCases } from '../utils/storage';

export default function MyCases({ onNavigate }) {
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [cases, setCases] = useState([]);

  useEffect(() => {
    const fetchCases = async () => {
      const data = await getCases();
      setCases(data);
    };
    fetchCases();
  }, []);

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return 'Unknown date';
    const date = new Date(dateStr);
    const diffInSeconds = Math.floor((new Date() - date) / 1000);
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `Updated ${Math.floor(diffInSeconds / 60)} mins ago`;
    if (diffInSeconds < 86400) return `Updated ${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `Updated ${Math.floor(diffInSeconds / 86400)} days ago`;
  };

  const filteredCases = cases.filter((item) => {
    const matchesFilter = filter === 'all' || 
      (filter === 'draft' && item.status === 'In Draft') ||
      (filter === 'ready' && item.status === 'Ready to File') ||
      (filter === 'completed' && item.status === 'Completed');
    
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.category || '').toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="cases-container">
      <div className="cases-header">
        <div>
          <h2 className="cases-title">
            <FolderOpen size={26} className="cases-title-icon" /> My Cases & Drafts
          </h2>
          <p className="cases-subtitle">Manage your saved RTI applications, legal notices, and ongoing advice threads.</p>
        </div>
        
        <button className="btn-primary" onClick={() => onNavigate('rti')}>
          <PlusCircle size={18} /> New Draft
        </button>
      </div>

      <div className="cases-toolbar">
        <div className="cases-search">
          <input 
            type="text" 
            placeholder="Search your cases or notices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="cases-filters">
          <button 
            className={`filter-chip ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({cases.length})
          </button>
          <button 
            className={`filter-chip ${filter === 'draft' ? 'active' : ''}`}
            onClick={() => setFilter('draft')}
          >
            In Draft
          </button>
          <button 
            className={`filter-chip ${filter === 'ready' ? 'active' : ''}`}
            onClick={() => setFilter('ready')}
          >
            Ready to File
          </button>
          <button 
            className={`filter-chip ${filter === 'completed' ? 'active' : ''}`}
            onClick={() => setFilter('completed')}
          >
            Completed
          </button>
        </div>
      </div>

      <div className="cases-grid">
        {filteredCases.map((c) => (
          <div key={c.id} className="case-card">
            <div className="case-card-top">
              <span className="case-type-badge">{c.type}</span>
              <span className="case-status-badge" style={{ backgroundColor: `${c.statusColor}15`, color: c.statusColor, borderColor: `${c.statusColor}40` }}>
                <Clock size={12} style={{ marginRight: '4px' }} />
                {c.status}
              </span>
            </div>

            <h3 className="case-card-title">{c.title}</h3>
            <p className="case-card-snippet">{c.snippet}</p>

            <div className="case-card-footer">
              <span className="case-card-date">{formatTimeAgo(c.date)}</span>
              <button className="btn-secondary case-action-btn" onClick={() => c.category === 'RTI Application' ? onNavigate('rti', '', true, '', c.id) : onNavigate('chat', '', true, '', c.id)}>
                Open <ArrowRight size={16} />
              </button>
            </div>
          </div>
        ))}
        {filteredCases.length === 0 && (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--color-text-muted)', gridColumn: '1 / -1' }}>
            No cases found matching your filters.
          </div>
        )}
      </div>
    </div>
  );
}
