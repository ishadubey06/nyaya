import React, { useEffect, useState } from 'react';
import logoSvg from '../assets/logo.svg';

export default function LoadingScreen({ onComplete }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer1 = setTimeout(() => setProgress(45), 300);
    const timer2 = setTimeout(() => setProgress(85), 700);
    const timer3 = setTimeout(() => setProgress(100), 1000);
    const timer4 = setTimeout(() => {
      if (onComplete) onComplete();
    }, 1200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [onComplete]);

  return (
    <div className="loading-screen-fullscreen">
      <div className="loading-screen-content">
        <div className="loading-logo-container">
          <img src={logoSvg} alt="Emblem of India" className="loading-emblem-img" />
        </div>
        
        <h2 className="loading-title">NYAYA AI</h2>
        <p className="loading-subtitle">Know it. Protect your own rights.</p>
        
        <div className="loading-progress-wrapper">
          <div className="loading-progress-bar" style={{ width: `${progress}%` }}></div>
        </div>
      </div>
    </div>
  );
}
