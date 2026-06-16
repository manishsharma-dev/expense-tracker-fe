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

const backendWarmIntervalMs = 10 * 60 * 1000;
const enableRenderProxy429Workaround = process.env['ENABLE_RENDER_PROXY_429_WORKAROUND'] !== 'false';
let lastBackendWarmAt = 0;

const delay = (ms: number) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

const fetchWithTimeout = async (url: URL, init: RequestInit, timeoutMs: number) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
};

const isAuthOtpRequest = (req: express.Request) => {
  return req.method.toUpperCase() === 'POST' && req.path === '/auth/otp/request';
};

const readRequestBody = async (req: express.Request, hasBody: boolean): Promise<Buffer | undefined> => {
  if (!hasBody) return undefined;

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as ArrayBuffer));
  }

  return Buffer.concat(chunks);
};

const isUnmarkedBackend429 = (response: Response) => {
  return response.status === 429
    && !response.headers.get('x-ratelimit-limiter')
    && !response.headers.get('x-xpense-429-source');
};

const getProxy429Source = (response: Response) => {
  const backendSource = response.headers.get('x-xpense-429-source');
  if (backendSource) return backendSource;
  if (isUnmarkedBackend429(response)) return 'fe-proxy-unmarked-backend-429';
  return 'unknown-429-source';
};

const getResponseBodyPreview = async (response: Response, maxLength = 500) => {
  try {
    const body = await response.clone().text();
    return body.length > maxLength ? `${body.slice(0, maxLength)}...` : body;
  } catch (error) {
    return `Unable to read response body: ${error instanceof Error ? error.message : String(error)}`;
  }
};

// RENDER WORKAROUND START
// Render free instances can occasionally return an edge/platform 429 while a
// sleeping backend wakes up. Those responses do not include our backend limiter
// headers, so keep this behavior isolated and removable for other cloud hosts.
const fetchBackendWithRenderProxy429Workaround = async ({
  req,
  headers,
  targetUrl,
  requestInit,
  clientIp,
}: {
  req: express.Request;
  headers: Headers;
  targetUrl: URL;
  requestInit: RequestInit & { duplex?: 'half' };
  clientIp: string;
}) => {
  if (!enableRenderProxy429Workaround) {
    return fetch(targetUrl, requestInit);
  }

  if (isAuthOtpRequest(req) && Date.now() - lastBackendWarmAt >= backendWarmIntervalMs) {
    const healthUrl = new URL(`${backendApiBaseUrl}/health`);
    const maxWarmAttempts = 6;

    for (let attempt = 1; attempt <= maxWarmAttempts; attempt += 1) {
      try {
        const response = await fetchWithTimeout(healthUrl, {
          method: 'GET',
          headers,
        }, 10000);

        if (response.status !== 429) {
          lastBackendWarmAt = Date.now();
          console.log('FE proxy backend warm-up completed', JSON.stringify({
            attempt,
            status: response.status,
            healthUrl: healthUrl.toString(),
          }));
          break;
        }

        console.warn('FE proxy backend warm-up received 429', JSON.stringify({
          attempt,
          maxWarmAttempts,
          status: response.status,
          healthUrl: healthUrl.toString(),
          backendLimiter: response.headers.get('x-ratelimit-limiter'),
          backend429Source: response.headers.get('x-xpense-429-source'),
          responseBody: await getResponseBodyPreview(response),
        }));
      } catch (error) {
        console.warn('FE proxy backend warm-up failed', JSON.stringify({
          attempt,
          maxWarmAttempts,
          healthUrl: healthUrl.toString(),
          error: error instanceof Error ? error.message : String(error),
        }));
      }

      if (attempt < maxWarmAttempts) {
        await delay(Math.min(attempt * 3000, 12000));
      }
    }
  }

  const maxAttempts = isAuthOtpRequest(req) ? 6 : 1;
  let proxyResponse: Response | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    proxyResponse = await fetch(targetUrl, requestInit);

    if (!isUnmarkedBackend429(proxyResponse) || attempt === maxAttempts) break;

    console.warn('FE proxy retrying unmarked backend 429', JSON.stringify({
      attempt,
      nextAttempt: attempt + 1,
      method: req.method,
      originalUrl: req.originalUrl,
      targetUrl: targetUrl.toString(),
      clientIp,
      xForwardedFor: req.get('x-forwarded-for'),
      userAgent: req.get('user-agent'),
      responseBody: await getResponseBodyPreview(proxyResponse),
    }));

    await proxyResponse.arrayBuffer();
    await delay(Math.min(attempt * 2500, 10000));
  }

  if (!proxyResponse) {
    throw new Error('No proxy response received');
  }

  return proxyResponse;
};
// RENDER WORKAROUND END

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
  let targetUrl: URL | undefined;

  try {
    targetUrl = new URL(`${backendApiBaseUrl}${req.url}`);
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
    const requestBody = await readRequestBody(req, hasBody);
    const proxyResponse = await fetchBackendWithRenderProxy429Workaround({
      req,
      headers,
      targetUrl,
      clientIp,
      requestInit: {
        method: req.method,
        headers,
        body: requestBody,
        duplex: hasBody ? 'half' : undefined,
      } as RequestInit & { duplex?: 'half' },
    });

    res.status(proxyResponse.status);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Xpense-Proxy', 'fe-ssr-proxy');
    if (proxyResponse.status === 429) {
      res.setHeader('X-Xpense-429-Source', getProxy429Source(proxyResponse));
    }
    proxyResponse.headers.forEach((value, key) => {
      if (['content-encoding', 'set-cookie', 'transfer-encoding'].includes(key.toLowerCase())) return;
      res.setHeader(key, value);
    });

    if (proxyResponse.status === 429) {
      const proxy429Source = getProxy429Source(proxyResponse);
      console.warn('FE proxy received 429 from backend', JSON.stringify({
        method: req.method,
        originalUrl: req.originalUrl,
        targetUrl: targetUrl.toString(),
        clientIp,
        xForwardedFor: req.get('x-forwarded-for'),
        backendLimiter: proxyResponse.headers.get('x-ratelimit-limiter'),
        backend429Source: proxyResponse.headers.get('x-xpense-429-source'),
        proxy429Source,
        responseBody: await getResponseBodyPreview(proxyResponse),
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
    console.error('FE proxy request failed', JSON.stringify({
      method: req.method,
      originalUrl: req.originalUrl,
      targetUrl: targetUrl?.toString(),
      clientIp: req.ip || req.socket.remoteAddress || '',
      xForwardedFor: req.get('x-forwarded-for'),
      userAgent: req.get('user-agent'),
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }));
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
