import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import Navigation from './components/Navigation';

function App() {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [username, setUsername] = useState(localStorage.getItem('username') || '');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [fetchError, setFetchError] = useState('');
  const [view, setView] = useState('auth');
  const [progress, setProgress] = useState([]);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressError, setProgressError] = useState('');
  
  // AI Chat states
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  
  // AI Question Generation states
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [generatingCategory, setGeneratingCategory] = useState('');
  
  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const quizSectionRef = useRef(null);

  useEffect(() => {
    if (token) {
      setView('dashboard');
      fetchCategories();
    } else {
      setView('auth');
    }
  }, [token]);

  // Fetch progress when navigating to progress view
  useEffect(() => {
    if (view === 'progress' && token) {
      fetchProgress();
    }
  }, [view, token]);

  const fetchCategories = async () => {
    try {
      const defaultCategories = [
        'UPI Safety',
        'Budgeting',
        'Online Safety', 
        'Interest Rates',
        'Digital Banking',
        'Investment Basics'
      ];
      setCategories(defaultCategories);
    } catch (error) {
      setFetchError('Failed to load categories');
    }
  };

  const fetchQuestions = async (category) => {
    try {
      setFetchError('');
      setGeneratingQuestions(true);
      setGeneratingCategory(category);
      
      console.log('Generating questions for category:', category);
      
      // First check if AI backend is running
      try {
        const testResponse = await fetch('http://localhost:5100/api/test');
        if (!testResponse.ok) {
          throw new Error('AI backend not responding');
        }
      } catch (testError) {
        throw new Error('AI backend is not running. Please start the AI backend server (node rag.js)');
      }
      
      const response = await fetch('http://localhost:5100/api/generate-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          category: category,
          count: 5
        })
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error(`AI Error: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('AI response data:', data);
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setQuestions(data.questions);
      setSelectedCategory(category);
      setView('quiz');
    } catch (error) {
      console.error('Error generating questions:', error);
      setFetchError(`Failed to generate AI questions: ${error.message}`);
    } finally {
      setGeneratingQuestions(false);
      setGeneratingCategory('');
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError('');
    setAuthSuccess('');
    
    // Validate inputs
    if (!username.trim() || !password.trim()) {
      setAuthError('Please enter both username and password');
      setIsLoading(false);
      return;
    }
    
    try {
      console.log(`Attempting ${authMode} with username:`, username);
      
      const response = await fetch(`http://localhost:5000/api/${authMode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password })
      });
      
      console.log('Auth response status:', response.status);
      
      const data = await response.json();
      console.log('Auth response data:', data);
      
      if (response.ok) {
        if (authMode === 'login' && data.token) {
          // Login successful
          setToken(data.token);
          localStorage.setItem('token', data.token);
          setUsername(username); // Save username in state
          localStorage.setItem('username', username); // Save username in localStorage
          setAuthError('');
          setAuthSuccess('');
          setPassword('');
          console.log('Login successful');
        } else if (authMode === 'register' && data.message) {
          // Registration successful - switch to login mode
          setAuthError('');
          setAuthSuccess('Registration successful! Please login with your new account.');
          setAuthMode('login');
          setUsername('');
          setPassword('');
          console.log('Registration successful, switched to login mode');
        } else {
          setAuthError(data.error || `${authMode} failed`);
          console.error(`${authMode} failed:`, data.error);
        }
      } else {
        setAuthError(data.error || `${authMode} failed`);
        console.error(`${authMode} failed:`, data.error);
      }
    } catch (error) {
      console.error('Network error during auth:', error);
      setAuthError('Network error. Please check if the backend server is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('token');
    setUsername('');
    localStorage.removeItem('username');
    setView('auth');
    setQuestions([]);
    setAnswers({});
    setSubmitted(false);
    setResult(null);
    setChatMessages([]);
  };

  const handleOptionChange = (questionId, optionIndex) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleSubmit = async () => {
    try {
      console.log('Submitting answers:', answers);
      console.log('Selected category:', selectedCategory);
      
      // Check if we have answers and category
      if (!answers || Object.keys(answers).length === 0) {
        alert('Please answer all questions before submitting.');
        return;
      }
      
      if (!selectedCategory) {
        alert('No category selected. Please try again.');
        return;
      }
      
      const response = await fetch('http://localhost:5000/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          answers: answers,
          category: selectedCategory
        })
      });
      
      console.log('Submit response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Submit error:', errorText);
        
        if (response.status === 404) {
          alert('Quiz backend is not running. Please start the quiz backend server.');
        } else if (response.status === 401) {
          alert('Authentication failed. Please login again.');
          handleLogout();
        } else {
          alert(`Error submitting quiz: ${errorText}`);
        }
        return;
      }
      
      const data = await response.json();
      console.log('Submit response data:', data);
      
      if (data.score !== undefined) {
        setResult(data);
        setSubmitted(true);
        // Refresh progress after successful submission
        console.log('Quiz submitted successfully, refreshing progress...');
        await fetchProgress();
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error submitting answers:', error);
      
      if (error.message.includes('Failed to fetch')) {
        alert('Cannot connect to quiz backend. Please make sure the quiz server is running on port 5000.');
      } else {
        alert(`Error submitting quiz: ${error.message}`);
      }
    }
  };

  const handleRestart = () => {
    setAnswers({});
    setSubmitted(false);
    setResult(null);
    setView('dashboard');
  };

  const fetchProgress = async () => {
    setProgressLoading(true);
    setProgressError('');
    try {
      console.log('Fetching progress for user...');
      const response = await fetch('http://localhost:5000/api/progress', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('Progress response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Progress fetch error:', errorText);
        throw new Error(`Failed to fetch progress: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Progress data received:', data);
      setProgress(data.progress || []);
      console.log('Progress updated:', data.progress?.length || 0, 'attempts');
    } catch (error) {
      console.error('Error fetching progress:', error);
      setProgressError(`Failed to fetch progress: ${error.message}`);
    } finally {
      setProgressLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userMessage = {
      id: Date.now(),
      text: chatInput,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString()
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setChatLoading(true);
    setChatError('');
    
    try {
      const response = await fetch('http://localhost:5100/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: chatInput })
      });
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      const aiMessage = {
        id: Date.now() + 1,
        text: data.answer,
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString(),
        source: data.source
      };
      
      setChatMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      setChatError('Failed to get response from AI agent');
      console.error('Chat error:', error);
    } finally {
      setChatLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Modern UI Styles
  const styles = {
    // Main container
    app: {
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
    },
    
    // Navigation
    navbar: {
      backgroundColor: '#ffffff',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      padding: '1rem 2rem',
      position: 'sticky',
      top: 0,
      zIndex: 1000
    },
    
    navContent: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      maxWidth: '1200px',
      margin: '0 auto'
    },
    
    logo: {
      fontSize: '1.5rem',
      fontWeight: '700',
      color: '#1e293b',
      textDecoration: 'none'
    },
    
    navLinks: {
      display: 'flex',
      gap: '2rem',
      alignItems: 'center'
    },
    
    navLink: {
      padding: '0.5rem 1rem',
      borderRadius: '0.5rem',
      textDecoration: 'none',
      color: '#64748b',
      fontWeight: '500',
      transition: 'all 0.2s ease',
      cursor: 'pointer'
    },
    
    activeNavLink: {
      backgroundColor: '#3b82f6',
      color: '#ffffff'
    },
    
    logoutBtn: {
      padding: '0.5rem 1rem',
      backgroundColor: '#ef4444',
      color: '#ffffff',
      border: 'none',
      borderRadius: '0.5rem',
      cursor: 'pointer',
      fontWeight: '500',
      transition: 'all 0.2s ease'
    },
    
    // Main content
    main: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '2rem'
    },
    
    // Dashboard
    dashboard: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '2rem',
      marginTop: '2rem'
    },
    
    card: {
      backgroundColor: '#ffffff',
      borderRadius: '1rem',
      padding: '2rem',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      border: '1px solid #e2e8f0',
      transition: 'all 0.3s ease'
    },
    
    cardHover: {
      transform: 'translateY(-4px)',
      boxShadow: '0 10px 25px -3px rgba(0, 0, 0, 0.1)'
    },
    
    cardTitle: {
      fontSize: '1.25rem',
      fontWeight: '600',
      color: '#1e293b',
      marginBottom: '1rem'
    },
    
    cardDescription: {
      color: '#64748b',
      marginBottom: '1.5rem',
      lineHeight: '1.6'
    },
    
    // Buttons
    button: {
      padding: '0.75rem 1.5rem',
      borderRadius: '0.5rem',
      border: 'none',
      cursor: 'pointer',
      fontWeight: '500',
      transition: 'all 0.2s ease',
      fontSize: '0.875rem'
    },
    
    primaryButton: {
      backgroundColor: '#3b82f6',
      color: '#ffffff'
    },
    
    secondaryButton: {
      backgroundColor: '#f1f5f9',
      color: '#475569'
    },
    
    // Forms
    form: {
      maxWidth: '400px',
      margin: '0 auto',
      padding: '2rem'
    },
    
    input: {
      width: '100%',
      padding: '0.75rem',
      border: '1px solid #d1d5db',
      borderRadius: '0.5rem',
      fontSize: '1rem',
      marginBottom: '1rem',
      transition: 'border-color 0.2s ease'
    },
    
    inputFocus: {
      outline: 'none',
      borderColor: '#3b82f6',
      boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)'
    },
    
    // Quiz styles
    quizContainer: {
      maxWidth: '800px',
      margin: '0 auto'
    },
    
    questionCard: {
      backgroundColor: '#ffffff',
      borderRadius: '1rem',
      padding: '2rem',
      marginBottom: '1.5rem',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      border: '1px solid #e2e8f0'
    },
    
    questionText: {
      fontSize: '1.125rem',
      fontWeight: '600',
      color: '#1e293b',
      marginBottom: '1.5rem'
    },
    
    optionLabel: {
      display: 'flex',
      alignItems: 'center',
      padding: '1rem',
      border: '1px solid #e2e8f0',
      borderRadius: '0.5rem',
      marginBottom: '0.75rem',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    },
    
    optionLabelHover: {
      backgroundColor: '#f8fafc',
      borderColor: '#3b82f6'
    },
    
    optionLabelSelected: {
      backgroundColor: '#dbeafe',
      borderColor: '#3b82f6'
    },
    
    radio: {
      marginRight: '0.75rem',
      transform: 'scale(1.2)'
    },
    
    // Chat styles
    chatContainer: {
      height: '600px',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#ffffff',
      borderRadius: '1rem',
      overflow: 'hidden',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    },
    
    chatHeader: {
      backgroundColor: '#3b82f6',
      color: '#ffffff',
      padding: '1rem 1.5rem',
      fontSize: '1.125rem',
      fontWeight: '600'
    },
    
    chatMessages: {
      flex: 1,
      overflowY: 'auto',
      padding: '1.5rem',
      backgroundColor: '#f8fafc'
    },
    
    message: {
      marginBottom: '1rem',
      display: 'flex',
      flexDirection: 'column'
    },
    
    userMessage: {
      alignItems: 'flex-end'
    },
    
    aiMessage: {
      alignItems: 'flex-start'
    },
    
    messageBubble: {
      maxWidth: '70%',
      padding: '1rem 1.25rem',
      borderRadius: '1.25rem',
      wordWrap: 'break-word'
    },
    
    userBubble: {
      backgroundColor: '#3b82f6',
      color: '#ffffff'
    },
    
    aiBubble: {
      backgroundColor: '#ffffff',
      border: '1px solid #e2e8f0'
    },
    
    messageTime: {
      fontSize: '0.75rem',
      color: '#64748b',
      marginTop: '0.25rem'
    },
    
    chatInputContainer: {
      display: 'flex',
      padding: '1rem',
      backgroundColor: '#ffffff',
      borderTop: '1px solid #e2e8f0'
    },
    
    chatInput: {
      flex: 1,
      padding: '0.75rem 1rem',
      border: '1px solid #d1d5db',
      borderRadius: '2rem',
      fontSize: '1rem',
      marginRight: '0.75rem'
    },
    
    sendButton: {
      backgroundColor: '#3b82f6',
      color: '#ffffff',
      border: 'none',
      borderRadius: '50%',
      width: '2.5rem',
      height: '2.5rem',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s ease'
    },
    
    // Loading and error states
    loading: {
      textAlign: 'center',
      color: '#64748b',
      padding: '2rem'
    },
    
    error: {
      color: '#ef4444',
      textAlign: 'center',
      padding: '1rem',
      backgroundColor: '#fef2f2',
      borderRadius: '0.5rem',
      marginBottom: '1rem'
    },
    
    // Progress styles
    progressCard: {
      backgroundColor: '#f8fafc',
      padding: '1rem',
      borderRadius: '0.5rem',
      marginBottom: '0.75rem',
      border: '1px solid #e2e8f0'
    },
    
    // Error and loading styles
    error: {
      color: '#dc2626',
      backgroundColor: '#fef2f2',
      border: '1px solid #fecaca',
      borderRadius: '0.5rem',
      padding: '0.75rem',
      marginTop: '1rem',
      textAlign: 'center',
      fontSize: '0.875rem'
    },
    
    loading: {
      textAlign: 'center',
      color: '#64748b',
      padding: '2rem',
      fontSize: '1rem'
    },
    
    // Mobile responsive
    mobileNav: {
      display: 'none'
    },
    
    '@media (max-width: 768px)': {
      navLinks: {
        display: 'none'
      },
      mobileNav: {
        display: 'block'
      },
      main: {
        padding: '1rem'
      },
      dashboard: {
        gridTemplateColumns: '1fr'
      }
    }
  };

  // Authentication View
  if (view === 'auth') {
    return (
      <div style={styles.app}>
        <div style={styles.form}>
          <div style={styles.card}>
            <h1 style={{ textAlign: 'center', marginBottom: '1rem', color: '#1e293b', fontSize: '2rem' }}>
              💰 Digital Financial Literacy
            </h1>
            <h2 style={{ textAlign: 'center', marginBottom: '2rem', color: '#475569', fontSize: '1.25rem' }}>
              {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
            </h2>
            <form onSubmit={handleAuth}>
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={styles.input}
                required
                disabled={isLoading}
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
                required
                disabled={isLoading}
              />
              <button 
                type="submit" 
                style={{ 
                  ...styles.button, 
                  ...styles.primaryButton, 
                  width: '100%',
                  opacity: isLoading ? 0.7 : 1,
                  cursor: isLoading ? 'not-allowed' : 'pointer'
                }}
                disabled={isLoading}
              >
                {isLoading ? '⏳ Processing...' : (authMode === 'login' ? '🔐 Login' : '📝 Register')}
              </button>
            </form>
            <button
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'register' : 'login');
                setAuthError('');
                setAuthSuccess('');
                setUsername('');
                setPassword('');
              }}
              style={{ 
                ...styles.button, 
                ...styles.secondaryButton, 
                width: '100%', 
                marginTop: '1rem',
                opacity: isLoading ? 0.7 : 1,
                cursor: isLoading ? 'not-allowed' : 'pointer'
              }}
              disabled={isLoading}
            >
              {authMode === 'login' ? '📝 Need an account? Register' : '🔐 Have an account? Login'}
            </button>
            {authError && (
              <div style={{
                marginTop: '1rem',
                padding: '0.75rem',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '0.5rem',
                color: '#dc2626',
                textAlign: 'center',
                fontSize: '0.875rem'
              }}>
                ⚠️ {authError}
              </div>
            )}
            {authSuccess && (
              <div style={{
                marginTop: '1rem',
                padding: '0.75rem',
                backgroundColor: '#e0f2fe',
                border: '1px solid #bae6fd',
                borderRadius: '0.5rem',
                color: '#0369a1',
                textAlign: 'center',
                fontSize: '0.875rem'
              }}>
                ✅ {authSuccess}
              </div>
            )}
            <div style={{
              marginTop: '2rem',
              padding: '1rem',
              backgroundColor: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              color: '#0369a1',
              textAlign: 'center'
            }}>
              💡 {authMode === 'login' 
                ? 'Login to access quizzes, AI chat, and track your progress' 
                : 'Create an account to start your financial literacy journey'
              }
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main App with Navigation (after login)
  return (
    <div style={styles.app}>
      {/* Navigation Bar */}
      <Navigation
        username={username}
        currentView={view}
        onViewChange={setView}
        onLogout={handleLogout}
        sidebarOpen={sidebarOpen}
        onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      {/* Main Content */}
      <main style={styles.main}>
        {view === 'dashboard' && (
          <div style={{
            minHeight: '60vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            padding: '0 1rem',
          }}>
            <div style={{ maxWidth: 600, width: '100%', margin: '3rem 0 2rem 0', textAlign: 'center' }}>
              <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#2563eb', marginBottom: '1rem', letterSpacing: '-1px' }}>
                💰 Digital Financial Literacy Agent
              </h1>
              <p style={{ color: '#334155', fontSize: '1.2rem', marginBottom: '2.5rem', fontWeight: 500 }}>
                Empowering you to master digital finance. Track your progress and learn more about the quiz system below.
              </p>
            </div>
            <div style={{ width: '100%', maxWidth: 700, margin: '0 auto', background: '#f8fafc', borderRadius: '1rem', boxShadow: '0 2px 12px 0 rgba(59,130,246,0.04)', padding: '1.5rem', marginBottom: '2rem', textAlign: 'center' }}>
              <h2 style={{ color: '#2563eb', fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>📝 About the Quiz System</h2>
              <p style={{ color: '#334155', fontSize: '1rem' }}>
                Take quizzes on digital finance topics to test your knowledge. Your progress will be tracked here. Click the <b>Quiz</b> button in the header to get started!
              </p>
            </div>
            <div style={{ marginTop: '2rem', color: '#64748b', fontSize: '1rem', textAlign: 'center', fontStyle: 'italic' }}>
              "Learn. Protect. Succeed."
            </div>
          </div>
        )}

        {view === 'quiz' && (
          <div style={{
            minHeight: '60vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            padding: '0 1rem',
          }}>
            {questions.length === 0 ? (
              <>
                <div style={{ maxWidth: 600, width: '100%', margin: '3rem 0 2rem 0', textAlign: 'center' }}>
                  <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#2563eb', marginBottom: '1rem', letterSpacing: '-1px' }}>
                    📚 Choose a Quiz Topic
                  </h1>
                  <p style={{ color: '#334155', fontSize: '1.1rem', marginBottom: '2.5rem', fontWeight: 500 }}>
                    Select a topic below to start your quiz.
                  </p>
                </div>
                <div ref={quizSectionRef} style={{ width: '100%', maxWidth: 800, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '2rem', marginBottom: '2rem' }}>
                  {categories.map(category => (
                    <button
                      key={category}
                      style={{
                        background: '#fff',
                        border: '2px solid #3b82f6',
                        borderRadius: '1rem',
                        minWidth: 220,
                        minHeight: 120,
                        boxShadow: '0 2px 12px 0 rgba(59,130,246,0.07)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.15rem',
                        fontWeight: 600,
                        color: '#1e293b',
                        cursor: generatingQuestions && generatingCategory === category ? 'not-allowed' : 'pointer',
                        opacity: generatingQuestions && generatingCategory === category ? 0.6 : 1,
                        transition: 'all 0.2s',
                        outline: 'none',
                        padding: '1.5rem 1rem',
                      }}
                      onClick={() => !generatingQuestions && fetchQuestions(category)}
                      disabled={generatingQuestions && generatingCategory === category}
                    >
                      <span style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>📚</span>
                      {generatingQuestions && generatingCategory === category ? 'Generating...' : category}
                    </button>
                  ))}
                </div>
                {generatingQuestions && generatingCategory && (
                  <div style={{ color: '#64748b', fontSize: '1.1rem', marginBottom: '2rem', textAlign: 'center' }}>
                    🤖 AI is generating questions for <b>{generatingCategory}</b>... Please wait!
                  </div>
                )}
                {fetchError && <p style={styles.error}>{fetchError}</p>}
              </>
            ) : (
              <div style={styles.quizContainer}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                  <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#2563eb', marginBottom: '1rem', letterSpacing: '-1px' }}>
                    📝 Quiz: {selectedCategory}
                  </h1>
                  <p style={{ color: '#334155', fontSize: '1.1rem', fontWeight: 500 }}>
                    Answer all questions to complete the quiz.
                  </p>
                </div>
                {questions.map((q, idx) => (
                  <div key={q._id || idx} style={styles.questionCard}>
                    <div style={styles.questionText}>
                      {idx + 1}. {q.question}
                    </div>
                    {q.options.map((option, oidx) => (
                      <label
                        key={oidx}
                        style={{
                          ...styles.optionLabel,
                          ...(answers[q._id] === oidx ? styles.optionLabelSelected : {})
                        }}
                      >
                        <input
                          type="radio"
                          name={`question-${q._id}`}
                          value={oidx}
                          checked={answers[q._id] === oidx}
                          onChange={() => handleOptionChange(q._id, oidx)}
                          style={styles.radio}
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                ))}
                {!submitted ? (
                  <button
                    style={{ ...styles.button, ...styles.primaryButton, width: '100%', marginTop: '2rem' }}
                    onClick={handleSubmit}
                  >
                    Submit Quiz
                  </button>
                ) : (
                  <div style={{ marginTop: '2rem' }}>
                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                      <h3 style={{ color: '#2563eb', fontSize: '1.5rem', marginBottom: '1rem' }}>Quiz Results</h3>
                      <p style={{ fontSize: '1.2rem', fontWeight: '600', color: '#1e293b' }}>
                        Your score: {result?.score} / {result?.totalQuestions} 
                        ({Math.round((result?.score / result?.totalQuestions) * 100)}%)
                      </p>
                    </div>
                    
                    {/* Show questions with correct answers */}
                    {questions.map((q, idx) => {
                      const userAnswer = answers[q._id];
                      const isCorrect = userAnswer === q.answer;
                      return (
                        <div key={q._id || idx} style={{
                          ...styles.questionCard,
                          border: isCorrect ? '2px solid #10b981' : '2px solid #ef4444',
                          backgroundColor: isCorrect ? '#f0fdf4' : '#fef2f2'
                        }}>
                          <div style={styles.questionText}>
                            {idx + 1}. {q.question}
                          </div>
                          {q.options.map((option, oidx) => {
                            let optionStyle = { ...styles.optionLabel };
                            let isUserAnswer = userAnswer === oidx;
                            let isCorrectAnswer = q.answer === oidx;
                            
                            if (isCorrectAnswer) {
                              optionStyle = {
                                ...optionStyle,
                                backgroundColor: '#10b981',
                                color: '#ffffff',
                                borderColor: '#10b981'
                              };
                            } else if (isUserAnswer && !isCorrect) {
                              optionStyle = {
                                ...optionStyle,
                                backgroundColor: '#ef4444',
                                color: '#ffffff',
                                borderColor: '#ef4444'
                              };
                            }
                            
                            return (
                              <label key={oidx} style={optionStyle}>
                                <input
                                  type="radio"
                                  name={`question-${q._id}`}
                                  value={oidx}
                                  checked={userAnswer === oidx}
                                  disabled
                                  style={styles.radio}
                                />
                                {option}
                                {isCorrectAnswer && (
                                  <span style={{ marginLeft: '0.5rem', fontWeight: '600' }}>
                                    ✅ Correct Answer
                                  </span>
                                )}
                                {isUserAnswer && !isCorrect && (
                                  <span style={{ marginLeft: '0.5rem', fontWeight: '600' }}>
                                    ❌ Your Answer
                                  </span>
                                )}
                              </label>
                            );
                          })}
                          {!isCorrect && (
                            <div style={{
                              marginTop: '1rem',
                              padding: '0.75rem',
                              backgroundColor: '#fef3c7',
                              border: '1px solid #f59e0b',
                              borderRadius: '0.5rem',
                              color: '#92400e'
                            }}>
                              <strong>Explanation:</strong> {q.explanation || 'This is the correct answer.'}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                      <button
                        style={{ ...styles.button, ...styles.secondaryButton, width: '100%' }}
                        onClick={handleRestart}
                      >
                        Back to Categories
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {view === 'progress' && (
          <div style={{
            minHeight: '60vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            padding: '0 1rem',
          }}>
            <div style={{ maxWidth: 600, width: '100%', margin: '3rem 0 2rem 0', textAlign: 'center' }}>
              <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#2563eb', marginBottom: '1rem', letterSpacing: '-1px' }}>
                📊 My Progress
              </h1>
              <p style={{ color: '#334155', fontSize: '1.1rem', marginBottom: '2.5rem', fontWeight: 500 }}>
                Review your quiz history and track your improvement over time.
              </p>
            </div>
            <div style={{ width: '100%', maxWidth: 700, margin: '0 auto', background: '#fff', borderRadius: '1rem', boxShadow: '0 2px 12px 0 rgba(59,130,246,0.07)', padding: '2rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ color: '#1e293b', fontSize: '1.25rem', fontWeight: '600' }}>
                  Quiz History ({progress.length} attempts)
                </h3>
                <button
                  onClick={fetchProgress}
                  disabled={progressLoading}
                  style={{
                    ...styles.button,
                    ...styles.secondaryButton,
                    padding: '0.5rem 1rem',
                    fontSize: '0.875rem',
                    opacity: progressLoading ? 0.6 : 1
                  }}
                >
                  {progressLoading ? '🔄 Loading...' : '🔄 Refresh'}
                </button>
              </div>
              
              {progressLoading && <div style={styles.loading}>Loading progress...</div>}
              {progressError && <p style={styles.error}>{progressError}</p>}
              {progress.length === 0 && !progressLoading && (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
                  <p style={{ color: '#64748b', fontSize: '1.1rem', marginBottom: '1rem' }}>
                    No quiz attempts yet.
                  </p>
                  <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                    Take a quiz to see your progress here!
                  </p>
                </div>
              )}
              {progress.map((attempt, index) => (
                <div key={index} style={{
                  ...styles.progressCard,
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.75rem',
                  padding: '1.25rem',
                  marginBottom: '1rem',
                  backgroundColor: '#f8fafc'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '1.1rem' }}>
                      📚 {attempt.category}
                    </div>
                    <div style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '1rem',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      backgroundColor: (attempt.score / attempt.totalQuestions) >= 0.8 ? '#dcfce7' : 
                                    (attempt.score / attempt.totalQuestions) >= 0.6 ? '#fef3c7' : '#fee2e2',
                      color: (attempt.score / attempt.totalQuestions) >= 0.8 ? '#166534' : 
                           (attempt.score / attempt.totalQuestions) >= 0.6 ? '#92400e' : '#dc2626'
                    }}>
                      {Math.round((attempt.score / attempt.totalQuestions) * 100)}%
                    </div>
                  </div>
                  <div style={{ color: '#64748b', fontSize: '0.9rem' }}>
                    <span style={{ fontWeight: '500' }}>Score:</span> {attempt.score}/{attempt.totalQuestions} • 
                    <span style={{ fontWeight: '500', marginLeft: '0.5rem' }}>Date:</span> {new Date(attempt.date).toLocaleDateString()} at {new Date(attempt.date).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'chat' && (
          <div>
            <h2 style={{ textAlign: 'center', marginBottom: '2rem', color: '#1e293b' }}>
              AI Financial Assistant
            </h2>
            <div style={styles.chatContainer}>
              <div style={styles.chatHeader}>
                💬 Ask me about UPI, online scams, budgeting, interest rates, and financial safety!
              </div>
              <div style={styles.chatMessages}>
                {chatMessages.length === 0 && (
                  <div style={styles.loading}>
                    👋 Hi! I'm your AI financial literacy assistant. Ask me anything about digital finance!
                  </div>
                )}
                {chatMessages.map(message => (
                  <div
                    key={message.id}
                    style={{
                      ...styles.message,
                      ...(message.sender === 'user' ? styles.userMessage : styles.aiMessage)
                    }}
                  >
                    <div
                      style={{
                        ...styles.messageBubble,
                        ...(message.sender === 'user' ? styles.userBubble : styles.aiBubble)
                      }}
                    >
                      {message.text}
                    </div>
                    <div style={styles.messageTime}>
                      {message.timestamp}
                      {message.source && message.sender === 'ai' && (
                        <span> • {message.source}</span>
                      )}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div style={styles.loading}>
                    🤔 Thinking...
                  </div>
                )}
              </div>
              <div style={styles.chatInputContainer}>
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about UPI, scams, budgeting..."
                  style={styles.chatInput}
                  disabled={chatLoading}
                />
                <button
                  onClick={sendMessage}
                  disabled={chatLoading || !chatInput.trim()}
                  style={styles.sendButton}
                >
                  ➤
                </button>
              </div>
            </div>
            {chatError && <p style={styles.error}>{chatError}</p>}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
