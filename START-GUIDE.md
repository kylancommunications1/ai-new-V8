# AI Call Center - Quick Start Guide

## 🚀 One-Command Setup

This repository includes a fully automated setup command that handles **EVERYTHING** for you:

```bash
npm run start-ai-call-center
```

## What This Command Does Automatically

✅ **Cleans up old dependencies** - Removes any corrupted node_modules  
✅ **Installs all dependencies** - Root, UI, server, and all packages  
✅ **Fixes Google GenAI imports** - Removes old @google/generative-ai and installs correct @google/genai@^1.7.0  
✅ **Builds all TypeScript packages** - Compiles audio-converter, twilio-server, gemini-live-client, tw2gem-server  
✅ **Sets up database tables** - Creates all required Supabase tables  
✅ **Installs PM2** - Production process manager  
✅ **Starts backend server** - API server on port 12001  
✅ **Starts frontend UI** - React app on port 12000  
✅ **Runs system verification** - Health checks and system tests  
✅ **Creates environment files** - Frontend .env.local with correct VITE_ prefixes  

## Prerequisites

1. **Node.js 18+** installed
2. **Environment variables** configured in `.env` file:

```env
# Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Twilio
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
TWILIO_API_KEY_SID=your_twilio_api_key_sid
TWILIO_API_KEY_SECRET=your_twilio_api_key_secret
```

## Usage

1. **Clone the repository**
2. **Create `.env` file** with your credentials (see above)
3. **Run the start command**:
   ```bash
   npm run start-ai-call-center
   ```

That's it! The command will handle everything else automatically.

## After Setup

Once the command completes successfully, you'll have:

- **Frontend**: http://localhost:12000
- **Backend API**: http://localhost:12001
- **Health Check**: http://localhost:12001/health
- **System Tests**: http://localhost:12001/test/system

## Production Management

The system uses PM2 for production process management:

```bash
pm2 status          # Check service status
pm2 logs            # View all logs
pm2 logs backend    # View backend logs only
pm2 logs frontend   # View frontend logs only
pm2 restart all     # Restart all services
pm2 stop all        # Stop all services
```

## Troubleshooting

If you encounter any issues:

1. **Check PM2 status**: `pm2 status`
2. **View logs**: `pm2 logs`
3. **Restart services**: `pm2 restart all`
4. **Re-run setup**: `npm run start-ai-call-center`

The start command is designed to be **idempotent** - you can run it multiple times safely.

## Features Included

- ✅ **Twilio Integration** - Voice calls and SMS
- ✅ **Gemini AI** - Advanced conversational AI
- ✅ **Supabase Database** - Real-time data storage
- ✅ **Audio Processing** - High-quality voice handling
- ✅ **WebSocket Support** - Real-time communication
- ✅ **Authentication** - Secure user management
- ✅ **Campaign Management** - Call campaigns and lead tracking
- ✅ **IVR System** - Interactive voice response
- ✅ **Analytics** - Call logs and reporting

## Production Ready

This setup is **production-ready** with:
- PM2 process management
- Health monitoring
- Error handling
- Automatic restarts
- Logging
- Environment configuration