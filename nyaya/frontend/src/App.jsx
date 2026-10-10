import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import './App.css';
import { House, FolderOpen, Briefcase, Scale, Moon, Sun, LogOut, Gavel, User } from 'lucide-react';
import Landing from './components/Landing';
import Home from './components/Home';
import AIChat from './components/AIChat';
import RTIDrafting from './components/RTIDrafting';
import BailDrafting from './components/BailDrafting';
import MyCases from './components/MyCases';
import Resources from './components/Resources';
import { useAuth } from './contexts/AuthContext';

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Extract state if passed via navigation
  const navState = location.state || {};
  const currentView = location.pathname === '/' ? 'landing' : location.pathname.substring(1).split('/')[0] || 'landing';

  const { user, loading, signOut } = useAuth();

  useEffect(() => {
    if (!loading && !user && location.pathname !== '/') {
      navigate('/', { replace: true });
    }
  }, [user, loading, location.pathname, navigate]);

  const [userPersona, setUserPersona] = useState(() => {
    return localStorage.getItem('nyaya_persona') || 'citizen';
  });

  const togglePersona = () => {
    const newPersona = userPersona === 'citizen' ? 'lawyer' : 'citizen';
    setUserPersona(newPersona);
    localStorage.setItem('nyaya_persona', newPersona);
  };

  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('nyaya_theme') === 'dark';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-theme');
      localStorage.setItem('nyaya_theme', 'dark');
    } else {
      document.body.classList.remove('dark-theme');
      localStorage.setItem('nyaya_theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  // New generic navigate function to pass state (compatibility layer for child components)
  const handleNavigate = (path, query = '', autoSend = true, greeting = '', caseId = null) => {
    const route = path === 'landing' ? '/' : `/${path}`;
    navigate(route, { state: { text: query, autoSend, greeting, caseId } });
  };

  const handleEnterSystem = () => {
    navigate('/home');
  };

  return (
    <div className="app-container">
      {currentView !== 'landing' && (
        <aside className="side-bar">
          <div className="side-bar-top">
            <div className="side-bar-brand" onClick={() => navigate('/')} title="Nyaya AI">
              <Scale size={28} />
            </div>
            
            <nav className="side-nav">
              <button 
                className={`side-nav-item ${currentView === 'home' ? 'active' : ''}`}
                onClick={() => navigate('/home')}
                title="Home"
              >
                <House size={22} />
              </button>
              
              <button 
                className={`side-nav-item ${currentView === 'cases' ? 'active' : ''}`}
                onClick={() => navigate('/cases')}
                title="My Cases"
              >
                <FolderOpen size={22} />
              </button>

              <button 
                className={`side-nav-item ${currentView === 'resources' ? 'active' : ''}`}
                onClick={() => navigate('/resources')}
                title="Resources"
              >
                <Briefcase size={22} />
              </button>
            </nav>
          </div>
          
          <div className="side-bar-bottom">
            <button 
              className="side-nav-item"
              onClick={togglePersona}
              title={userPersona === 'citizen' ? "Switch to Pro Mode" : "Switch to Citizen Mode"}
              style={userPersona === 'lawyer' ? { color: 'var(--color-primary)' } : {}}
            >
              {userPersona === 'citizen' ? <User size={22} /> : <Gavel size={22} />}
            </button>
            <button 
              className="side-nav-item"
              onClick={toggleTheme}
              title="Toggle Dark Mode"
            >
              {isDarkMode ? <Sun size={22} /> : <Moon size={22} />}
            </button>
            <button 
              className="side-nav-item back-btn"
              onClick={async () => {
                await signOut();
                navigate('/');
              }}
              title="Sign Out & Exit"
            >
              <LogOut size={22} />
            </button>
          </div>
        </aside>
      )}

      <main className={`main-content ${currentView === 'home' ? 'single-screen' : ''}`} style={currentView === 'landing' ? { padding: 0 } : {}}>
        <Routes>
          <Route path="/" element={<Landing onNavigate={handleEnterSystem} />} />
          <Route path="/home" element={<Home onNavigate={handleNavigate} userPersona={userPersona} user={user} />} />
          <Route path="/chat" element={
            <AIChat 
              onNavigate={handleNavigate} 
              initialQuery={navState.text || ''} 
              autoSend={navState.autoSend || false}
              initialGreeting={navState.greeting || ''}
              caseId={navState.caseId || null}
              userPersona={userPersona}
              user={user}
              clearQuery={() => navigate('/chat', { replace: true, state: {} })} 
            />
          } />
          <Route path="/rti" element={<RTIDrafting onNavigate={handleNavigate} caseId={navState.caseId} />} />
          <Route path="/bail" element={<BailDrafting onNavigate={handleNavigate} caseId={navState.caseId} />} />
          <Route path="/cases" element={<MyCases onNavigate={handleNavigate} />} />
          <Route path="/resources" element={<Resources onNavigate={handleNavigate} />} />
        </Routes>
      </main>

      {currentView !== 'landing' && currentView !== 'rti' && currentView !== 'chat' && (
        <nav className="bottom-nav">
          <button 
            className={`nav-item ${currentView === 'home' ? 'active' : ''}`}
            onClick={() => navigate('/home')}
          >
            <House size={20} />
            <span>Home</span>
          </button>
          
          <button 
            className={`nav-item ${currentView === 'cases' ? 'active' : ''}`}
            onClick={() => navigate('/cases')}
          >
            <FolderOpen size={20} />
            <span>My Cases</span>
          </button>

          <button 
            className={`nav-item ${currentView === 'resources' ? 'active' : ''}`}
            onClick={() => navigate('/resources')}
          >
            <Briefcase size={20} />
            <span>Resources</span>
          </button>
        </nav>
      )}
    </div>
  );
}

export default App;
