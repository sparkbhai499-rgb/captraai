/* Lovable AI Agent embeddable widget
   Usage on any website:
   <script src="https://w8sap.lovable.app/agent-widget.js"
           data-agent-id="YOUR_AGENT_ID"
           data-endpoint="https://neepudqcscfdtjjinogu.supabase.co/functions/v1/agent-chat"
           data-title="AI Assistant"
           data-color="#10b981"
           data-greeting="Hi! How can I help?"></script>
*/
(function () {
  var s = document.currentScript;
  if (!s) return;
  var AGENT_ID = s.getAttribute("data-agent-id");
  var ENDPOINT = s.getAttribute("data-endpoint");
  var TITLE = s.getAttribute("data-title") || "AI Assistant";
  var COLOR = s.getAttribute("data-color") || "#10b981";
  var GREETING = s.getAttribute("data-greeting") || "Hi! How can I help you?";
  if (!AGENT_ID || !ENDPOINT) { console.error("agent-widget: data-agent-id and data-endpoint required"); return; }

  var VID_KEY = "lv_agent_vid_" + AGENT_ID;
  var visitorId = localStorage.getItem(VID_KEY);
  if (!visitorId) { visitorId = "v_" + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem(VID_KEY, visitorId); }
  var convId = null;
  var messages = [{ role: "assistant", content: GREETING }];

  var css = '\
    .lvw-fab{position:fixed;bottom:20px;right:20px;width:60px;height:60px;border-radius:50%;background:'+COLOR+';color:#fff;border:none;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.2);font-size:28px;z-index:999999;display:flex;align-items:center;justify-content:center}\
    .lvw-panel{position:fixed;bottom:90px;right:20px;width:360px;max-width:calc(100vw - 40px);height:520px;max-height:calc(100vh - 120px);background:#fff;border-radius:14px;box-shadow:0 10px 40px rgba(0,0,0,.25);display:none;flex-direction:column;overflow:hidden;z-index:999999;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif}\
    .lvw-panel.lvw-open{display:flex}\
    .lvw-head{background:'+COLOR+';color:#fff;padding:14px 16px;font-weight:600;display:flex;justify-content:space-between;align-items:center}\
    .lvw-close{background:transparent;border:none;color:#fff;font-size:22px;cursor:pointer;line-height:1}\
    .lvw-msgs{flex:1;overflow-y:auto;padding:12px;background:#f5f7fa;display:flex;flex-direction:column;gap:8px}\
    .lvw-msg{max-width:80%;padding:8px 12px;border-radius:14px;font-size:14px;line-height:1.4;white-space:pre-wrap;word-wrap:break-word}\
    .lvw-msg.u{background:'+COLOR+';color:#fff;align-self:flex-end;border-bottom-right-radius:4px}\
    .lvw-msg.a{background:#fff;color:#111;align-self:flex-start;border:1px solid #e5e7eb;border-bottom-left-radius:4px}\
    .lvw-typing{font-size:12px;color:#888;padding:0 12px 6px}\
    .lvw-form{display:flex;border-top:1px solid #e5e7eb;padding:8px;gap:6px;background:#fff}\
    .lvw-input{flex:1;border:1px solid #e5e7eb;border-radius:20px;padding:8px 14px;font-size:14px;outline:none}\
    .lvw-input:focus{border-color:'+COLOR+'}\
    .lvw-send{background:'+COLOR+';color:#fff;border:none;border-radius:50%;width:36px;height:36px;cursor:pointer;font-size:16px}\
    .lvw-send:disabled{opacity:.5;cursor:not-allowed}';
  var style = document.createElement("style"); style.textContent = css; document.head.appendChild(style);

  var fab = document.createElement("button"); fab.className = "lvw-fab"; fab.innerHTML = "💬"; fab.setAttribute("aria-label", "Open chat");
  var panel = document.createElement("div"); panel.className = "lvw-panel";
  panel.innerHTML = '\
    <div class="lvw-head"><span>'+TITLE+'</span><button class="lvw-close" aria-label="Close">×</button></div>\
    <div class="lvw-msgs"></div>\
    <div class="lvw-typing" style="display:none">typing…</div>\
    <form class="lvw-form"><input class="lvw-input" placeholder="Type a message..." autocomplete="off"/><button class="lvw-send" type="submit">➤</button></form>';
  document.body.appendChild(fab); document.body.appendChild(panel);

  var msgsEl = panel.querySelector(".lvw-msgs");
  var typing = panel.querySelector(".lvw-typing");
  var form = panel.querySelector(".lvw-form");
  var input = panel.querySelector(".lvw-input");
  var sendBtn = panel.querySelector(".lvw-send");

  function render() {
    msgsEl.innerHTML = "";
    messages.forEach(function (m) {
      var d = document.createElement("div");
      d.className = "lvw-msg " + (m.role === "user" ? "u" : "a");
      d.textContent = m.content;
      msgsEl.appendChild(d);
    });
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }
  render();

  fab.onclick = function () { panel.classList.toggle("lvw-open"); if (panel.classList.contains("lvw-open")) input.focus(); };
  panel.querySelector(".lvw-close").onclick = function () { panel.classList.remove("lvw-open"); };

  form.onsubmit = function (e) {
    e.preventDefault();
    var text = input.value.trim(); if (!text) return;
    messages.push({ role: "user", content: text });
    input.value = ""; render();
    typing.style.display = "block"; sendBtn.disabled = true;
    fetch(ENDPOINT, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agent_id: AGENT_ID, message: text, conversation_id: convId, visitor_id: visitorId, origin: location.origin })
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        typing.style.display = "none"; sendBtn.disabled = false;
        if (!res.ok) { messages.push({ role: "assistant", content: "⚠️ " + (res.j.error || "Error") }); render(); return; }
        convId = res.j.conversation_id;
        messages.push({ role: "assistant", content: res.j.reply }); render();
      })
      .catch(function (err) {
        typing.style.display = "none"; sendBtn.disabled = false;
        messages.push({ role: "assistant", content: "⚠️ Network error" }); render();
        console.error(err);
      });
  };
})();
