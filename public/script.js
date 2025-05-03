const WORKER_BASE = "https://copy-relay.cysneirostiago.workers.dev";

document.getElementById("gen").addEventListener("click", async () => {
  const btn = document.getElementById("gen");
  const out = document.getElementById("out");
  btn.disabled = true;
  out.textContent = "Gerando…";

  // chamada ao Worker
  const r = await fetch(WORKER_BASE + "/register", { method: "POST" });
  if (!r.ok) {
    out.textContent = "Erro 😢";
    btn.disabled = false;
    return;
  }

  const { master_key } = await r.json();
  out.textContent = "Sua MasterKey: " + master_key;
  btn.disabled = false;
});