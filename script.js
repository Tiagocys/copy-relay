// Inicializa Supabase
const SUPABASE_URL     = "<sua-SUPABASE_URL>";
const SUPABASE_ANON    = "<sua-SUPABASE_ANON_KEY>";
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

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
  const { data: { session } } = await supabase.auth.getSession();
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
  let { data: lics } = await supabase
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
    const { data: accts } = await supabase
      .from("accounts")
      .select("login")
      .eq("license_key", lic.key);
    listAccts.innerHTML = accts.map(a => `<li>${a.login}</li>`).join("");

    btnAdd.onclick = async () => {
      const login = Number(inpNew.value);
      await supabase
        .from("accounts")
        .insert({ license_key: lic.key, login });
      updateUI(); // recarrega lista
    };
  }
}

btnLogin.onclick = () => {
  supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      // garante que o redirect volte para a sua Pages
      redirectTo: window.location.origin
    }
  });
};

btnLogout.onclick = async () => {
  await supabase.auth.signOut();
  updateUI();
};

btnGenFree.onclick = async () => {
  const r = await fetch("/register", { method: "POST" });
  const { master_key } = await r.json();
  preFreeKey.textContent = master_key;
};

supabase.auth.onAuthStateChange(updateUI);
updateUI();
