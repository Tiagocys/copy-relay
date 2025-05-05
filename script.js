// Inicializa Supabase
const SUPABASE_URL     = "https://cqfvcproocsxfmfuoreh.supabase.co";
const SUPABASE_ANON    = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxZnZjcHJvb2NzeGZtZnVvcmVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NDQyNTEsImV4cCI6MjA2MjAyMDI1MX0.BafQl9JbqJSZmAPJIls5_v7uvYjB5xOBCA3QJoieLaQ";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

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
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    btnLogin.hidden = false;
    btnLogout.hidden = true;
    app.hidden = true;
    return;
  }
  btnLogin.hidden = true;
  btnLogout.hidden = false;
  app.hidden = false;

  // busca licença
  const userId = session.user.id;
  let { data: lics } = await supabaseClient
    .from("licenses")
    .select("key,plan")
    .eq("user_id", userId);

  if (lics.length === 0) {
    // usuário Free sem licença paga
    freeSec.hidden = false;
    paidSec.hidden = true;
  } else {
    // usuário Trader/Ent já tem licença
    freeSec.hidden = true;
    paidSec.hidden = false;
    const lic = lics[0];
    elPaidKey.textContent = lic.key;

    // lista contas autorizadas
    const { data: accts } = await supabaseClient
      .from("accounts")
      .select("login")
      .eq("license_key", lic.key);
    listAccts.innerHTML = accts.map(a => `<li>${a.login}</li>`).join("");

    btnAdd.onclick = async () => {
      const login = Number(inpNew.value);
      await supabaseClient
        .from("accounts")
        .insert({ license_key: lic.key, login });
      updateUI(); // recarrega lista
    };
  }
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
  const r = await fetch("/register", { method: "POST" });
  const { master_key } = await r.json();
  preFreeKey.textContent = master_key;
};

supabaseClient.auth.onAuthStateChange(updateUI);
updateUI();
