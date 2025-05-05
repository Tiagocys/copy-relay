// URL do seu Worker
const RELAY_BASE = "https://copy-relay.cysneirostiago.workers.dev";
// Inicializa Supabase
const SUPABASE_URL     = "https://cqfvcproocsxfmfuoreh.supabase.co";
const SUPABASE_ANON    = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxZnZjcHJvb2NzeGZtZnVvcmVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NDQyNTEsImV4cCI6MjA2MjAyMDI1MX0.BafQl9JbqJSZmAPJIls5_v7uvYjB5xOBCA3QJoieLaQ";
const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON,
  {
    auth: {
      persistSession:   true,
      detectSessionInUrl: true,
      storage: window.localStorage
    }
  }
);
// debug rápido
async function testeAuth() {
  const { error: e1 } = await supabaseClient.auth.signUp({ email:"teste@supabase.io", password:"teste123" });
  console.log("signup error?", e1);
  const { error: e2 } = await supabaseClient.auth.signInWithPassword({ email:"teste@supabase.io", password:"teste123" });
  console.log("signin error?", e2);
}

testeAuth();


// dispara sempre que a sessão mudar (login, logout, refresh, retorno do OAuth)
supabaseClient.auth.onAuthStateChange((_event, session) => {
  updateUI();
});

const app        = document.getElementById("app");
const freeSec    = document.getElementById("free-section");
const paidSec    = document.getElementById("paid-section");
const btnGenFree = document.getElementById("btn-gen-free");
const preFreeKey = document.getElementById("free-key");
const elPaidKey  = document.getElementById("paid-key");
const listAccts  = document.getElementById("accounts-list");
const inpNew     = document.getElementById("new-login");
const btnAdd     = document.getElementById("btn-add-login");

// elementos de modal
const modalLogin  = document.getElementById("modal-login");
const modalSignup = document.getElementById("modal-signup");
const btnLogin    = document.getElementById("btn-login");
const btnSignup   = document.getElementById("btn-signup");
const btnLogout   = document.getElementById("btn-logout");

btnLogin.onclick = ()  => modalLogin.classList.remove("hidden");
btnSignup.onclick = () => modalSignup.classList.remove("hidden");
for (let btn of document.querySelectorAll(".close-modal"))
  btn.onclick = () => { modalLogin.classList.add("hidden"); modalSignup.classList.add("hidden"); };

// formulário de login email/senha
document.getElementById("form-login").onsubmit = async e => {
  e.preventDefault();
  const email = document.getElementById("login-email").value;
  const pass  = document.getElementById("login-pass").value;
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password: pass });
  if (error) return alert("Erro ao entrar: " + error.message);
  modalLogin.classList.add("hidden");
};

// formulário de cadastro
document.getElementById("form-signup").onsubmit = async e => {
  e.preventDefault();
  const email = document.getElementById("signup-email").value;
  const pass  = document.getElementById("signup-pass").value;
  const { error } = await supabaseClient.auth.signUp({ email, password: pass });
  if (error) return alert("Erro ao cadastrar: " + error.message);
  alert("Verifique seu email (se habilitado) ou já faça login.");
  modalSignup.classList.add("hidden");
};

// botão Google dentro do modal de login
document.getElementById("btn-google-login").onclick = () => {
  supabaseClient.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin }
  });
};

// logout
btnLogout.onclick = async () => {
  await supabaseClient.auth.signOut();
  updateUI();
};


async function updateUI() {
  const { data:{ session } } = await supabaseClient.auth.getSession();
  if (!session) {
    // não logado
    btnLogin.hidden  = false;
    btnSignup.hidden = false;
    btnLogout.hidden = true;
    app.hidden       = true;
    return;
  }

  // usuário logado
  btnLogin.hidden  = true;
  btnSignup.hidden = true;
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

// Depois de extrair a sessão, limpe o hash da URL
if (window.location.hash.includes("access_token")) {
  history.replaceState({}, "", window.location.pathname);
}


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