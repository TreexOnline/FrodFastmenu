require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pino = require('pino');
const Routes = require('./routes');
const SessionManager = require('./sessionManager');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname'
    }
  }
});

class WhatsAppEngineServer {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3001;
    
    // Singleton: Criar UMA única instância global de SessionManager
    this.sessionManager = new SessionManager();
    
    // Injetar dependência no Routes (não criar nova instância)
    this.routes = new Routes(this.sessionManager);
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddleware() {
    // CORS
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'https://www.treexonline.online'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-client-info'],
      credentials: true
    }));

    // Body parser
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path} - IP: ${req.ip} - User-Agent: ${req.get('User-Agent') || 'unknown'}`);
      next();
    });
  }

  setupRoutes() {
    // API routes
    this.app.use('/api/whatsapp', this.routes.getRouter());

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        success: true,
        data: {
          service: 'FrodFast WhatsApp Engine',
          version: '1.0.0',
          status: 'running',
          timestamp: new Date().toISOString(),
          endpoints: {
            connect: 'POST /api/whatsapp/connect/:userId',
            status: 'GET /api/whatsapp/status/:userId',
            qr: 'GET /api/whatsapp/qr/:userId',
            disconnect: 'POST /api/whatsapp/disconnect/:userId',
            sessions: 'GET /api/whatsapp/sessions',
            reconnect: 'POST /api/whatsapp/reconnect/:userId',
            reconnectAll: 'POST /api/whatsapp/reconnect-all',
            health: 'GET /api/whatsapp/health',
            cleanup: 'POST /api/whatsapp/cleanup'
          }
        }
      });
    });

    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      try {
        const sessions = this.sessionManager.getAllSessions();
        const memory = process.memoryUsage();
        
        res.json({
          success: true,
          data: {
            service: 'FrodFast WhatsApp Engine',
            status: 'healthy',
            uptime: process.uptime(),
            memory: {
              rss: Math.round(memory.rss / 1024 / 1024) + ' MB',
              heapTotal: Math.round(memory.heapTotal / 1024 / 1024) + ' MB',
              heapUsed: Math.round(memory.heapUsed / 1024 / 1024) + ' MB',
              external: Math.round(memory.external / 1024 / 1024) + ' MB'
            },
            sessions: {
              total: sessions.length,
              connected: sessions.filter(s => s.connected).length,
              connecting: sessions.filter(s => s.status === 'connecting').length,
              disconnected: sessions.filter(s => s.status === 'disconnected').length,
              qr: sessions.filter(s => s.status === 'qr').length
            },
            timestamp: new Date().toISOString()
          }
        });
      } catch (error) {
        logger.error('Health check error:', error);
        res.status(500).json({
          success: false,
          error: 'Health check failed'
        });
      }
    });
  }

  setupErrorHandling() {
    // Global error handler
    this.app.use((error, req, res, next) => {
      logger.error('Unhandled error:', error);
      
      if (res.headersSent) {
        return next(error);
      }
      
      res.status(500).json({
        success: false,
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
      });
    });

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.path,
        method: req.method
      });
    });
  }

  async start() {
    try {
      logger.info('🚀 Starting FrodFast WhatsApp Engine...');
      
      // Testar conexão com Supabase
      const SupabaseService = require('./supabaseService');
      const supabaseService = new SupabaseService();
      await supabaseService.testConnection();
      
      // Iniciar servidor
      this.server = this.app.listen(this.port, () => {
        logger.info(`✅ WhatsApp Engine started successfully on port ${this.port}`);
        logger.info(`📡 API available at: http://localhost:${this.port}/api/whatsapp`);
        logger.info(`🏥 Health check at: http://localhost:${this.port}/health`);
        logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      });

      // Graceful shutdown
      this.setupGracefulShutdown();

      // Cleanup periódico
      this.setupPeriodicCleanup();

      // Reconexão automática de sessões
      this.setupAutoReconnect();

    } catch (error) {
      logger.error('❌ Failed to start WhatsApp Engine:', error);
      process.exit(1);
    }
  }

  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      logger.info(`🛑 Received ${signal}, shutting down gracefully...`);
      
      // Parar de aceitar novas conexões
      this.server.close(async () => {
        logger.info('📡 HTTP server closed');
        
        try {
          // Desconectar todas as sessões
          const sessions = this.sessionManager.getAllSessions();
          logger.info(`🔌 Disconnecting ${sessions.length} sessions...`);
          
          for (const session of sessions) {
            await this.sessionManager.disconnectSession(session.userId);
          }
          
          logger.info('✅ All sessions disconnected');
          logger.info('👋 WhatsApp Engine shutdown complete');
          process.exit(0);
        } catch (error) {
          logger.error('❌ Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Forçar shutdown após 30 segundos
      setTimeout(() => {
        logger.error('⏰ Forced shutdown due to timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }

  setupPeriodicCleanup() {
    // Limpar sessões antigas a cada 24 horas
    setInterval(async () => {
      try {
        logger.info('🧹 Starting periodic cleanup...');
        await this.sessionManager.cleanupOldSessions();
        logger.info('✅ Periodic cleanup completed');
      } catch (error) {
        logger.error('❌ Periodic cleanup failed:', error);
      }
    }, 24 * 60 * 60 * 1000); // 24 horas
  }

  setupAutoReconnect() {
    // Tentar reconectar sessões desconectadas a cada 5 minutos
    setInterval(async () => {
      try {
        const sessions = this.sessionManager.getAllSessions();
        const disconnectedSessions = sessions.filter(s => s.status === 'disconnected');
        
        if (disconnectedSessions.length > 0) {
          logger.info(`🔄 Found ${disconnectedSessions.length} disconnected sessions, attempting reconnection...`);
          
          for (const session of disconnectedSessions) {
            try {
              await this.sessionManager.startSession(session.userId);
            } catch (error) {
              logger.error(`❌ Failed to reconnect session ${session.userId}:`, error);
            }
          }
        }
      } catch (error) {
        logger.error('❌ Auto reconnect failed:', error);
      }
    }, 5 * 60 * 1000); // 5 minutos
  }

  async stop() {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(resolve);
      });
    }
  }
}

// Iniciar servidor se este arquivo for executado diretamente
if (require.main === module) {
  const server = new WhatsAppEngineServer();
  server.start().catch((error) => {
    logger.error('Failed to start server:', error);
    process.exit(1);
  });
}

module.exports = WhatsAppEngineServer;
