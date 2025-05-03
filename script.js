// 1) defina a base do seu Worker
const WORKER_BASE = "https://copy-relay.cysneirostiago.workers.dev";

document.getElementById("gen").addEventListener("click", async () => {
  const btn = document.getElementById("gen");
  const out = document.getElementById("out");
  btn.disabled = true;
  out.textContent = "Gerando…";

  try {
    // 2) chame o endpoint correto do Worker
    const r = await fetch(`${WORKER_BASE}/register`, { method: "POST" });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const { master_key } = await r.json();
    out.textContent = "Sua MasterKey: " + master_key;
  } catch (err) {
    console.error(err);
    out.textContent = "Erro ao gerar 😢";
  } finally {
    btn.disabled = false;
  }
});
