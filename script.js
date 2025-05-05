// Inicializa Supabase
const SUPABASE_URL     = "https://cqfvcproocsxfmfuoreh.supabase.co";
const SUPABASE_ANON    = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxZnZjcHJvb2NzeGZtZnVvcmVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NDQyNTEsImV4cCI6MjA2MjAyMDI1MX0.BafQl9JbqJSZmAPJIls5_v7uvYjB5xOBCA3QJoieLaQ";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
// URL do seu Worker
const RELAY_BASE = "https://copy-relay.cysneirostiago.workers.dev";


const btnLogin   = document.getElementById("btn-login");
const btnLogout  = document.getElementById("btn-logout");
const app        = document.getElementById("app");
const freeSec    = document.getElementById("free-section");
const paidSec    = document.getElementById("paid-section");
const btnGenFree = document.getElementById("btn-gen-free");
const preFreeKey = document.getElementById("free-key");
const elPaidKey  = document.getElementById("paid-key");
const listAccts  = document.getElementById("accounts-list");
const inpNew     = document.getElementById("new-login");
const btnAdd     = document.getElementById("btn-add-login");

async function updateUI() {
  const { data:{ session } } = await supabaseClient.auth.getSession();
  if (!session) {
    // não logado
    btnLogin.hidden  = false;
    btnLogout.hidden = true;
    app.hidden       = true;
    return;
  }

  // usuário logado
  btnLogin.hidden  = true;
  btnLogout.hidden = false;
  app.hidden       = false;

  const userId = session.user.id;

  // 1) BUSCA LICENÇA PAGA (TRADER ou ENT)
  let { data:lics } = await supabaseClient
    .from("licenses")
    .select("key,plan")
    .eq("user_id", userId)
    .eq("plan", "TRADER");  // ou ajuste pra ENT se quiser

  // 2) FREE SECTION: mostra SEMPRE
  freeSec.hidden = false;

  // 3) PAID SECTION: só mostra quando há licença Trader
  const hasPaid = lics.length > 0;
  paidSec.hidden = !hasPaid;

  // --- se for free-only, limpa a área paid ---
  if (!hasPaid) {
    preFreeKey.textContent = "";  // ou deixe como está
  } else {
    // mostrou paidSec: exibe MasterKey e lista contas
    const lic = lics[0];
    elPaidKey.textContent = lic.key;

    // lista contas MT4
    let { data:accts } = await supabaseClient
      .from("accounts")
      .select("login")
      .eq("license_key", lic.key);
    listAccts.innerHTML = accts.map(a => `<li>${a.login}</li>`).join("");

    // botão “Adicionar Conta”
    btnAdd.onclick = async () => {
      const login = Number(inpNew.value);
      if (!login) return alert("Informe um número válido");
      // usa supabaseClient, não supabase
      const { error } = await supabaseClient
        .from("accounts")
        .insert({ license_key: lic.key, login });
      if (error) return console.error(error);
      // recarrega lista
      updateUI();
    };
  }

  // 4) botão free: não mexe, o usuário clica se quiser
}


btnLogin.onclick = () => {
  supabaseClient.auth.signInWithOAuth({
    provider: "google",
    options: {
      // garante que o redirect volte para a sua Pages
      redirectTo: window.location.origin
    }
  });
};

btnLogout.onclick = async () => {
  await supabaseClient.auth.signOut();
  updateUI();
};

btnGenFree.onclick = async () => {
  btnGenFree.disabled = true;
  preFreeKey.textContent = "Carregando…";

  // 1) obtem token do Supabase
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    preFreeKey.textContent = "Faça login primeiro!";
    btnGenFree.disabled = false;
    return;
  }
  const token = session.access_token;

  // 2) chama o Worker
  const r = await fetch(`${RELAY_BASE}/registerfree`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  });

  if (!r.ok) {
    preFreeKey.textContent = "Erro 😢";
  } else {
    const { master_key } = await r.json();
    preFreeKey.textContent = master_key;
  }
  btnGenFree.disabled = false;
};

supabaseClient.auth.onAuthStateChange(updateUI);
updateUI();
