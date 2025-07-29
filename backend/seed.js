const fetch = require('node-fetch');
require('dotenv').config();

// Configuration
const CLOUDANT_URL = process.env.CLOUDANT_URL;
const CLOUDANT_API_KEY = process.env.CLOUDANT_API_KEY;

// Database names
const USERS_DB = 'users';
const QUESTIONS_DB = 'questions';
const PROGRESS_DB = 'progress';
const CONTENT_DB = 'financial_content';

// Sample quiz questions
const sampleQuestions = [
  {
    question: "What is the safest way to use UPI?",
    options: [
      "Share your UPI PIN with trusted friends",
      "Use only official banking apps",
      "Use any third-party payment app",
      "Save your UPI ID on public computers"
    ],
    answer: 1,
    category: "UPI Safety",
    explanation: "Always use official banking apps for UPI transactions as they have better security measures."
  },
  {
    question: "Which of these is a good budgeting practice?",
    options: [
      "Spend all your money immediately",
      "Track your income and expenses",
      "Ignore your bank statements",
      "Borrow money for daily expenses"
    ],
    answer: 1,
    category: "Budgeting",
    explanation: "Tracking your income and expenses is the foundation of good budgeting."
  },
  {
    question: "What should you do if you receive a suspicious SMS?",
    options: [
      "Reply immediately",
      "Click on any links in the message",
      "Delete the message and block the sender",
      "Forward it to friends"
    ],
    answer: 2,
    category: "Online Safety",
    explanation: "Never engage with suspicious messages. Delete them and block the sender."
  },
  {
    question: "What is compound interest?",
    options: [
      "Interest only on the principal amount",
      "Interest on both principal and accumulated interest",
      "A type of bank fee",
      "A penalty for late payments"
    ],
    answer: 1,
    category: "Interest Rates",
    explanation: "Compound interest means earning interest on both your initial investment and the interest you've already earned."
  },
  {
    question: "Which is safer for online transactions?",
    options: [
      "Debit card",
      "Credit card",
      "Both are equally safe",
      "Cash only"
    ],
    answer: 1,
    category: "Digital Banking",
    explanation: "Credit cards offer better fraud protection and don't directly access your bank account."
  },
  {
    question: "What is diversification in investing?",
    options: [
      "Putting all money in one investment",
      "Spreading money across different investments",
      "Investing only in stocks",
      "Avoiding all investments"
    ],
    answer: 1,
    category: "Investment Basics",
    explanation: "Diversification reduces risk by spreading your money across different types of investments."
  }
];

// Financial content for RAG
const financialContent = [
  {
    title: "UPI Safety Guidelines",
    content: "UPI (Unified Payments Interface) is a real-time payment system. To use UPI safely: 1) Never share your UPI PIN with anyone, 2) Always verify the recipient name before sending money, 3) Use only official banking apps, 4) Enable two-factor authentication, 5) Keep your phone secure with a strong password, 6) Never click on suspicious links asking for UPI details, 7) Report any suspicious activity immediately to your bank.",
    category: "UPI Safety",
    tags: ["UPI", "safety", "payments", "security"]
  },
  {
    title: "Online Banking Security",
    content: "Online banking security is crucial for protecting your money. Best practices include: 1) Use strong, unique passwords, 2) Enable two-factor authentication, 3) Never use public WiFi for banking, 4) Keep your devices updated, 5) Log out after each session, 6) Monitor your accounts regularly, 7) Use secure websites (HTTPS), 8) Never share login credentials.",
    category: "Online Safety",
    tags: ["online banking", "security", "passwords", "authentication"]
  },
  {
    title: "Budgeting Basics",
    content: "Budgeting is the foundation of financial health. The 50/30/20 rule suggests: 50% for needs (housing, food, utilities), 30% for wants (entertainment, dining), and 20% for savings and debt repayment. Track your expenses, set financial goals, create an emergency fund, and review your budget regularly.",
    category: "Budgeting",
    tags: ["budgeting", "financial planning", "savings", "expenses"]
  },
  {
    title: "Interest Rates Explained",
    content: "Interest rates affect borrowing and saving. When rates are high, borrowing becomes expensive but savings earn more. When rates are low, borrowing is cheaper but savings earn less. APR (Annual Percentage Rate) includes fees and shows the true cost of borrowing. Compound interest means earning interest on both principal and accumulated interest.",
    category: "Interest Rates",
    tags: ["interest rates", "APR", "compound interest", "borrowing"]
  },
  {
    title: "Digital Banking Features",
    content: "Digital banking offers convenience and security. Features include: 1) 24/7 account access, 2) Mobile check deposits, 3) Bill payments and transfers, 4) Real-time notifications, 5) Budgeting tools, 6) Investment options, 7) Customer support chat. Always use official apps and secure connections.",
    category: "Digital Banking",
    tags: ["digital banking", "mobile banking", "convenience", "features"]
  },
  {
    title: "Investment Fundamentals",
    content: "Investing helps grow wealth over time. Key principles: 1) Diversification reduces risk, 2) Start early to benefit from compound growth, 3) Understand your risk tolerance, 4) Invest for the long term, 5) Consider index funds for beginners, 6) Don't invest money you need soon, 7) Regularly review and rebalance your portfolio.",
    category: "Investment Basics",
    tags: ["investing", "diversification", "compound growth", "risk management"]
  }
];

