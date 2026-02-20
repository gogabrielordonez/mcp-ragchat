/**
 * Chat widget HTML generator.
 *
 * Generates a self-contained <script> tag that creates
 * a floating chat bubble + window on any webpage.
 */

export function generateWidget(
  chatUrl: string,
  options: {
    domain?: string;
    title?: string;
    accentColor?: string;
    position?: "right" | "left";
  } = {},
): string {
  const {
    title = "Chat with us",
    accentColor = "#22c55e",
    position = "right",
  } = options;

  const posStyle =
    position === "left"
      ? "left:24px"
      : "right:24px";

  const winPosStyle =
    position === "left"
      ? "left:24px"
      : "right:24px";

  return `<script>
(function() {
  var API = "${chatUrl}";

  var b = document.createElement("div");
  b.innerHTML = "\\u{1F4AC}";
  b.style.cssText = "position:fixed;bottom:24px;${posStyle};width:56px;height:56px;border-radius:50%;background:${accentColor};color:white;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:24px;box-shadow:0 4px 12px rgba(0,0,0,0.3);z-index:9999;transition:transform 0.2s";
  b.onmouseenter = function() { b.style.transform = "scale(1.1)"; };
  b.onmouseleave = function() { b.style.transform = "scale(1)"; };

  var w = document.createElement("div");
  w.style.cssText = "display:none;position:fixed;bottom:90px;${winPosStyle};width:380px;max-height:500px;background:#1a1a1e;border:1px solid #2a2a2e;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.5);z-index:9999;overflow:hidden;flex-direction:column";
  w.innerHTML = '<div style="padding:16px;border-bottom:1px solid #2a2a2e;display:flex;justify-content:space-between;align-items:center"><span style="color:white;font-weight:600">${title}</span><button id="rc-close" style="background:none;border:none;color:#888;cursor:pointer;font-size:18px">\\u2715</button></div><div id="rc-msgs" style="flex:1;overflow-y:auto;padding:16px;min-height:300px"></div><div style="padding:12px;border-top:1px solid #2a2a2e;display:flex;gap:8px"><input id="rc-in" type="text" placeholder="Ask anything..." style="flex:1;background:#0a0a0c;border:1px solid #2a2a2e;border-radius:8px;padding:8px 12px;color:white;outline:none" /><button id="rc-send" style="background:${accentColor};border:none;border-radius:8px;padding:8px 16px;color:white;cursor:pointer;font-weight:600">Send</button></div>';

  document.body.appendChild(b);
  document.body.appendChild(w);

  var h = [];

  b.onclick = function() { w.style.display = w.style.display === "none" ? "flex" : "none"; };
  document.getElementById("rc-close").onclick = function() { w.style.display = "none"; };

  function add(role, text) {
    var m = document.getElementById("rc-msgs");
    var d = document.createElement("div");
    d.style.cssText = "margin-bottom:12px;padding:10px 14px;border-radius:12px;max-width:85%;" + (role === "user" ? "margin-left:auto;background:${accentColor};color:white" : "background:#2a2a2e;color:#e0e0e0");
    d.textContent = text;
    m.appendChild(d);
    m.scrollTop = m.scrollHeight;
  }

  async function send() {
    var i = document.getElementById("rc-in");
    var msg = i.value.trim();
    if (!msg) return;
    i.value = "";
    add("user", msg);
    h.push({ role: "user", text: msg });
    try {
      var r = await fetch(API + "/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, history: h })
      });
      var d = await r.json();
      add("assistant", d.reply);
      h.push({ role: "assistant", text: d.reply });
    } catch(e) {
      add("assistant", "Sorry, something went wrong.");
    }
  }

  document.getElementById("rc-send").onclick = send;
  document.getElementById("rc-in").onkeydown = function(e) { if (e.key === "Enter") send(); };
})();
</script>`;
}
