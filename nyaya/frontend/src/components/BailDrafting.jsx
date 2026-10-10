import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Download, CheckCircle, Copy, Sparkles, Loader2, Scale } from 'lucide-react';
import { saveCase, getCase, getAdviceAuthHeaders } from '../utils/storage';
import VoiceMicButton from './VoiceMicButton';

export default function BailDrafting({ onNavigate, caseId }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    accusedName: '',
    courtName: '',
    firDetails: '',
    sections: '',
    grounds: ''
  });
  const [isFinalized, setIsFinalized] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [refinedText, setRefinedText] = useState('');
  const [currentCaseId, setCurrentCaseId] = useState(caseId || null);
  const [interimGrounds, setInterimGrounds] = useState('');

  useEffect(() => {
    if (caseId) {
      const savedCase = getCase(caseId);
      if (savedCase && savedCase.data) {
        setFormData(savedCase.data.formData);
        if (savedCase.data.step) setStep(savedCase.data.step);
        if (savedCase.data.refinedText) setRefinedText(savedCase.data.refinedText);
        if (savedCase.status === 'Ready to File' || savedCase.status === 'Completed') {
          setIsFinalized(true);
        }
        setCurrentCaseId(caseId);
      }
    }
  }, [caseId]);

  useEffect(() => {
    // Only save if some data has been entered
    if (formData.accusedName || formData.courtName || formData.grounds) {
      const id = currentCaseId || `bail-${Date.now()}`;
      if (!currentCaseId) setCurrentCaseId(id);

      const title = formData.accusedName ? `Bail App: ${formData.accusedName}` : 'Bail Application Draft';
      const snippet = formData.sections ? `U/S ${formData.sections}` : 'Drafting new Bail Application...';
      const status = isFinalized ? 'Ready to File' : 'In Draft';
      const statusColor = isFinalized ? 'var(--color-secondary)' : 'var(--color-warning)';

      saveCase({
        id,
        title,
        category: 'Bail Application',
        status,
        statusColor,
        type: 'Bail Form',
        snippet,
        data: { formData, step, refinedText }
      });
    }
  }, [formData, step, isFinalized, currentCaseId, refinedText]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNext = () => setStep(prev => prev + 1);
  const handlePrev = () => setStep(prev => prev - 1);

  const refineText = async (text) => {
    try {
      const authHeaders = await getAdviceAuthHeaders();
      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/advice/refine-bail`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ raw_text: text, form_data: formData })
      });
      const result = await response.json();
      if (result.success) {
        return result.refined_text;
      }
      return text;
    } catch (e) {
      console.error(e);
      return text;
    }
  };

  const handleFinalize = async () => {
    setIsRefining(true);
    
    // Fallback template
    let textToUse = `IN THE COURT OF ${formData.courtName.toUpperCase()}

IN THE MATTER OF:
${formData.accusedName.toUpperCase()} ...APPLICANT

VERSUS

STATE ...RESPONDENT

FIR NO: ${formData.firDetails}
U/S: ${formData.sections}

APPLICATION FOR BAIL

MOST RESPECTFULLY SHOWETH:
${formData.grounds}`;

    if (formData.grounds && formData.grounds.length > 20) {
      const refined = await refineText(formData.grounds);
      if (refined && refined !== formData.grounds) {
        textToUse = refined;
      }
    }
    
    setRefinedText(textToUse);
    setIsRefining(false);
    setIsFinalized(true);
    setStep(5); 
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(refinedText);
    alert('Document copied to clipboard!');
  };

  return (
    <div className="rti-container">
      <div className="rti-header">
        <button className="icon-btn-ghost" onClick={() => onNavigate('home')}>
          <ArrowLeft size={24} />
        </button>
        <h2>Bail Document Drafter</h2>
      </div>

      <div className="rti-progress">
        <div className={`rti-step-indicator ${step >= 1 ? 'active' : ''}`}>1. Accused & Court</div>
        <div className={`rti-step-indicator ${step >= 2 ? 'active' : ''}`}>2. FIR Details</div>
        <div className={`rti-step-indicator ${step >= 3 ? 'active' : ''}`}>3. Grounds</div>
        <div className={`rti-step-indicator ${step >= 4 ? 'active' : ''}`}>4. Finalize</div>
      </div>

      <div className="rti-content">
        {!isFinalized && (
          <div className="rti-form">
            {step === 1 && (
              <div className="rti-step">
                <h3>Accused and Court Details</h3>
                <p>Provide the name of the accused and the court jurisdiction.</p>
                <input 
                  type="text" 
                  className="input-field" 
                  name="accusedName"
                  placeholder="E.g., John Doe"
                  value={formData.accusedName}
                  onChange={handleChange}
                />
                <input 
                  type="text" 
                  className="input-field" 
                  name="courtName"
                  placeholder="E.g., Hon'ble Sessions Court, Delhi"
                  value={formData.courtName}
                  onChange={handleChange}
                  style={{ marginTop: '16px' }}
                />
              </div>
            )}

            {step === 2 && (
              <div className="rti-step">
                <h3>FIR and Sections</h3>
                <p>Provide the FIR details and the sections charged.</p>
                <input 
                  type="text" 
                  className="input-field" 
                  name="firDetails"
                  placeholder="E.g., FIR No. 123/2026, PS Vasant Kunj"
                  value={formData.firDetails}
                  onChange={handleChange}
                />
                <input 
                  type="text" 
                  className="input-field" 
                  name="sections"
                  placeholder="E.g., U/S 420, 406 IPC"
                  value={formData.sections}
                  onChange={handleChange}
                  style={{ marginTop: '16px' }}
                />
              </div>
            )}

            {step === 3 && (
              <div className="rti-step">
                <h3>Grounds for Bail</h3>
                <p>Briefly describe the grounds for bail (e.g., false implication, no flight risk, parity, prolonged incarceration). The AI will refine these into formal legal language.</p>
                <div className="voice-textarea-wrapper">
                  {interimGrounds && (
                    <div className="voice-interim-badge">🎤 {interimGrounds}</div>
                  )}
                  <div className="voice-label-row">
                    <label style={{ fontWeight: '500' }}>Grounds (speak or type)</label>
                    <VoiceMicButton
                      className="mic-btn--sm"
                      onInterim={(text) => setInterimGrounds(text)}
                      onFinal={(text) => {
                        setInterimGrounds('');
                        setFormData(prev => ({
                          ...prev,
                          grounds: prev.grounds.trim() ? prev.grounds + ' ' + text : text
                        }));
                      }}
                    />
                  </div>
                  <textarea 
                    className="input-field" 
                    style={{ minHeight: '150px', resize: 'vertical' }}
                    name="grounds"
                    placeholder="Type the raw facts and grounds..."
                    value={formData.grounds}
                    onChange={handleChange}
                  />
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="rti-step">
                <h3>Review & Generate</h3>
                <p>You have provided all the details. Click generate to allow Nyaya AI to formulate this into a formal bail application.</p>
                <div className="rti-preview">
                  <strong>Accused:</strong> {formData.accusedName}<br/>
                  <strong>Court:</strong> {formData.courtName}<br/>
                  <strong>FIR:</strong> {formData.firDetails}<br/>
                  <strong>Sections:</strong> {formData.sections}<br/>
                  <strong>Grounds:</strong> {formData.grounds ? 'Provided' : 'Missing'}
                </div>
              </div>
            )}

            <div className="rti-actions">
              {step > 1 ? (
                <button className="btn-secondary" onClick={handlePrev}>Back</button>
              ) : <div></div>}
              
              {step < 4 ? (
                <button className="btn-primary" onClick={handleNext}>Next Step <ArrowRight size={18} /></button>
              ) : (
                <button className="btn-primary" onClick={handleFinalize} disabled={isRefining}>
                  {isRefining ? <Loader2 size={18} className="spin-icon" /> : <Sparkles size={18} />}
                  {isRefining ? ' Formatting...' : ' Generate Document'}
                </button>
              )}
            </div>
          </div>
        )}

        {isFinalized && step === 5 && (
          <div className="rti-finalized">
            <div className="rti-success-header">
              <CheckCircle size={32} color="var(--color-secondary)" />
              <h3>Bail Document Drafted Successfully</h3>
            </div>
            
            <div className="rti-final-doc">
              <pre>{refinedText}</pre>
            </div>

            <div className="rti-final-actions">
              <button className="btn-secondary" onClick={copyToClipboard}>
                <Copy size={18} /> Copy to Clipboard
              </button>
              <button className="btn-primary" onClick={() => {
                const blob = new Blob([refinedText], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Bail_Application_${formData.accusedName.replace(/\s+/g, '_')}.txt`;
                a.click();
              }}>
                <Download size={18} /> Download Draft
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
