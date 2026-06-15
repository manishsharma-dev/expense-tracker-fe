import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import { REQUEST } from '@angular/core';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
app.set('trust proxy', true);

const normalizeApiBaseUrl = (url: string) => {
  const trimmedUrl = url.replace(/\/+$/g, '');
  return trimmedUrl.endsWith('/api') ? `${trimmedUrl}/v1` : trimmedUrl;
};

const backendApiBaseUrl = normalizeApiBaseUrl(process.env['BACKEND_API_BASE_URL'] ?? process.env['API_BASE_URL'] ?? 'http://localhost:3000/api/v1');
const publicApiBaseUrl = process.env['PUBLIC_API_BASE_URL'] ?? '/api/v1';

const trustedProxyHeaders = [
  'x-forwarded-for',
  'x-forwarded-host',
  'x-forwarded-port',
  'x-forwarded-proto',
  'x-forwarded-scheme',
] as const;

const angularApp = new AngularNodeAppEngine({
  trustProxyHeaders: trustedProxyHeaders,
});

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

// ✅ Runtime config endpoint — reads from process.env, never baked into bundle
app.get('/api/config', (_req, res) => {
  res.json({
    apiBaseUrl: publicApiBaseUrl,
  });
});

app.use('/api/v1', async (req, res, next) => {
  try {
    const targetUrl = new URL(`${backendApiBaseUrl}${req.url}`);
    const headers = new Headers();

    Object.entries(req.headers).forEach(([key, value]) => {
      if (!value || ['host', 'connection', 'content-length'].includes(key.toLowerCase())) return;
      if (Array.isArray(value)) {
        value.forEach((item) => headers.append(key, item));
      } else {
        headers.set(key, value);
      }
    });

    const forwardedFor = req.get('x-forwarded-for');
    const clientIp = req.ip || req.socket.remoteAddress || '';
    headers.set('x-forwarded-for', forwardedFor ? `${forwardedFor}, ${clientIp}` : clientIp);
    headers.set('x-forwarded-host', req.get('host') ?? '');
    headers.set('x-forwarded-proto', req.protocol);

    const hasBody = !['GET', 'HEAD'].includes(req.method.toUpperCase());
    const proxyResponse = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: hasBody ? req as unknown as BodyInit : undefined,
      duplex: hasBody ? 'half' : undefined,
    } as RequestInit & { duplex?: 'half' });

    res.status(proxyResponse.status);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Xpense-Proxy', 'fe-ssr-proxy');
    proxyResponse.headers.forEach((value, key) => {
      if (['content-encoding', 'set-cookie', 'transfer-encoding'].includes(key.toLowerCase())) return;
      res.setHeader(key, value);
    });

    if (proxyResponse.status === 429) {
      console.warn('FE proxy received 429 from backend', JSON.stringify({
        method: req.method,
        originalUrl: req.originalUrl,
        targetUrl: targetUrl.toString(),
        clientIp,
        xForwardedFor: req.get('x-forwarded-for'),
        backendLimiter: proxyResponse.headers.get('x-ratelimit-limiter'),
        backend429Source: proxyResponse.headers.get('x-xpense-429-source'),
        userAgent: req.get('user-agent'),
      }));
    }

    const setCookie = (proxyResponse.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.();
    if (setCookie?.length) res.setHeader('set-cookie', setCookie);

    if (!proxyResponse.body) {
      res.end();
      return;
    }

    const body = await proxyResponse.arrayBuffer();
    res.send(Buffer.from(body));
  } catch (error) {
    next(error);
  }
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req, {
      providers: [
        {
          provide: REQUEST,
          useValue: req,
        },
      ],
    })
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
