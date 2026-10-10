import React, { useState, useCallback } from 'react';
import { Mic, MicOff, WifiOff, Loader2, DownloadCloud } from 'lucide-react';
import { useVoiceInput } from '../hooks/useVoiceInput';

/**
 * VoiceMicButton
 *
 * Props:
 *   onInterim  - called with live (non-final) transcript string (deprecated with Whisper, but kept for API compatibility)
 *   onFinal    - called with finalized transcript string
 *   className  - optional extra class
 *   title      - tooltip override
 */
export default function VoiceMicButton({ onInterim, onFinal, className = '', title }) {
  const [errorMsg, setErrorMsg] = useState('');

  const showError = useCallback((msg) => {
    setErrorMsg(msg);
    // Auto-dismiss after 5 seconds
    setTimeout(() => setErrorMsg(''), 5000);
  }, []);

  const handleTranscript = useCallback((text, isFinal) => {
    if (isFinal) {
      onFinal?.(text);
    } else {
      // We no longer have interim transcripts with the current Whisper setup,
      // but this keeps the interface intact if we ever add it back.
      onInterim?.(text);
    }
  }, [onFinal, onInterim]);

  const { 
    isListening, 
    isSupported, 
    toggleListening,
    isDownloading,
    downloadProgress,
    isTranscribing
  } = useVoiceInput(handleTranscript, showError);

  if (!isSupported) return null;

  // Determine button state and icon
  let buttonIcon = <Mic size={18} />;
  let buttonTitle = title || 'Click to speak';
  let buttonClass = '';
  let isDisabled = false;

  if (isDownloading) {
    buttonIcon = <DownloadCloud size={18} className="spin-slow" />;
    buttonTitle = `Downloading AI Model (${downloadProgress}%)`;
    buttonClass = 'mic-btn--downloading';
    isDisabled = true;
  } else if (isTranscribing) {
    buttonIcon = <Loader2 size={18} className="spin" />;
    buttonTitle = 'Transcribing...';
    buttonClass = 'mic-btn--transcribing';
    isDisabled = true;
  } else if (isListening) {
    buttonIcon = <MicOff size={18} />;
    buttonTitle = 'Click to stop recording';
    buttonClass = 'mic-btn--active';
  }

  return (
    <>
      <button
        type="button"
        className={`mic-btn ${buttonClass} ${className}`}
        onClick={toggleListening}
        title={buttonTitle}
        aria-label={buttonTitle}
        disabled={isDisabled}
        id="voice-input-btn"
      >
        {buttonIcon}
        {isListening && <span className="mic-pulse-ring" />}
      </button>

      {errorMsg && (
        <div className="mic-error-toast" role="alert" onClick={() => setErrorMsg('')}>
          <WifiOff size={14} />
          <span>{errorMsg}</span>
        </div>
      )}
    </>
  );
}
