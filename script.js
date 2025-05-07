window.addEventListener("DOMContentLoaded", () => {
  // 1) Configurações
// URL do seu Worker
const RELAY_BASE = "https://copy-relay.cysneirostiago.workers.dev";
// Inicializa Supabase
const SUPABASE_URL     = "https://cqfvcproocsxfmfuoreh.supabase.co";
const SUPABASE_ANON    = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxZnZjcHJvb2NzeGZtZnVvcmVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NDQyNTEsImV4cCI6MjA2MjAyMDI1MX0.BafQl9JbqJSZmAPJIls5_v7uvYjB5xOBCA3QJoieLaQ";


  // 2) Inicializa Supabase
  const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON,
    {
      auth: {
        persistSession:    true,
        detectSessionInUrl: true,
        storage:           window.localStorage
      }
    }
  );

  // logo após criar supabaseClient…
  const stripe = Stripe("pk_test_51RLNd8EpJa8F4C8dyp805k62CIYzqNAFVtEYZN0fWSm7lxSqPxVzJN9M70KS6ppuxg36XXW85FC7mSseEKix5WJR00Xqg6uAwo");  // sua chave publicável

  // função genérica
  async function criarCheckout(plan) {
    btnSubTrader.disabled = btnSubEnterprise.disabled = true;
    const { data:{ session } } = await supabaseClient.auth.getSession();
    // 0) debug
    console.log("→ session:", session);
    console.log("→ HEADERS sent:", {
      apikey: session ? session.provider_token : null,
      Authorization: session ? `Bearer ${session.access_token}` : null
    });
    // 0) debug
    if (!session) {
      alert("Faça login antes!");
      btnSubTrader.disabled = btnSubEnterprise.disabled = false;
      return;
    }
    // 1) chama o Worker
    const r = await fetch(`${RELAY_BASE}/create-checkout`, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ plan })
    });
    if (!r.ok) {
      const err = await r.text();
      alert("Erro ao iniciar checkout: " + err);
      btnSubTrader.disabled = btnSubEnterprise.disabled = false;
      return;
    }
    const { sessionId, url } = await r.json();
    // 2) redireciona para Stripe
    if (url) {
      window.location.href = url;
    } else {
      await stripe.redirectToCheckout({ sessionId });
    }
  }

  // 3) Referências DOM
  const btnLogin     = document.getElementById("btn-login");
  const btnSignup    = document.getElementById("btn-signup");
  const btnLogout    = document.getElementById("btn-logout");
  const modalLogin   = document.getElementById("modal-login");
  const modalSignup  = document.getElementById("modal-signup");
  const formLogin    = document.getElementById("form-login");
  const formSignup   = document.getElementById("form-signup");
  const btnGoogle    = document.getElementById("btn-google-login");

  const app       = document.getElementById("app");
  const freeSec   = document.getElementById("free-section");
  const paidSec   = document.getElementById("paid-section");
  const btnGenFree    = document.getElementById("btn-gen-free");
  const preFreeKey   = document.getElementById("free-key");
  const elPaidKey = document.getElementById("paid-key");
  const listAccts = document.getElementById("accounts-list");
  const inpNew    = document.getElementById("new-login");
  const btnAdd    = document.getElementById("btn-add-login");
  
  const subSec          = document.getElementById("sub-section");
  const btnSubTrader    = document.getElementById("btn-sub-trader");
  const btnSubEnterprise= document.getElementById("btn-sub-enterprise");
  const btnCancelSub = document.getElementById("btn-cancel-sub");

  
  // associações
  btnSubTrader.onclick     = () => criarCheckout("TRADER");
  btnSubEnterprise.onclick = () => criarCheckout("ENTERPRISE");

  // 4) Abre/fecha modais
  btnLogin.onclick  = () => modalLogin.classList.remove("hidden");
  btnSignup.onclick = () => modalSignup.classList.remove("hidden");
  document.querySelectorAll(".close-modal").forEach(b =>
    b.onclick = () => {
      modalLogin .classList.add("hidden");
      modalSignup.classList.add("hidden");
    }
  );

  // 5) Formulário email/senha
  formLogin.onsubmit = async e => {
    e.preventDefault();
    const email = formLogin["login-email"].value;
    const pass  = formLogin["login-pass"].value;
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password: pass });
    if (error) return alert("Erro ao entrar: " + error.message);
    modalLogin.classList.add("hidden");
  };

  formSignup.onsubmit = async e => {
    e.preventDefault();
    const email = formSignup["signup-email"].value;
    const pass  = formSignup["signup-pass"].value;
    const { error } = await supabaseClient.auth.signUp({ email, password: pass });
    if (error) return alert("Erro ao cadastrar: " + error.message);
    alert("Usuário criado! Já pode fazer login.");
    modalSignup.classList.add("hidden");
  };

  // 6) OAuth Google
  btnGoogle.onclick = () => {
    supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin }
    });
  };

  // 7) Logout
  btnLogout.onclick = async () => {
    await supabaseClient.auth.signOut();
    updateUI();
  };

  // 8) Listener de sessão + limpeza de hash
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    updateUI();
    if (window.location.hash.includes("access_token")) {
      history.replaceState({}, "", window.location.pathname);
    }
  });

  // 9) Geração de FreeKey via Worker
  btnGenFree.onclick = async () => {
    btnGenFree.disabled     = true;
    preFreeKey.textContent   = "Carregando…";
  
    // garante que o user está logado
    const { data:{ session } } = await supabaseClient.auth.getSession();
    if (!session) {
      preFreeKey.textContent = "Faça login primeiro!";
      btnGenFree.disabled     = false;
      return;
    }
    const userId = session.user.id;
  
    // 1) Verifica se já há FREE
    const { data: existing, error: err0 } = await supabaseClient
      .from("licenses")
      .select("key")
      .eq("user_id", userId)
      .eq("plan", "FREE");
  
    if (err0) {
      console.error(err0);
      preFreeKey.textContent = "Erro ❌";
      btnGenFree.disabled     = false;
      return;
    }
    if (existing.length > 0) {
      preFreeKey.textContent = existing[0].key;
      btnGenFree.disabled     = false;
      return;
    }
  
    // 2) Cria nova FREE
    const newKey = "MK" + crypto.randomUUID().slice(0,6).toUpperCase();
    const { data, error: err1 } = await supabaseClient
      .from("licenses")
      .insert({ key:newKey, user_id:userId, plan:"FREE" })
      .select()
      .single();
  
    if (err1) {
      console.error(err1);
      preFreeKey.textContent = "Erro ❌";
    } else {
      preFreeKey.textContent = data.key;
    }
    btnGenFree.disabled = false;
  };
  
  

  // 10) Update UI
  async function updateUI() {
    // 1) Resgata sessão
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
      // não logado
      btnLogin.hidden  = false;
      btnSignup.hidden = false;
      btnLogout.hidden = true;
      app.hidden       = true;
      return;
    }
    // está logado
    btnLogin.hidden  = true;
    btnSignup.hidden = true;
    btnLogout.hidden = false;
    app.hidden       = false;

    const userId = session.user.id;

    // 2) Exibe sempre as seções
    subSec.hidden   = false;
    freeSec.hidden  = false;

    // 3) Busca licenças TRADER e ENTERPRISE (qualquer status)
    let { data: lics } = await supabaseClient
      .from("licenses")
      .select("key,plan,status")
      .eq("user_id", userId)
      .in("plan", ["TRADER","ENTERPRISE"]);

    // 4) Filtra somente as licenças ativas
    const active = lics.filter(l => l.status === "active");
    const hasTrader     = active.some(l => l.plan === "TRADER");
    const hasEnterprise = active.some(l => l.plan === "ENTERPRISE");
    const hasPaid       = hasTrader || hasEnterprise;

    // 5) Esconde/exibe botões de assinatura
    btnSubTrader.hidden     = hasTrader || hasEnterprise;
    btnSubEnterprise.hidden = hasEnterprise;

    // 6) Seção paga e cancelamento
    paidSec.hidden      = !hasPaid;
    btnCancelSub.hidden = !hasPaid;

    // 7) Exibe MasterKey e contas se houver pagamento ativo
    if (hasPaid) {
      // prioriza Enterprise se existir
      // escolhe na ordem: ENTERPRISE → TRADER → qualquer outra (por fim, FREE)
      const lic = licJs.find(l=>l.plan==="ENTERPRISE")
      || licJs.find(l=>l.plan==="TRADER")
      || licJs[0];

      elPaidKey.textContent = lic.key;

      // lista contas autorizadas
      let { data: accts } = await supabaseClient
        .from("accounts")
        .select("login")
        .eq("license_key", lic.key);
      listAccts.innerHTML = accts.map(a => `<li>${a.login}</li>`).join("");

      // adicionar conta
      btnAdd.onclick = async () => {
        const login = Number(inpNew.value);
        if (!login) return alert("Informe um número válido");
        await supabaseClient
          .from("accounts")
          .insert({ license_key: lic.key, login });
        updateUI();
      };

      // cancelar assinatura
      btnCancelSub.onclick = async () => {
        if (!confirm(
          "Tem certeza de que deseja cancelar sua assinatura?\n" +
          "Isso encerrará imediatamente o plano e marcará sua licença como 'canceled'."
        )) return;
        btnCancelSub.disabled = true;
        const { data:{ session } } = await supabaseClient.auth.getSession();
        const r = await fetch(`${RELAY_BASE}/cancel-subscription`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${session.access_token}` }
        });
        if (!r.ok) {
          alert("Erro ao cancelar: " + await r.text());
          btnCancelSub.disabled = false;
          return;
        }
        alert("Assinatura cancelada!");
        updateUI();
      };
    } else {
      // limpa caso não tenha licença ativa
      elPaidKey.textContent = "";
      listAccts.innerHTML   = "";
    }
  }

// no carregamento inicial
updateUI();

});
