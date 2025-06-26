#!/usr/bin/env node

/**
 * TW2GEM AI Call Center - Demo Server
 * 
 * A simplified demo server that runs without external dependencies
 * to demonstrate the system is working.
 */

import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 12001;

// Middleware
app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'TW2GEM AI Call Center Demo',
        version: '1.0.0',
        uptime: process.uptime()
    });
});

// Status endpoint
app.get('/status', (req, res) => {
    res.json({
        service: 'TW2GEM AI Call Center',
        status: 'running',
        mode: 'demo',
        features: {
            'Real-time Audio Processing': 'Available (requires API keys)',
            'Campaign Management': 'Demo mode',
            'Lead Tracking': 'Demo mode',
            'Call Analytics': 'Demo mode',
            'Payment Processing': 'Demo mode',
            'User Management': 'Demo mode'
        },
        endpoints: {
            health: '/health',
            status: '/status',
            api: '/api/*',
            webhook: '/webhook/*'
        },
        note: 'This is a demo server. Configure environment variables for full functionality.'
    });
});

// Demo API endpoints
app.get('/api/campaigns', (req, res) => {
    res.json({
        campaigns: [
            {
                id: 1,
                name: 'Demo Campaign 1',
                status: 'active',
                leads: 150,
                calls_made: 45,
                success_rate: '32%'
            },
            {
                id: 2,
                name: 'Demo Campaign 2',
                status: 'paused',
                leads: 200,
                calls_made: 78,
                success_rate: '28%'
            }
        ]
    });
});

app.get('/api/leads', (req, res) => {
    res.json({
        leads: [
            {
                id: 1,
                name: 'John Doe',
                phone: '+1234567890',
                status: 'contacted',
                campaign_id: 1
            },
            {
                id: 2,
                name: 'Jane Smith',
                phone: '+1234567891',
                status: 'pending',
                campaign_id: 1
            }
        ]
    });
});

app.get('/api/calls', (req, res) => {
    res.json({
        calls: [
            {
                id: 1,
                lead_id: 1,
                duration: 120,
                status: 'completed',
                timestamp: new Date().toISOString()
            },
            {
                id: 2,
                lead_id: 2,
                duration: 45,
                status: 'no_answer',
                timestamp: new Date().toISOString()
            }
        ]
    });
});

app.get('/api/analytics', (req, res) => {
    res.json({
        analytics: {
            total_calls: 123,
            successful_calls: 39,
            success_rate: '31.7%',
            average_duration: 95,
            total_leads: 350,
            active_campaigns: 2
        }
    });
});

// Webhook endpoints
app.post('/webhook/twilio', (req, res) => {
    console.log('Twilio webhook received:', req.body);
    res.json({ status: 'received' });
});

app.post('/webhook/stripe', (req, res) => {
    console.log('Stripe webhook received:', req.body);
    res.json({ status: 'received' });
});

// Catch-all for API routes
app.use('/api/*', (req, res) => {
    res.json({
        message: 'API endpoint available in demo mode',
        method: req.method,
        path: req.path,
        note: 'Configure environment variables for full functionality'
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not found',
        path: req.originalUrl,
        available_endpoints: ['/health', '/status', '/api/*', '/webhook/*']
    });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 TW2GEM AI Call Center Demo Server started!');
    console.log(`📊 Server running on http://localhost:${PORT}`);
    console.log(`🏥 Health check: http://localhost:${PORT}/health`);
    console.log(`📋 Status: http://localhost:${PORT}/status`);
    console.log('');
    console.log('🎯 Available endpoints:');
    console.log('  GET  /health           - Health check');
    console.log('  GET  /status           - Service status');
    console.log('  GET  /api/campaigns    - Demo campaigns');
    console.log('  GET  /api/leads        - Demo leads');
    console.log('  GET  /api/calls        - Demo calls');
    console.log('  GET  /api/analytics    - Demo analytics');
    console.log('  POST /webhook/twilio   - Twilio webhook');
    console.log('  POST /webhook/stripe   - Stripe webhook');
    console.log('');
    console.log('💡 This is a demo server. Configure environment variables for full functionality.');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Received SIGTERM, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 Received SIGINT, shutting down gracefully...');
    process.exit(0);
});