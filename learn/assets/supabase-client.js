// MYCP Classroom — Supabase client + shared auth helpers.
// Loaded after the Supabase JS CDN script on every /learn/ page.
// The publishable key is safe to expose client-side — RLS on every
// table is what actually enforces access, not this key.

const SUPABASE_URL = 'https://xzxqdshpqmjrggvhgzrp.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_vJm1PCFXUsCc_Dwpd0UH_A_iRdMUm1k';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function mycpGetSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  return session;
}

// Redirects to login if there's no session. Call at the top of any
// page that requires the visitor to be signed in. Returns the
// session, or null after issuing the redirect.
async function mycpRequireAuth() {
  const session = await mycpGetSession();
  if (!session) {
    const redirect = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/learn/login?redirect=${redirect}`;
    return null;
  }
  return session;
}

async function mycpGetProfile() {
  const session = await mycpGetSession();
  if (!session) return null;
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();
  if (error) {
    console.error('mycpGetProfile', error);
    return null;
  }
  return data;
}

async function mycpSignOut() {
  await supabaseClient.auth.signOut();
  window.location.href = '/learn/login';
}

function mycpShowAlert(el, message, type) {
  el.textContent = message;
  el.className = `alert alert--${type} visible`;
}

function mycpHideAlert(el) {
  el.className = 'alert';
}
