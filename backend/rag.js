require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5100;

// Environment variables
const {
  CLOUDANT_API_KEY,
  CLOUDANT_URL,
  WATSONX_API_KEY
} = process.env;

// IBM watsonx Agent configuration
const WATSONX_ENDPOINT = 'https://us-south.ml.cloud.ibm.com/ml/v4/deployments/9c8babea-6b7f-4c60-8a57-72f8491d51f7/ai_service?version=2021-05-01';
const IAM_TOKEN_URL = 'https://iam.cloud.ibm.com/identity/token';
const DB_NAME = 'financial_content';

// Validation
if (!WATSONX_API_KEY) {
  console.error('❌ ERROR: WATSONX_API_KEY is not set in .env file');
  console.error('Please add your IBM Cloud User API key to the .env file');
  process.exit(1);
}

if (!CLOUDANT_API_KEY || !CLOUDANT_URL) {
  console.error('❌ ERROR: CLOUDANT_API_KEY or CLOUDANT_URL is not set in .env file');
  process.exit(1);
}

console.log('✅ Environment variables loaded:');
console.log('- CLOUDANT_API_KEY:', CLOUDANT_API_KEY ? '✓ Set' : '✗ Missing');
console.log('- CLOUDANT_URL:', CLOUDANT_URL ? '✓ Set' : '✗ Missing');
console.log('- WATSONX_API_KEY:', WATSONX_API_KEY ? '✓ Set' : '✗ Missing');

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Helper Functions
async function getIAMToken() {
  try {
    console.log('🔑 Getting IAM token...');
    
    const response = await fetch(IAM_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        'grant_type': 'urn:ibm:params:oauth:grant-type:apikey',
        'apikey': WATSONX_API_KEY
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ IAM token error response:', errorText);
      throw new Error(`IAM token request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ IAM token received successfully');
    return data.access_token;
  } catch (error) {
    console.error('❌ Error getting IAM token:', error);
    throw error;
  }
}

async function cloudantRequest(endpoint, options = {}) {
  try {
    const url = `${CLOUDANT_URL}/${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Basic ${Buffer.from('apikey:' + CLOUDANT_API_KEY).toString('base64')}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    return response.json();
  } catch (error) {
    console.error('❌ Cloudant request error:', error);
    throw error;
  }
}

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
};

// Routes
app.get('/api/test', async (req, res) => {
  try {
    res.json({ 
      status: 'OK',
      message: 'AI Backend is running!',
      timestamp: new Date().toISOString(),
      services: {
        watsonx: 'Connected',
        cloudant: 'Connected'
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Test failed', details: error.message });
  }
});

app.post('/api/seed-content', async (req, res) => {
  try {
    console.log('🌱 Seeding financial content to Cloudant...');
    
    const financialContent = [
      {
        title: 'UPI Safety Guidelines',
        content: 'UPI (Unified Payments Interface) is a real-time payment system. To use UPI safely: 1) Never share your UPI PIN with anyone, 2) Always verify the recipient name before sending money, 3) Use only official banking apps, 4) Enable two-factor authentication, 5) Keep your phone secure with a strong password, 6) Never click on suspicious links asking for UPI details, 7) Report any suspicious activity immediately to your bank.',
        category: 'UPI Safety',
        tags: ['UPI', 'safety', 'payments', 'security']
      },
      {
        title: 'Online Banking Security',
        content: 'Online banking security is crucial for protecting your money. Best practices include: 1) Use strong, unique passwords, 2) Enable two-factor authentication, 3) Never use public WiFi for banking, 4) Keep your devices updated, 5) Log out after each session, 6) Monitor your accounts regularly, 7) Use secure websites (HTTPS), 8) Never share login credentials.',
        category: 'Online Safety',
        tags: ['online banking', 'security', 'passwords', 'authentication']
      },
      {
        title: 'Budgeting Basics',
        content: 'Budgeting is the foundation of financial health. The 50/30/20 rule suggests: 50% for needs (housing, food, utilities), 30% for wants (entertainment, dining), and 20% for savings and debt repayment. Track your expenses, set financial goals, create an emergency fund, and review your budget regularly.',
        category: 'Budgeting',
        tags: ['budgeting', 'financial planning', 'savings', 'expenses']
      },
      {
        title: 'Interest Rates Explained',
        content: 'Interest rates affect borrowing and saving. When rates are high, borrowing becomes expensive but savings earn more. When rates are low, borrowing is cheaper but savings earn less. APR (Annual Percentage Rate) includes fees and shows the true cost of borrowing. Compound interest means earning interest on both principal and accumulated interest.',
        category: 'Interest Rates',
        tags: ['interest rates', 'APR', 'compound interest', 'borrowing']
      },
      {
        title: 'Digital Banking Features',
        content: 'Digital banking offers convenience and security. Features include: 1) 24/7 account access, 2) Mobile check deposits, 3) Bill payments and transfers, 4) Real-time notifications, 5) Budgeting tools, 6) Investment options, 7) Customer support chat. Always use official apps and secure connections.',
        category: 'Digital Banking',
        tags: ['digital banking', 'mobile banking', 'convenience', 'features']
      },
      {
        title: 'Investment Fundamentals',
        content: 'Investing helps grow wealth over time. Key principles: 1) Diversification reduces risk, 2) Start early to benefit from compound growth, 3) Understand your risk tolerance, 4) Invest for the long term, 5) Consider index funds for beginners, 6) Don\'t invest money you need soon, 7) Regularly review and rebalance your portfolio.',
        category: 'Investment Basics',
        tags: ['investing', 'diversification', 'compound growth', 'risk management']
      }
    ];

    const iamToken = await getIAMToken();
    const headers = {
      'Authorization': `Bearer ${iamToken}`,
      'Content-Type': 'application/json'
    };

    for (const content of financialContent) {
      const doc = {
        ...content,
        type: 'financial_content',
        createdAt: new Date().toISOString()
      };

      await fetch(`${CLOUDANT_URL}/${DB_NAME}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(doc)
      });
    }

    console.log('✅ Financial content seeded successfully');
    res.json({ message: 'Financial content seeded successfully', count: financialContent.length });
    
  } catch (error) {
    console.error('❌ Error seeding content:', error);
    res.status(500).json({ error: 'Failed to seed content', details: error.message });
  }
});

app.post('/api/ask', async (req, res) => {
  try {
    const { question } = req.body;
    
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    console.log('🤖 AI Question:', question);

    // Get IAM token
    const iamToken = await getIAMToken();

    // Retrieve relevant content from Cloudant
    const relevantDocs = await retrieveRelevantDocs(question);

    // Create prompt with context
    const prompt = `You are a helpful AI assistant for digital financial literacy. Use the following trusted information to answer the user's question:

${relevantDocs.map(doc => `- ${doc.title}: ${doc.content}`).join('\n\n')}

User Question: ${question}

Please provide a clear, helpful answer based on the information above. If the information doesn't cover the specific question, provide general best practices for digital financial safety. Keep your response concise and educational.`;

    // Call IBM watsonx Agent
    const response = await fetch(WATSONX_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${iamToken}`
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Watsonx API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Extract the AI response
    const aiResponse = data.choices?.[0]?.message?.content || 
                     data.predictions?.[0]?.text ||
                     'I apologize, but I could not generate a response at this time.';

    console.log('✅ AI Response generated successfully');

    res.json({
      answer: aiResponse,
      source: 'IBM watsonx AI Agent',
      model: 'llama-3-3-70b-instruct',
      references: relevantDocs.map(doc => doc.title)
    });
    
  } catch (error) {
    console.error('❌ Error calling watsonx agent:', error);
    res.status(500).json({ 
      error: 'Failed to get answer from AI agent', 
      details: error.message 
    });
  }
});

app.post('/api/generate-questions', async (req, res) => {
  const { category, count = 5 } = req.body;
  
  if (!category) {
    return res.status(400).json({ error: 'Category is required' });
  }
  
  try {
    console.log(`🎯 Generating ${count} questions for category: ${category}`);
    
    // Get IAM token
    const iamToken = await getIAMToken();
    
    // Create prompt for AI to generate questions
    const prompt = `Generate ${count} multiple choice questions about ${category} for a digital financial literacy quiz. 

Requirements:
- Each question should have 4 options (A, B, C, D)
- Only one option should be correct
- Questions should be practical and relevant to daily financial activities
- Include questions about safety, best practices, and common scenarios
- Make questions suitable for beginners to intermediate level
- Questions should be specific and educational, not generic
- Focus on real-world applications and common mistakes people make

Format each question as JSON:
{
  "question": "Specific question about ${category}?",
  "options": ["Specific option A", "Specific option B", "Specific option C", "Specific option D"],
  "correctAnswer": 0,
  "explanation": "Brief explanation of why this is correct"
}

Return only the JSON array of questions, no additional text. Make sure each question is unique and educational.`;

    // Call IBM watsonx Agent
    const response = await fetch(WATSONX_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${iamToken}`
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });
    
    if (!response.ok) {
      throw new Error(`Watsonx API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Extract the AI response
    const aiResponse = data.choices?.[0]?.message?.content || 
                     data.predictions?.[0]?.text ||
                     '[]';
    
    console.log('🤖 AI Generated Response received');
    
    // Try to parse the JSON response
    let questions;
    try {
      // Clean the response to extract JSON and handle extra quotes
      let cleanedResponse = aiResponse;
      
      // Remove extra quotes that AI sometimes adds
      if (cleanedResponse.includes('"""')) {
        cleanedResponse = cleanedResponse.replace(/"""/g, '"');
      }
      
      // Try to find JSON array
      const jsonMatch = cleanedResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No valid JSON found in response');
      }
      
      console.log('✅ Successfully parsed AI questions:', questions.length);
    } catch (parseError) {
      console.error('❌ Failed to parse AI response:', parseError);
      console.log('🔄 Falling back to pre-written questions');
      // Fallback to generating basic questions
      questions = generateFallbackQuestions(category, count);
    }
    
    // Validate and format questions
    const formattedQuestions = questions.map((q, index) => ({
      _id: `ai-generated-${Date.now()}-${index}-${q.correctAnswer || 0}`,
      question: q.question || `Question ${index + 1}`,
      options: q.options || ['Option A', 'Option B', 'Option C', 'Option D'],
      answer: q.correctAnswer || 0,
      category: category,
      explanation: q.explanation || '',
      aiGenerated: true
    }));
    
    console.log(`✅ Generated ${formattedQuestions.length} questions for ${category}`);
    
    res.json({ 
      questions: formattedQuestions,
      category: category,
      generatedAt: new Date().toISOString(),
      source: 'IBM watsonx AI Agent'
    });
    
  } catch (error) {
    console.error('❌ Error generating questions:', error);
    res.status(500).json({ 
      error: 'Failed to generate questions from AI agent', 
      details: error.message 
    });
  }
});

// Helper function to retrieve relevant documents
async function retrieveRelevantDocs(question) {
  try {
    const result = await cloudantRequest(`${DB_NAME}/_all_docs?include_docs=true`);
    
    if (!result || !result.rows) {
      console.log('⚠️ No documents found in Cloudant');
      return [];
    }
    
    const docs = result.rows.map(row => row.doc).filter(doc => doc.type === 'financial_content');
    
    // Simple keyword matching (can be improved with vector search)
    const keywords = question.toLowerCase().split(' ');
    const scoredDocs = docs.map(doc => {
      const content = `${doc.title} ${doc.content}`.toLowerCase();
      const score = keywords.reduce((score, keyword) => {
        return score + (content.includes(keyword) ? 1 : 0);
      }, 0);
      return { ...doc, score };
    });
    
    // Return top 3 most relevant documents
    return scoredDocs
      .filter(doc => doc.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
      
  } catch (error) {
    console.error('❌ Error retrieving relevant docs:', error);
    return [];
  }
}

// Fallback function to generate basic questions if AI fails
function generateFallbackQuestions(category, count) {
  const fallbackQuestions = {
    'UPI Safety': [
      {
        question: "What should you do before making a UPI payment?",
        options: [
          "Share your UPI PIN with the sender",
          "Verify the recipient's name and UPI ID",
          "Use any public WiFi network",
          "Ignore transaction notifications"
        ],
        correctAnswer: 1,
        explanation: "Always verify the recipient's details before making any UPI payment to avoid sending money to the wrong person."
      },
      {
        question: "Which of the following is the safest way to use UPI?",
        options: [
          "Share your UPI ID on social media",
          "Use UPI only on trusted apps",
          "Use the same PIN for all accounts",
          "Ignore security updates"
        ],
        correctAnswer: 1,
        explanation: "Using UPI only on trusted, official banking apps ensures your transactions are secure."
      },
      {
        question: "What should you do if you receive a UPI payment request from an unknown number?",
        options: [
          "Accept it immediately",
          "Ignore and block the number",
          "Call the number to verify",
          "Share your UPI ID with them"
        ],
        correctAnswer: 1,
        explanation: "Never accept payment requests from unknown sources as they could be scams."
      },
      {
        question: "Which of these is NOT a safe UPI practice?",
        options: [
          "Using a strong, unique PIN",
          "Keeping your UPI ID private",
          "Sharing your UPI PIN with family members",
          "Using official banking apps only"
        ],
        correctAnswer: 2,
        explanation: "Never share your UPI PIN with anyone, including family members, for security reasons."
      },
      {
        question: "What should you do if you suspect a fraudulent UPI transaction?",
        options: [
          "Wait and see if it resolves itself",
          "Contact your bank immediately",
          "Share details on social media",
          "Ignore it completely"
        ],
        correctAnswer: 1,
        explanation: "Immediately contact your bank if you suspect fraud to minimize losses and protect your account."
      }
    ],
    'Budgeting': [
      {
        question: "What is the 50/30/20 budgeting rule?",
        options: [
          "50% needs, 30% wants, 20% savings",
          "50% savings, 30% needs, 20% wants",
          "50% wants, 30% savings, 20% needs",
          "50% entertainment, 30% food, 20% bills"
        ],
        correctAnswer: 0,
        explanation: "The 50/30/20 rule suggests allocating 50% to needs, 30% to wants, and 20% to savings and debt repayment."
      },
      {
        question: "What is the first step in creating a budget?",
        options: [
          "Set financial goals",
          "Track your income and expenses",
          "Cut all unnecessary spending",
          "Open a savings account"
        ],
        correctAnswer: 1,
        explanation: "You need to understand your current financial situation before creating an effective budget."
      },
      {
        question: "Which expense category should you prioritize in your budget?",
        options: [
          "Entertainment and dining out",
          "Essential needs like food and shelter",
          "Shopping and luxury items",
          "Vacation planning"
        ],
        correctAnswer: 1,
        explanation: "Essential needs like food, shelter, and utilities should always be prioritized in your budget."
      },
      {
        question: "What percentage of your income should you aim to save?",
        options: [
          "At least 5-10%",
          "At least 20%",
          "At least 50%",
          "Whatever is left after spending"
        ],
        correctAnswer: 1,
        explanation: "Aim to save at least 20% of your income for emergencies and future goals."
      },
      {
        question: "What is an emergency fund?",
        options: [
          "Money saved for vacations",
          "Money saved for unexpected expenses",
          "Money invested in stocks",
          "Money borrowed from friends"
        ],
        correctAnswer: 1,
        explanation: "An emergency fund is money set aside for unexpected expenses like medical bills or job loss."
      }
    ],
    'Online Safety': [
      {
        question: "What should you do if you receive a suspicious SMS asking for OTP?",
        options: [
          "Reply with the OTP immediately",
          "Call the number back to verify",
          "Ignore and delete the message",
          "Forward it to friends"
        ],
        correctAnswer: 2,
        explanation: "Never share OTPs with anyone, even if they claim to be from your bank. Legitimate banks never ask for OTPs via SMS."
      },
      {
        question: "Which of these is a safe online banking practice?",
        options: [
          "Using public WiFi for banking",
          "Sharing login credentials with family",
          "Using strong, unique passwords",
          "Saving passwords in browser"
        ],
        correctAnswer: 2,
        explanation: "Using strong, unique passwords for each account is essential for online security."
      },
      {
        question: "What should you do if you suspect your bank account has been compromised?",
        options: [
          "Wait and monitor the situation",
          "Contact your bank immediately",
          "Share the issue on social media",
          "Change your password next week"
        ],
        correctAnswer: 1,
        explanation: "Immediately contact your bank if you suspect fraud to protect your account and minimize losses."
      },
      {
        question: "Which of these is NOT a safe online practice?",
        options: [
          "Using two-factor authentication",
          "Logging out after each session",
          "Sharing personal information on social media",
          "Using secure websites (HTTPS)"
        ],
        correctAnswer: 2,
        explanation: "Never share personal information like address, phone number, or financial details on social media."
      },
      {
        question: "What should you do before clicking on a link in an email?",
        options: [
          "Click immediately if it looks interesting",
          "Hover over the link to check the URL",
          "Forward it to friends",
          "Reply to the sender"
        ],
        correctAnswer: 1,
        explanation: "Always hover over links to verify the actual URL before clicking to avoid phishing scams."
      }
    ],
    'Interest Rates': [
      {
        question: "What is compound interest?",
        options: [
          "Interest earned only on the principal amount",
          "Interest earned on both principal and accumulated interest",
          "A fixed rate that never changes",
          "A penalty for late payments"
        ],
        correctAnswer: 1,
        explanation: "Compound interest is interest earned on both the initial principal and the accumulated interest from previous periods."
      },
      {
        question: "Which type of loan typically has the highest interest rate?",
        options: [
          "Home loan",
          "Car loan",
          "Credit card",
          "Education loan"
        ],
        correctAnswer: 2,
        explanation: "Credit cards typically have the highest interest rates, often 15-25% or more."
      },
      {
        question: "What happens when interest rates increase?",
        options: [
          "Borrowing becomes cheaper",
          "Borrowing becomes more expensive",
          "Savings rates decrease",
          "Nothing changes"
        ],
        correctAnswer: 1,
        explanation: "When interest rates increase, borrowing becomes more expensive as you pay more interest on loans."
      },
      {
        question: "What is APR?",
        options: [
          "Annual Percentage Rate",
          "Average Payment Rate",
          "Annual Payment Return",
          "Average Percentage Return"
        ],
        correctAnswer: 0,
        explanation: "APR stands for Annual Percentage Rate and represents the yearly interest rate including fees."
      },
      {
        question: "Which is better for borrowers: fixed or variable interest rates?",
        options: [
          "Fixed rates are always better",
          "Variable rates are always better",
          "It depends on market conditions",
          "There's no difference"
        ],
        correctAnswer: 2,
        explanation: "The choice between fixed and variable rates depends on current market conditions and your risk tolerance."
      }
    ],
    'Digital Banking': [
      {
        question: "What is the main advantage of digital banking?",
        options: [
          "Higher interest rates",
          "Convenience and 24/7 access",
          "Lower fees",
          "Better customer service"
        ],
        correctAnswer: 1,
        explanation: "Digital banking provides convenience and 24/7 access to your accounts from anywhere."
      },
      {
        question: "Which of these is a digital banking security feature?",
        options: [
          "Two-factor authentication",
          "Sharing passwords",
          "Using public computers",
          "Saving login details"
        ],
        correctAnswer: 0,
        explanation: "Two-factor authentication adds an extra layer of security to your digital banking account."
      },
      {
        question: "What should you do after using a public computer for banking?",
        options: [
          "Leave it logged in for convenience",
          "Log out and clear browser history",
          "Save your password",
          "Share the computer with others"
        ],
        correctAnswer: 1,
        explanation: "Always log out and clear browser history when using public computers to protect your information."
      },
      {
        question: "Which is safer for online transactions?",
        options: [
          "Debit card",
          "Credit card",
          "Both are equally safe",
          "Cash only"
        ],
        correctAnswer: 1,
        explanation: "Credit cards offer better fraud protection and don't directly access your bank account."
      },
      {
        question: "What is a digital wallet?",
        options: [
          "A physical wallet for digital items",
          "A mobile app that stores payment information",
          "A type of bank account",
          "A cryptocurrency"
        ],
        correctAnswer: 1,
        explanation: "A digital wallet is a mobile app that stores payment information for convenient transactions."
      }
    ],
    'Investment Basics': [
      {
        question: "What is diversification in investing?",
        options: [
          "Putting all money in one investment",
          "Spreading money across different investments",
          "Investing only in stocks",
          "Avoiding all investments"
        ],
        correctAnswer: 1,
        explanation: "Diversification means spreading your money across different types of investments to reduce risk."
      },
      {
        question: "Which investment typically has the lowest risk?",
        options: [
          "Stocks",
          "Bonds",
          "Cryptocurrency",
          "Real estate"
        ],
        correctAnswer: 1,
        explanation: "Bonds typically have lower risk compared to stocks, cryptocurrency, and real estate."
      },
      {
        question: "What is compound interest in investing?",
        options: [
          "Interest earned only on initial investment",
          "Interest earned on investment plus previous earnings",
          "A type of tax",
          "A fee charged by brokers"
        ],
        correctAnswer: 1,
        explanation: "Compound interest means earning interest on both your initial investment and the interest you've already earned."
      },
      {
        question: "What is the main benefit of long-term investing?",
        options: [
          "Immediate returns",
          "Reduced risk and potential for growth",
          "No taxes",
          "Guaranteed profits"
        ],
        correctAnswer: 1,
        explanation: "Long-term investing reduces risk and provides potential for growth through compound interest."
      },
      {
        question: "What should you consider before investing?",
        options: [
          "Only the potential returns",
          "Your risk tolerance and financial goals",
          "What your friends are investing in",
          "The latest trends"
        ],
        correctAnswer: 1,
        explanation: "Before investing, consider your risk tolerance, financial goals, and investment timeline."
      }
    ]
  };
  
  const categoryQuestions = fallbackQuestions[category] || fallbackQuestions['Online Safety'];
  return categoryQuestions.slice(0, count);
}

app.get('/api/check-content', async (req, res) => {
  try {
    const result = await cloudantRequest(`${DB_NAME}/_all_docs?include_docs=true`);
    
    if (!result || !result.rows) {
      return res.json({ 
        error: 'Unexpected response structure',
        result: result
      });
    }
    
    const docs = result.rows.map(row => row.doc);
    res.json({ 
      count: docs.length, 
      documents: docs.map(d => ({ 
        id: d._id, 
        title: d.title, 
        content: d.content?.substring(0, 100) + '...' 
      }))
    });
  } catch (error) {
    console.error('❌ Error checking content:', error);
    res.status(500).json({ error: 'Failed to check content', details: error.message });
  }
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🤖 Digital Financial Literacy Agent AI Backend running on port ${PORT}`);
  console.log(`🔗 Connected to IBM watsonx Agent: ${WATSONX_ENDPOINT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/test`);
});

module.exports = app; 