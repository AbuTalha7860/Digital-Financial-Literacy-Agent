# 💰 Digital Financial Literacy Agent

An AI-powered educational platform that helps users understand and navigate essential digital financial tools and practices. Built with React, Node.js, and IBM Cloud services.

## 🎯 Project Overview

This project addresses the challenge of digital financial literacy by providing:
- **Interactive Quizzes**: AI-generated questions on financial topics
- **AI Chat Assistant**: Powered by IBM watsonx.ai for personalized guidance
- **Progress Tracking**: Monitor your learning journey
- **RAG (Retrieval-Augmented Generation)**: Combines trusted content with AI responses

## 🚀 Features

### Core Features
- **User Authentication**: Secure login/registration system
- **AI-Generated Quizzes**: Dynamic questions for 6 financial categories
- **Real-time Chat**: AI assistant for financial guidance
- **Progress Tracking**: Visual progress dashboard
- **Responsive Design**: Works on desktop and mobile devices
- **Modular Navigation**: Centralized, reusable navigation component with hamburger menu for mobile

### Quiz Categories
1. **UPI Safety** - Digital payment security
2. **Budgeting** - Financial planning and management
3. **Online Safety** - Cybersecurity and fraud prevention
4. **Interest Rates** - Understanding borrowing and saving
5. **Digital Banking** - Modern banking features
6. **Investment Basics** - Getting started with investing

### AI Integration
- **IBM watsonx.ai**: For AI-generated questions and chat responses
- **IBM Cloudant**: Database for user data and trusted content
- **RAG Pipeline**: Combines retrieved content with AI generation

## 🛠️ Technology Stack

### Frontend
- **React 18+**: Modern UI framework
- **CSS-in-JS & Utility CSS**: Inline styles and utility classes for performance and maintainability
- **Responsive Design**: Mobile-first approach with hamburger menu and sidebar navigation

### Backend
- **Node.js**: Server runtime
- **Express.js**: Web framework
- **JWT**: Authentication tokens
- **bcrypt**: Password hashing

### Cloud Services
- **IBM watsonx.ai**: AI/ML platform (Granite model)
- **IBM Cloudant**: NoSQL database
- **IBM Cloud IAM**: Identity and access management

## 📁 Project Structure

```
DigitalFinancialLiteracyAgent/
├── backend/                 # Node.js backend
│   ├── index.js            # Main server file
│   ├── rag.js              # AI integration
│   ├── seed.js             # Database seeding
│   ├── package.json        # Backend dependencies
│   └── .env                # Environment variables
├── frontend/                # React frontend
│   ├── src/
│   │   ├── App.js         # Main application
│   │   ├── components/    # Reusable components (Navigation, Auth, etc.)
│   │   └── index.js       # Entry point
│   ├── public/            # Static assets
│   └── package.json       # Frontend dependencies
└── README.md              # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- IBM Cloud account
- npm or yarn

### 1. Clone the Repository
```bash
git clone <repository-url>
cd DigitalFinancialLiteracyAgent
```

### 2. Set Up IBM Cloud Services

#### Create IBM Cloud Account
1. Sign up at [IBM Cloud](https://cloud.ibm.com)
2. Create a Lite (free) account

#### Set Up watsonx.ai
1. Go to IBM Cloud Catalog
2. Search for "watsonx.ai"
3. Create a new project
4. Deploy an AI agent with the Granite model
5. Note the deployment endpoint URL

#### Set Up Cloudant
1. Go to IBM Cloud Catalog
2. Search for "Cloudant"
3. Create a new Cloudant instance
4. Get your API key and URL from Service Credentials

### 3. Configure Environment Variables

Create `.env` files in both `backend/` and `frontend/` directories:

#### Backend (.env)
```env
# IBM Cloud Services
WATSONX_API_KEY=your_watsonx_api_key
CLOUDANT_API_KEY=your_cloudant_api_key
CLOUDANT_URL=your_cloudant_url

