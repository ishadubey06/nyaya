import { supabase } from './supabase';

const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : 'http://localhost:8000/api';

// Helper to get auth headers with fallback mock token
const getAuthHeaders = async () => {
  let token = 'mock-token-local-user';
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      token = session.access_token;
    }
  } catch (e) {}

  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

// Local storage keys
const LS_CASES = 'nyaya_local_cases';
const LS_CHAT_HISTORY = 'nyaya_local_chat_history';

// ==========================================
// Cases Storage
// ==========================================

export const getCases = async () => {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/cases`, { headers });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch (err) {
    console.warn("Backend cases API unavailable, using local cache:", err.message);
  }

  // Local storage fallback
  try {
    const local = localStorage.getItem(LS_CASES);
    return local ? JSON.parse(local) : [];
  } catch (e) {
    return [];
  }
};

export const saveCase = async (newCase) => {
  // Always persist locally
  try {
    const local = localStorage.getItem(LS_CASES);
    let list = local ? JSON.parse(local) : [];
    const idx = list.findIndex(c => c.id === newCase.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...newCase, date: new Date().toISOString() };
    } else {
      list.unshift({ ...newCase, date: new Date().toISOString() });
    }
    localStorage.setItem(LS_CASES, JSON.stringify(list));
  } catch (e) {}

  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/cases`, {
      method: 'POST',
      headers,
      body: JSON.stringify(newCase)
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("Backend saveCase unavailable, saved locally only:", err.message);
  }
  return newCase;
};

export const getCase = async (id) => {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/cases/${id}`, { headers });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("Backend getCase unavailable, using local cache:", err.message);
  }

  try {
    const local = localStorage.getItem(LS_CASES);
    const list = local ? JSON.parse(local) : [];
    return list.find(c => c.id === id) || null;
  } catch (e) {
    return null;
  }
};

// ==========================================
// Chat History Storage
// ==========================================

export const getChatHistory = async () => {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/chat`, { headers });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch (err) {
    console.warn("Backend chat history unavailable, using local cache:", err.message);
  }

  try {
    const local = localStorage.getItem(LS_CHAT_HISTORY);
    return local ? JSON.parse(local) : [];
  } catch (e) {
    return [];
  }
};

export const saveChatSession = async (session) => {
  // Always persist locally
  try {
    const local = localStorage.getItem(LS_CHAT_HISTORY);
    let list = local ? JSON.parse(local) : [];
    const idx = list.findIndex(s => s.id === session.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...session, updatedAt: new Date().toISOString() };
    } else {
      list.unshift({ ...session, updatedAt: new Date().toISOString() });
    }
    localStorage.setItem(LS_CHAT_HISTORY, JSON.stringify(list));
  } catch (e) {}

  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify(session)
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("Backend saveChatSession unavailable, saved locally only:", err.message);
  }
  return session;
};

export const getChatSession = async (id) => {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/chat/${id}`, { headers });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("Backend getChatSession unavailable, using local cache:", err.message);
  }

  try {
    const local = localStorage.getItem(LS_CHAT_HISTORY);
    const list = local ? JSON.parse(local) : [];
    return list.find(s => s.id === id) || null;
  } catch (e) {
    return null;
  }
};

export const deleteChatSession = async (id) => {
  try {
    const local = localStorage.getItem(LS_CHAT_HISTORY);
    let list = local ? JSON.parse(local) : [];
    list = list.filter(s => s.id !== id);
    localStorage.setItem(LS_CHAT_HISTORY, JSON.stringify(list));
  } catch (e) {}

  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/chat/${id}`, {
      method: 'DELETE',
      headers
    });
    if (res.ok) return await res.json();
  } catch (err) {}
  return { success: true };
};

// Helper for the advice API (used by AIChat)
export const getAdviceAuthHeaders = async () => {
  return await getAuthHeaders();
};
