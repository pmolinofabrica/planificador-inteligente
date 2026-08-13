// Cloudflare Pages Function: /api/marcar-ingreso
// Verifica el token de Cloudflare Turnstile (anti-bots) y reenvía el check-in
// al RPC rpc_marcar_ingreso de Supabase con la anon key.
//
// Env vars (Cloudflare Pages > Settings > Environment variables):
//   TURNSTILE_SECRET_KEY   clave secreta del sitio de Turnstile
//   SUPABASE_URL           https://zgzqeusbpobrwanvktyz.supabase.co
//   SUPABASE_ANON_KEY      la publishable/anon key del proyecto

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'body_invalido' }, 400);
  }

  const { fecha, id_agente, codigo, turnstile_token } = body || {};

  if (!env.TURNSTILE_SECRET_KEY) {
    return json({ error: 'server_no_configurado' }, 500);
  }
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return json({ error: 'server_no_configurado' }, 500);
  }
  if (!turnstile_token) {
    return json({ error: 'verificacion_requerida' }, 400);
  }

  // Validar Turnstile contra el endpoint oficial de Cloudflare
  const form = new FormData();
  form.append('secret', env.TURNSTILE_SECRET_KEY);
  form.append('response', turnstile_token);
  form.append('remoteip', request.headers.get('CF-Connecting-IP') || '');

  let verifyResult;
  try {
    const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
    });
    verifyResult = await verify.json();
  } catch (e) {
    return json({ error: 'verificacion_error', detalle: String(e) }, 502);
  }

  if (!verifyResult.success) {
    return json({ error: 'verificacion_invalida' }, 400);
  }

  // Reenviar al RPC de Supabase (mismo contrato que llamaba el cliente antes)
  let rpc;
  try {
    rpc = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/rpc_marcar_ingreso`, {
      method: 'POST',
      headers: {
        apikey: env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_fecha: fecha,
        p_id_agente: id_agente,
        p_codigo: String(codigo || '').trim(),
      }),
    });
  } catch (e) {
    return json({ error: 'supabase_error', detalle: String(e) }, 502);
  }

  const data = await rpc.json();
  return new Response(JSON.stringify(data), {
    status: rpc.ok ? 200 : 502,
    headers: { 'Content-Type': 'application/json' },
  });
}

function json(payload, status) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
