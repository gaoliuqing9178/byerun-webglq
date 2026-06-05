const TARGET_BASE = 'https://run-lb.tanmasports.com/v1';

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Credentials': 'true',
    'X-Byerun-Proxy': 'vercel-function',
  };
}

function upstreamHeaders(request) {
  const headers = new Headers();
  const passThrough = [
    'appkey',
    'content-type',
    'sign',
    'token',
    'user-agent',
  ];

  passThrough.forEach((key) => {
    const value = request.headers.get(key);
    if (value) headers.set(key, value);
  });

  return headers;
}

function responseHeaders(upstream, origin) {
  const headers = new Headers(upstream.headers);
  headers.delete('content-encoding');
  headers.delete('content-length');
  headers.delete('transfer-encoding');

  Object.entries(corsHeaders(origin)).forEach(([key, value]) => {
    headers.set(key, value);
  });

  return headers;
}

export default {
  async fetch(request) {
    const origin = request.headers.get('origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    const incomingUrl = new URL(request.url);
    const pathParam = incomingUrl.searchParams.get('path') || '';
    const proxyPath = `/${pathParam.replace(/^\/+/, '')}`;
    const targetUrl = new URL(`${TARGET_BASE}${proxyPath}`);

    incomingUrl.searchParams.forEach((value, key) => {
      if (key !== 'path') targetUrl.searchParams.append(key, value);
    });

    try {
      const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
      const body = hasBody ? await request.arrayBuffer() : undefined;
      const upstream = await fetch(targetUrl, {
        method: request.method,
        headers: upstreamHeaders(request),
        body,
      });

      return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: responseHeaders(upstream, origin),
      });
    } catch (error) {
      return Response.json(
        { error: 'Proxy request failed', message: error.message },
        { status: 502, headers: corsHeaders(origin) },
      );
    }
  },
};
