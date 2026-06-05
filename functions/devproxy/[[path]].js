const TARGET_BASE = 'https://run-lb.tanmasports.com/v1';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  };
}

function copyHeaders(headers) {
  const nextHeaders = new Headers(headers);
  nextHeaders.delete('host');
  nextHeaders.delete('connection');
  nextHeaders.delete('content-length');
  return nextHeaders;
}

export async function onRequest({ request }) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  const incomingUrl = new URL(request.url);
  const proxyPath = incomingUrl.pathname.replace(/^\/devproxy/, '') || '/';
  const targetUrl = `${TARGET_BASE}${proxyPath}${incomingUrl.search}`;
  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';

  try {
    const upstream = await fetch(targetUrl, {
      method: request.method,
      headers: copyHeaders(request.headers),
      body: hasBody ? request.body : undefined,
    });

    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.delete('content-encoding');
    responseHeaders.delete('content-length');
    responseHeaders.delete('transfer-encoding');

    Object.entries(corsHeaders()).forEach(([key, value]) => {
      responseHeaders.set(key, value);
    });

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    return Response.json(
      { error: 'Proxy request failed', message: error.message },
      { status: 502, headers: corsHeaders() },
    );
  }
}