# Server Configuration
PORT=5000
JWT_SECRET=your_jwt_secret
NODE_ENV=development
```

#### Frontend (.env)
```env
REACT_APP_BACKEND_URL=http://localhost:5000
REACT_APP_AI_BACKEND_URL=http://localhost:5100
```

### 4. Install Dependencies

#### Backend
```bash
cd backend
npm install
```

#### Frontend
```bash
cd frontend
npm install
```

### 5. Seed the Database
```bash
cd backend
node seed.js
```

### 6. Start the Application

#### Start Backend Servers
```bash
# Terminal 1 - Main backend
cd backend
npm start

# Terminal 2 - AI backend
cd backend
node rag.js
```

#### Start Frontend
```bash
# Terminal 3
cd frontend
npm start
```

### 7. Access the Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- AI Backend: http://localhost:5100

## 🔧 API Endpoints

### Authentication
- `POST /api/register` - User registration
- `POST /api/login` - User login

### Quiz System
- `GET /api/questions` - Get quiz questions
- `POST /api/submit` - Submit quiz answers
- `GET /api/progress` - Get user progress

### AI Services
- `POST /api/ask` - Chat with AI assistant
- `POST /api/generate-questions` - Generate AI questions
- `POST /api/seed-content` - Seed financial content

## 🎨 UI/UX Features

### Design Principles
- **Clean & Modern**: Minimalist design with clear hierarchy
- **Responsive**: Works seamlessly on all devices
- **Accessible**: Follows WCAG guidelines
- **Intuitive**: Easy navigation and user flow

### Key Components
- **Sticky Modular Navigation**: Always accessible menu, implemented as a reusable component
- **Mobile Hamburger Menu & Sidebar**: Navigation is accessible via hamburger menu and sidebar on mobile
- **Welcome Message**: Bold, dark, and only shows the username after login (no exclamation mark)
- **Username Persistence**: Username is saved after login and shown in the header until logout
- **Loading States**: Visual feedback for async operations
- **Error Handling**: User-friendly error messages
- **Progress Indicators**: Visual progress tracking

## 🔒 Security Features

- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: bcrypt for password security
- **Input Validation**: Server-side validation
- **CORS Protection**: Cross-origin request security
- **Environment Variables**: Secure credential management

## 📊 Performance Optimizations

- **Code Splitting**: Lazy loading of components
- **Optimized Images**: Compressed and responsive images
- **Caching**: Browser and API response caching
- **Minification**: Production build optimization
- **CDN Ready**: Static asset optimization

## 🧪 Testing

### Manual Testing Checklist
- [ ] User registration and login
- [ ] Quiz taking and submission
- [ ] Progress tracking
- [ ] AI chat functionality
- [ ] Mobile responsiveness (hamburger menu and sidebar)
- [ ] Error handling

### API Testing
```bash
# Test backend health
curl http://localhost:5000/api/health

# Test AI backend
curl http://localhost:5100/api/test
```

## 🚀 Deployment

### Backend Deployment
1. Set up environment variables
2. Configure CORS for production domain
3. Deploy to IBM Cloud, Heroku, or similar

### Frontend Deployment
1. Build the production version: `npm run build`
2. Deploy to Netlify, Vercel, or similar
3. Configure environment variables

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- IBM Cloud for providing the AI and database services
- React and Node.js communities for excellent documentation
- Financial literacy organizations for content inspiration

## 📞 Support

For support or questions:
- Create an issue in the repository
- Check the troubleshooting section below
- Review the IBM Cloud documentation

## 🔧 Troubleshooting

### Common Issues

#### Backend Won't Start
- Check if all environment variables are set
- Verify IBM Cloud credentials
- Ensure ports are not in use

#### AI Not Responding
- Verify watsonx.ai deployment is active
- Check API key permissions
- Review network connectivity

#### Database Issues
- Verify Cloudant credentials
- Check database permissions
- Run the seeding script

#### Frontend Build Issues
- Clear node_modules and reinstall
- Check React version compatibility
- Verify environment variables

### Debug Mode
Enable debug logging by setting `NODE_ENV=development` in your environment variables.

---

**Built with ❤️ for better financial literacy** 