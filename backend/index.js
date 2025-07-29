const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Environment variables
const CLOUDANT_URL = process.env.CLOUDANT_URL;
const CLOUDANT_API_KEY = process.env.CLOUDANT_API_KEY;
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Database names
const USERS_DB = 'users';
const QUESTIONS_DB = 'questions';
const PROGRESS_DB = 'progress';

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Validation middleware
const validateInput = (req, res, next) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  if (username.trim().length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters long' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }
  next();
};

// Cloudant authentication helper
async function getCloudantHeaders() {
  try {
    const tokenResponse = await fetch('https://iam.cloud.ibm.com/identity/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        'grant_type': 'urn:ibm:params:oauth:grant-type:apikey',
        'apikey': CLOUDANT_API_KEY
      })
    });
    
    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      throw new Error('Failed to get IAM token');
    }
    
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenData.access_token}`,
    };
  } catch (error) {
    console.error('Error getting IAM token:', error);
    throw error;
  }
}

// JWT authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
};

// Routes
app.post('/api/register', validateInput, async (req, res) => {
  try {
    const { username, password } = req.body;
    const cleanUsername = username.trim();
    
    console.log(`Registration attempt for username: ${cleanUsername}`);
    
    const headers = await getCloudantHeaders();
    
    // Check if user exists
    const findRes = await fetch(`${CLOUDANT_URL}/${USERS_DB}/_find`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ selector: { username: cleanUsername } })
    });
    
    const findData = await findRes.json();
    if (findData.docs && findData.docs.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    // Create user
    const hashedPassword = await bcrypt.hash(password, 12);
    const userDoc = {
      username: cleanUsername,
      password: hashedPassword,
      type: 'user',
      createdAt: new Date().toISOString()
    };
    
    const createRes = await fetch(`${CLOUDANT_URL}/${USERS_DB}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(userDoc)
    });
    
    const createData = await createRes.json();
    console.log('User created successfully:', createData.id);
    
    res.status(201).json({ 
      message: 'User registered successfully',
      userId: createData.id
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/login', validateInput, async (req, res) => {
  try {
    const { username, password } = req.body;
    const cleanUsername = username.trim();
    
    console.log(`Login attempt for username: ${cleanUsername}`);
    
    const headers = await getCloudantHeaders();
    
    const findRes = await fetch(`${CLOUDANT_URL}/${USERS_DB}/_find`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ selector: { username: cleanUsername } })
    });
    
    const findData = await findRes.json();
    const user = findData.docs && findData.docs[0];
    
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    console.log('Login successful for user:', user.username);
    res.json({ token, username: user.username });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/questions', async (req, res) => {
  try {
    const { category } = req.query;
    const selector = category ? { category } : {};
    
    const headers = await getCloudantHeaders();
    const findRes = await fetch(`${CLOUDANT_URL}/${QUESTIONS_DB}/_find`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ selector })
    });
    
    const data = await findRes.json();
    res.json({ questions: data.docs || [] });
    
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

