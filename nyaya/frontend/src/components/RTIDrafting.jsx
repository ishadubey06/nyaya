import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Download, CheckCircle, Copy, ExternalLink, Sparkles, Loader2 } from 'lucide-react';
import { saveCase, getCase, getAdviceAuthHeaders } from '../utils/storage';
import VoiceMicButton from './VoiceMicButton';

export default function RTIDrafting({ onNavigate, caseId }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    department: '',
    information: ''
  });
  const [isFinalized, setIsFinalized] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [currentCaseId, setCurrentCaseId] = useState(caseId || null);
  const [interimInfo, setInterimInfo] = useState('');

  useEffect(() => {
    if (caseId) {
      const savedCase = getCase(caseId);
      if (savedCase && savedCase.data) {
        setFormData(savedCase.data.formData);
        if (savedCase.data.step) setStep(savedCase.data.step);
        if (savedCase.status === 'Ready to File' || savedCase.status === 'Completed') {
          setIsFinalized(true);
        }
        setCurrentCaseId(caseId);
      }
    }
  }, [caseId]);

  useEffect(() => {
    // Only save if some data has been entered
    if (formData.name || formData.department || formData.information) {
      const id = currentCaseId || `rti-${Date.now()}`;
      if (!currentCaseId) setCurrentCaseId(id);

      const title = formData.department ? `RTI to ${formData.department}` : 'RTI Application Draft';
      const snippet = formData.information ? formData.information.substring(0, 60) + '...' : 'Drafting new RTI Application...';
      const status = isFinalized ? 'Ready to File' : 'In Draft';
      const statusColor = isFinalized ? 'var(--color-secondary)' : 'var(--color-warning)';

      saveCase({
        id,
        title,
        category: 'RTI Application',
        status,
        statusColor,
        type: 'RTI Form',
        snippet,
        data: { formData, step }
      });
    }
  }, [formData, step, isFinalized, currentCaseId]);

  const totalSteps = 3;

  const handleNext = () => setStep(Math.min(step + 1, totalSteps));
  const handlePrev = () => setStep(Math.max(step - 1, 1));

  const handleRefine = async () => {
    if (!formData.information.trim()) return;
    setIsRefining(true);
    try {
      const authHeaders = await getAdviceAuthHeaders();
      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/advice/refine-rti`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ raw_text: formData.information })
      });
      const result = await response.json();
      if (result.success && result.refined_text) {
        setFormData({ ...formData, information: result.refined_text });
      } else {
        alert("Failed to refine: " + (result.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Failed to refine:", error);
      alert("Failed to refine text. Please try again.");
    } finally {
      setIsRefining(false);
    }
  };

  return (
    <div className="rti-flow">
      <div className="rti-header">
        <button onClick={() => onNavigate('home')}>
          <ArrowLeft size={28} />
        </button>
        <h2>File an RTI</h2>
      </div>

      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${(step / totalSteps) * 100}%` }}></div>
      </div>

      <div className="rti-content">
        <div className="wizard-container">
          <div className="wizard-step">
            {step === 1 && (
              <div>
                <h2>Your Details</h2>
                <p>Let's start with basic information so the government knows where to send the reply.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Full Name</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="e.g., Jane Doe"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Complete Address</label>
                    <textarea 
                      className="input-field" 
                      placeholder="Where should the response be mailed?"
                      rows={4}
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <h2>Target Department</h2>
                <p>Which government department holds the information you need?</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Department Name</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="e.g., Municipal Corporation of Delhi"
                      value={formData.department}
                      onChange={(e) => setFormData({...formData, department: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <h2>The Information</h2>
                <p>What exactly do you want to know? Try to be as specific as possible.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '8px' }}>
                      <label style={{ fontWeight: '500', flex: 1 }}>Your Request (speak or type)</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <VoiceMicButton
                          className="mic-btn--sm"
                          onInterim={(text) => setInterimInfo(text)}
                          onFinal={(text) => {
                            setInterimInfo('');
                            setFormData(prev => ({
                              ...prev,
                              information: prev.information.trim() ? prev.information + ' ' + text : text
                            }));
                          }}
                        />
                        <button 
                          className="btn-secondary" 
                          style={{ padding: '6px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: (isRefining || !formData.information.trim()) ? 'not-allowed' : 'pointer' }}
                          onClick={handleRefine}
                          disabled={isRefining || !formData.information.trim()}
                        >
                          {isRefining ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} style={{ color: 'var(--color-primary)' }} />} 
                          {isRefining ? 'Refining...' : 'Refine with AI'}
                        </button>
                      </div>
                    </div>
                    <div className="voice-textarea-wrapper">
                      {interimInfo && (
                        <div className="voice-interim-badge">🎤 {interimInfo}</div>
                      )}
                      <textarea 
                        className="input-field" 
                        placeholder="e.g., THE EXPENDITURE OF THE YEAR 2026-27"
                        rows={6}
                        value={formData.information}
                        onChange={(e) => setFormData({...formData, information: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="wizard-actions">
            {step > 1 ? (
              <button className="btn-secondary" onClick={handlePrev}>
                Back
              </button>
            ) : <div></div>}
            
            {step < totalSteps ? (
              <button className="btn-primary" onClick={handleNext}>
                Continue <ArrowRight size={20} />
              </button>
            ) : (
              !isFinalized && (
                <button className="btn-primary" style={{ backgroundColor: 'var(--color-success)' }} onClick={() => setIsFinalized(true)}>
                  <CheckCircle size={20} /> Finalize
                </button>
              )
            )}
          </div>

          {isFinalized && (
            <div style={{ marginTop: '30px', padding: '24px', backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-success)' }}>
              <h3 style={{ color: 'var(--color-success)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={24} /> RTI Draft Finalized!
              </h3>
              <p style={{ marginBottom: '20px', color: 'var(--color-text-main)' }}>
                Your document is ready. You can now copy it and file it directly on the official government portal.
              </p>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <button 
                  className="btn-primary" 
                  onClick={() => {
                    const text = `To,\nThe Public Information Officer (PIO),\n${formData.department || '[Department Name]'}\n\nSubject: Request for Information under Right to Information Act, 2005.\n\nSir/Madam,\nI, ${formData.name || '[Your Name]'}, a citizen of India, request you to provide the following information under the RTI Act, 2005:\n\n${formData.information || '[Your specific questions and requests will appear here]'}\n\nPlease send the information to my mailing address:\n${formData.address || '[Your Address]'}\n\nSincerely,\n${formData.name || '[Your Name]'}`;
                    navigator.clipboard.writeText(text);
                    alert("Document copied to clipboard!");
                  }}
                >
                  <Copy size={18} /> Copy Document
                </button>
                <a 
                  href="https://rtionline.gov.in/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="btn-secondary" 
                  style={{ textDecoration: 'none' }}
                >
                  File on RTI Online <ExternalLink size={18} />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Live Preview Pane */}
        <div className="live-preview">
          <h3>Live Document Preview</h3>
          <div className="document-content">
{`To,
The Public Information Officer (PIO),
${formData.department ? formData.department : '[Department Name]'}

Subject: Request for Information under Right to Information Act, 2005.

Sir/Madam,
I, ${formData.name ? formData.name : '[Your Name]'}, a citizen of India, request you to provide the following information under the RTI Act, 2005:

${formData.information ? formData.information : '[Your specific questions and requests will appear here]'}

Please send the information to my mailing address:
${formData.address ? formData.address : '[Your Address]'}

Sincerely,
${formData.name ? formData.name : '[Your Name]'}`}
          </div>
        </div>
      </div>
    </div>
  );
}
