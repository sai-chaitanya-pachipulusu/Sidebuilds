// MSW server setup for API mocking
import { setupServer } from 'msw/node';
import { rest } from 'msw';

// Mock data
const mockProjects = [
  global.testUtils?.createMockProject({
    id: 1,
    name: 'React E-commerce Platform',
    sale_price: 45000,
    monthly_revenue: 8000,
    trust_score: 95,
  }),
  global.testUtils?.createMockProject({
    id: 2,
    name: 'AI Analytics Dashboard',
    sale_price: 75000,
    monthly_revenue: 12000,
    trust_score: 88,
  }),
  global.testUtils?.createMockProject({
    id: 3,
    name: 'Mobile App Backend',
    sale_price: 30000,
    monthly_revenue: 5000,
    trust_score: 92,
  }),
];

const mockUsers = [
  global.testUtils?.createMockUser({
    id: 1,
    email: 'buyer@test.com',
    role: 'buyer',
  }),
  global.testUtils?.createMockUser({
    id: 2,
    email: 'seller@test.com',
    role: 'seller',
  }),
];

// API handlers
export const handlers = [
  // Authentication endpoints
  rest.post('/api/auth/login', (req, res, ctx) => {
    const { email, password } = req.body;
    
    if (email === 'test@example.com' && password === 'password123') {
      return res(
        ctx.status(200),
        ctx.json({
          token: 'mock-jwt-token',
          user: mockUsers[0],
        })
      );
    }
    
    return res(
      ctx.status(401),
      ctx.json({ message: 'Invalid credentials' })
    );
  }),

  rest.post('/api/auth/register', (req, res, ctx) => {
    const { email, password, name } = req.body;
    
    return res(
      ctx.status(201),
      ctx.json({
        token: 'mock-jwt-token',
        user: {
          id: Date.now(),
          email,
          name,
          role: 'buyer',
          isVerified: false,
        },
      })
    );
  }),

  rest.post('/api/auth/refresh', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        token: 'refreshed-jwt-token',
        expiresIn: 3600,
      })
    );
  }),

  // Projects endpoints
  rest.get('/api/projects', (req, res, ctx) => {
    const url = new URL(req.url);
    const search = url.searchParams.get('search');
    const category = url.searchParams.get('category');
    const minPrice = url.searchParams.get('minPrice');
    const maxPrice = url.searchParams.get('maxPrice');

    let filteredProjects = [...mockProjects];

    // Apply filters
    if (search) {
      filteredProjects = filteredProjects.filter(p => 
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (minPrice) {
      filteredProjects = filteredProjects.filter(p => 
        p.sale_price >= parseInt(minPrice)
      );
    }

    if (maxPrice) {
      filteredProjects = filteredProjects.filter(p => 
        p.sale_price <= parseInt(maxPrice)
      );
    }

    return res(
      ctx.status(200),
      ctx.json({
        projects: filteredProjects,
        total: filteredProjects.length,
        page: 1,
        limit: 20,
      })
    );
  }),

  rest.get('/api/projects/:id', (req, res, ctx) => {
    const { id } = req.params;
    const project = mockProjects.find(p => p.id === parseInt(id));
    
    if (!project) {
      return res(
        ctx.status(404),
        ctx.json({ message: 'Project not found' })
      );
    }

    return res(
      ctx.status(200),
      ctx.json(project)
    );
  }),

  rest.get('/api/projects/:id/availability', (req, res, ctx) => {
    const { id } = req.params;
    const project = mockProjects.find(p => p.id === parseInt(id));
    
    if (!project) {
      return res(
        ctx.status(404),
        ctx.json({ message: 'Project not found' })
      );
    }

    return res(
      ctx.status(200),
      ctx.json({
        available: project.is_for_sale,
        reason: project.is_for_sale ? null : 'Project is no longer for sale',
        lastUpdated: new Date().toISOString(),
      })
    );
  }),

  // Payment endpoints
  rest.post('/api/payments/stripe/checkout', (req, res, ctx) => {
    const { projectId, metadata } = req.body;
    const project = mockProjects.find(p => p.id === projectId);
    
    if (!project) {
      return res(
        ctx.status(404),
        ctx.json({ message: 'Project not found' })
      );
    }

    if (!project.is_for_sale) {
      return res(
        ctx.status(400),
        ctx.json({ message: 'Project is not available for purchase' })
      );
    }

    return res(
      ctx.status(200),
      ctx.json({
        checkout_url: 'https://checkout.stripe.com/pay/test_session_id',
        session_id: 'cs_test_session_id',
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      })
    );
  }),

  rest.get('/api/payments/health', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        providers: {
          stripe: {
            status: 'active',
            responseTime: 120,
            lastChecked: new Date().toISOString(),
          },
          paypal: {
            status: 'active',
            responseTime: 180,
            lastChecked: new Date().toISOString(),
          },
        },
        overall: 'healthy',
      })
    );
  }),

  rest.get('/api/payments/methods', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        methods: [
          {
            id: 'stripe',
            name: 'Stripe',
            provider: 'stripe',
            fees: 2.9,
            available: true,
          },
          {
            id: 'paypal',
            name: 'PayPal',
            provider: 'paypal',
            fees: 3.5,
            available: true,
          },
        ],
        healthCheck: {
          lastChecked: new Date().toISOString(),
          allHealthy: true,
        },
      })
    );
  }),

  // Purchase requests endpoints
  rest.post('/api/purchase-requests', (req, res, ctx) => {
    const { projectId, message, commitments } = req.body;
    
    return res(
      ctx.status(201),
      ctx.json({
        id: Date.now(),
        projectId,
        buyerId: 1,
        sellerId: 2,
        status: 'interest_expressed',
        message,
        commitments,
        createdAt: new Date().toISOString(),
      })
    );
  }),

  rest.get('/api/purchase-requests', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        requests: [
          {
            id: 1,
            projectId: 1,
            projectName: 'React E-commerce Platform',
            status: 'interest_expressed',
            createdAt: new Date().toISOString(),
          },
        ],
      })
    );
  }),

  // Search endpoints
  rest.get('/api/search', (req, res, ctx) => {
    const url = new URL(req.url);
    const query = url.searchParams.get('q');
    const filters = url.searchParams.get('filters');

    // Simulate search delay
    const delay = Math.random() * 200 + 50; // 50-250ms

    setTimeout(() => {
      const results = mockProjects.filter(p => 
        p.name.toLowerCase().includes(query?.toLowerCase() || '') ||
        p.description.toLowerCase().includes(query?.toLowerCase() || '')
      );

      return res(
        ctx.status(200),
        ctx.json({
          results,
          totalResults: results.length,
          searchTime: delay,
          cached: false,
        })
      );
    }, delay);
  }),

  rest.get('/api/search/index', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        index: {
          ngrams: {
            'react': [1, 3],
            'node': [1, 2, 3],
            'ai': [2],
            'mobile': [3],
          },
          metadata: {
            lastUpdated: new Date().toISOString(),
            totalProjects: mockProjects.length,
            indexSize: '2.3KB',
          },
        },
      })
    );
  }),

  // AI endpoints
  rest.post('/api/ai/score-project', (req, res, ctx) => {
    const { projectId, projectData } = req.body;
    
    // Simulate AI processing time
    return res(
      ctx.delay(500),
      ctx.status(200),
      ctx.json({
        score: 87,
        breakdown: {
          technical: 85,
          market: 90,
          financial: 85,
          risk: 88,
        },
        insights: [
          'Strong technical implementation with modern stack',
          'Good market positioning in growing sector',
          'Healthy revenue growth trajectory',
        ],
        recommendations: [
          'Consider improving test coverage',
          'Explore international market expansion',
        ],
        confidence: 0.92,
      })
    );
  }),

  // Notifications endpoints
  rest.get('/api/notifications', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        notifications: [
          {
            id: 1,
            type: 'purchase_interest',
            title: 'New Purchase Interest',
            message: 'Someone is interested in your project',
            read: false,
            createdAt: new Date().toISOString(),
          },
        ],
      })
    );
  }),

  rest.post('/api/notifications/mark-read', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ success: true }));
  }),

  // Error reporting endpoints
  rest.post('/api/errors/report', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        reportId: `report_${Date.now()}`,
        status: 'received',
        tracking: true,
      })
    );
  }),

  // Fallback for unhandled requests
  rest.get('*', (req, res, ctx) => {
    console.warn(`Unhandled GET request to ${req.url}`);
    return res(
      ctx.status(404),
      ctx.json({ message: 'Not found' })
    );
  }),

  rest.post('*', (req, res, ctx) => {
    console.warn(`Unhandled POST request to ${req.url}`);
    return res(
      ctx.status(404),
      ctx.json({ message: 'Not found' })
    );
  }),
];

// Create server instance
export const server = setupServer(...handlers);

// Export utilities for test customization
export const mockApiResponse = (endpoint, response, options = {}) => {
  const { method = 'get', status = 200, delay = 0 } = options;
  
  server.use(
    rest[method](endpoint, (req, res, ctx) => {
      const response_chain = [ctx.status(status)];
      
      if (delay > 0) {
        response_chain.unshift(ctx.delay(delay));
      }
      
      if (typeof response === 'object') {
        response_chain.push(ctx.json(response));
      } else {
        response_chain.push(ctx.text(response));
      }
      
      return res(...response_chain);
    })
  );
};

export const mockApiError = (endpoint, error, options = {}) => {
  const { method = 'get', status = 500, delay = 0 } = options;
  
  server.use(
    rest[method](endpoint, (req, res, ctx) => {
      const response_chain = [ctx.status(status)];
      
      if (delay > 0) {
        response_chain.unshift(ctx.delay(delay));
      }
      
      response_chain.push(ctx.json({ error, message: error }));
      
      return res(...response_chain);
    })
  );
};

export const resetMocks = () => {
  server.resetHandlers();
};