app.post('/api/submit', authenticateToken, async (req, res) => {
  try {
    const { answers, category } = req.body;
    const userId = req.user.userId;
    
    if (!answers || !category) {
      return res.status(400).json({ error: 'Answers and category are required' });
    }
    
    let score = 0;
    let totalQuestions = Object.keys(answers).length;
    let results = [];
    
    const headers = await getCloudantHeaders();
    
    for (const [questionId, userAnswer] of Object.entries(answers)) {
      if (questionId.startsWith('ai-generated-')) {
        const parts = questionId.split('-');
        const correctAnswer = parseInt(parts[parts.length - 1]) || 0;
        const isCorrect = userAnswer === correctAnswer;
        if (isCorrect) score++;
        results.push({ questionId, userAnswer, correctAnswer, isCorrect });
      } else {
        const qRes = await fetch(`${CLOUDANT_URL}/${QUESTIONS_DB}/${questionId}`, {
          method: 'GET',
          headers
        });
        
        if (qRes.ok) {
          const question = await qRes.json();
          const isCorrect = userAnswer === question.answer;
          if (isCorrect) score++;
          results.push({ questionId, userAnswer, correctAnswer: question.answer, isCorrect });
        }
      }
    }
    
    const progressDoc = {
      userId,
      category,
      score,
      totalQuestions,
      answers: results,
      date: new Date().toISOString(),
      type: 'progress'
    };
    
    console.log('📝 Saving progress document:', {
      userId,
      category,
      score,
      totalQuestions,
      date: progressDoc.date
    });
    
    const progressResponse = await fetch(`${CLOUDANT_URL}/${PROGRESS_DB}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(progressDoc)
    });
    
    console.log('📝 Progress save response status:', progressResponse.status);
    
    if (progressResponse.ok) {
      const progressData = await progressResponse.json();
      console.log(`✅ Progress saved successfully - ID: ${progressData.id}`);
    } else {
      const errorText = await progressResponse.text();
      console.error('❌ Failed to save progress:', errorText);
      console.error('❌ Progress document that failed to save:', progressDoc);
    }
    
    console.log(`Quiz submitted - User: ${req.user.username}, Category: ${category}, Score: ${score}/${totalQuestions}`);
    
    res.json({
      score,
      totalQuestions,
      percentage: Math.round((score / totalQuestions) * 100),
      results
    });
    
  } catch (error) {
    console.error('Error submitting quiz:', error);
    res.status(500).json({ error: 'Failed to submit quiz' });
  }
});

app.get('/api/progress', authenticateToken, async (req, res) => {
  try {
    console.log(`📊 Fetching progress for user: ${req.user.username} (${req.user.userId})`);
    
    const headers = await getCloudantHeaders();
    // Try different query approaches
    let findRes;
    let data;
    
    // First try with exact match
    findRes = await fetch(`${CLOUDANT_URL}/${PROGRESS_DB}/_find`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ 
        selector: { userId: req.user.userId }, 
        sort: [{ date: 'desc' }] 
      })
    });
    
    data = await findRes.json();
    
    // If no results, try without sort
    if (!data.docs || data.docs.length === 0) {
      console.log('📊 No results with sort, trying without sort...');
      findRes = await fetch(`${CLOUDANT_URL}/${PROGRESS_DB}/_find`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          selector: { userId: req.user.userId }
        })
      });
      data = await findRes.json();
    }
    
    // If still no results, try with string comparison
    if (!data.docs || data.docs.length === 0) {
      console.log('📊 No results with exact match, trying string comparison...');
      findRes = await fetch(`${CLOUDANT_URL}/${PROGRESS_DB}/_find`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          selector: { 
            userId: { "$eq": req.user.userId }
          }
        })
      });
      data = await findRes.json();
    }
    
    console.log(`📊 Progress query result: ${data.docs?.length || 0} records found`);
    console.log(`📊 Query selector used: { userId: "${req.user.userId}" }`);
    
    if (data.docs && data.docs.length > 0) {
      console.log('📊 Sample progress record:', {
        category: data.docs[0].category,
        score: data.docs[0].score,
        totalQuestions: data.docs[0].totalQuestions,
        date: data.docs[0].date,
        userId: data.docs[0].userId
      });
    } else {
      console.log('📊 No progress records found for this user');
    }
    
    res.json({ progress: data.docs || [] });
    
  } catch (error) {
    console.error('❌ Error fetching progress:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Debug endpoint to check progress database
app.get('/api/debug/progress', async (req, res) => {
  try {
    const headers = await getCloudantHeaders();
    const findRes = await fetch(`${CLOUDANT_URL}/${PROGRESS_DB}/_all_docs?include_docs=true`, {
      method: 'GET',
      headers
    });
    
    const data = await findRes.json();
    res.json({ 
      totalRecords: data.rows?.length || 0,
      records: data.rows?.map(row => ({
        id: row.id,
        category: row.doc?.category,
        userId: row.doc?.userId,
        score: row.doc?.score,
        totalQuestions: row.doc?.totalQuestions,
        date: row.doc?.date
      })) || []
    });
  } catch (error) {
    console.error('Debug progress error:', error);
    res.status(500).json({ error: 'Debug failed', details: error.message });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Digital Financial Literacy Agent Backend',
    version: '1.0.0',
    endpoints: {
      auth: ['POST /api/register', 'POST /api/login'],
      quiz: ['GET /api/questions', 'POST /api/submit'],
      progress: ['GET /api/progress'],
      health: ['GET /api/health']
    }
  });
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Ensure databases exist
async function ensureDatabases() {
  try {
    console.log('🔧 Ensuring databases exist...');
    const headers = await getCloudantHeaders();
    
    const databases = [USERS_DB, QUESTIONS_DB, PROGRESS_DB];
    
    for (const dbName of databases) {
      try {
        await fetch(`${CLOUDANT_URL}/${dbName}`, {
          method: 'PUT',
          headers
        });
        console.log(`✅ Database '${dbName}' ensured`);
      } catch (error) {
        if (error.message.includes('412')) {
          console.log(`ℹ️ Database '${dbName}' already exists`);
        } else {
          console.error(`❌ Error ensuring database '${dbName}':`, error.message);
        }
      }
    }
  } catch (error) {
    console.error('❌ Error ensuring databases:', error);
  }
}

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Digital Financial Literacy Agent Backend running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  
  // Ensure databases exist
  await ensureDatabases();
});

module.exports = app;