// Helper function to get IAM token
async function getIAMToken() {
  try {
    console.log('🔑 Getting IAM token...');
    
    const response = await fetch('https://iam.cloud.ibm.com/identity/token', {
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
    
    if (!response.ok) {
      throw new Error(`IAM token request failed: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✅ IAM token received');
    return data.access_token;
  } catch (error) {
    console.error('❌ Error getting IAM token:', error);
    throw error;
  }
}

// Helper function to make Cloudant requests
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
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cloudant request failed: ${response.status} - ${errorText}`);
    }
    
    return response.json();
  } catch (error) {
    console.error('❌ Cloudant request error:', error);
    throw error;
  }
}

// Seed function
async function seedData() {
  try {
    console.log('🌱 Starting data seeding process...');
    
    // Get IAM token for Cloudant
    const iamToken = await getIAMToken();
    const headers = {
      'Authorization': `Bearer ${iamToken}`,
      'Content-Type': 'application/json'
    };
    
    // Create databases if they don't exist
    const databases = [USERS_DB, QUESTIONS_DB, PROGRESS_DB, CONTENT_DB];
    
    for (const dbName of databases) {
      try {
        await fetch(`${CLOUDANT_URL}/${dbName}`, {
          method: 'PUT',
          headers
        });
        console.log(`✅ Database '${dbName}' created/verified`);
      } catch (error) {
        if (error.message.includes('412')) {
          console.log(`ℹ️ Database '${dbName}' already exists`);
        } else {
          console.error(`❌ Error creating database '${dbName}':`, error.message);
        }
      }
    }
    
    // Seed quiz questions
    console.log('\n📝 Seeding quiz questions...');
    for (const question of sampleQuestions) {
      const doc = {
        ...question,
        type: 'question',
        createdAt: new Date().toISOString()
      };
      
      await fetch(`${CLOUDANT_URL}/${QUESTIONS_DB}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(doc)
      });
    }
    console.log(`✅ Seeded ${sampleQuestions.length} quiz questions`);
    
    // Seed financial content
    console.log('\n📚 Seeding financial content...');
    for (const content of financialContent) {
      const doc = {
        ...content,
        type: 'financial_content',
        createdAt: new Date().toISOString()
      };
      
      await fetch(`${CLOUDANT_URL}/${CONTENT_DB}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(doc)
      });
    }
    console.log(`✅ Seeded ${financialContent.length} financial content documents`);
    
    console.log('\n🎉 Data seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Quiz Questions: ${sampleQuestions.length}`);
    console.log(`- Financial Content: ${financialContent.length}`);
    console.log(`- Databases: ${databases.join(', ')}`);
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  // Validate environment variables
  if (!CLOUDANT_API_KEY || !CLOUDANT_URL) {
    console.error('❌ ERROR: CLOUDANT_API_KEY or CLOUDANT_URL is not set in .env file');
    process.exit(1);
  }
  
  console.log('🚀 Digital Financial Literacy Agent - Data Seeding');
  console.log('================================================');
  
  seedData();
}

module.exports = { seedData, sampleQuestions, financialContent };
