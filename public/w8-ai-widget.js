/* W8 AI embeddable chatbot widget
   Usage on ANY website — just paste this in your HTML:

   <script src="https://w8sap.lovable.app/w8-ai-widget.js"
           data-title="AI Assistant"
           data-color="#10b981"
           data-greeting="Hi! Main W8 AI hoon. Kuch bhi pucho!"></script>
*/
(function () {
  var s = document.currentScript;
  var TITLE = (s && s.getAttribute("data-title")) || "W8 AI";
  var COLOR = (s && s.getAttribute("data-color")) || "#10b981";
  var GREETING = (s && s.getAttribute("data-greeting")) || "Hi! Kuch bhi pucho 👋";
  var ENDPOINT = "https://neepudqcscfdtjjinogu.supabase.co/functions/v1/w8sap-ai";
  var ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lZXB1ZHFjc2NmZHRqamlub2d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MjIzMjEsImV4cCI6MjA5MDE5ODMyMX0.35j8M5_9raX4WfAiHmL1-kwiYwCmFN-yXhVuMNSpD_8";

  var messages = [{ role: "assistant", content: GREETING }];

  var css =
    '.w8ai-fab{position:fixed;bottom:20px;right:20px;width:60px;height:60px;border-radius:50%;background:' + COLOR + ';color:#fff;border:none;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.25);font-size:28px;z-index:2147483647;display:flex;align-items:center;justify-content:center}' +
    '.w8ai-panel{position:fixed;bottom:90px;right:20px;width:370px;max-width:calc(100vw - 40px);height:540px;max-height:calc(100vh - 120px);background:#fff;border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.25);display:none;flex-direction:column;overflow:hidden;z-index:2147483647;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif}' +
    '.w8ai-panel.open{display:flex}' +
    '.w8ai-head{background:' + COLOR + ';color:#fff;padding:14px 16px;font-weight:600;display:flex;justify-content:space-between;align-items:center;font-size:15px}' +
    '.w8ai-close{background:transparent;border:none;color:#fff;font-size:22px;cursor:pointer;line-height:1;padding:0 4px}' +
    '.w8ai-msgs{flex:1;overflow-y:auto;padding:14px;background:#f5f7fa;display:flex;flex-direction:column;gap:8px}' +
    '.w8ai-msg{max-width:82%;padding:9px 13px;border-radius:14px;font-size:14px;line-height:1.45;white-space:pre-wrap;word-wrap:break-word}' +
    '.w8ai-msg.u{background:' + COLOR + ';color:#fff;align-self:flex-end;border-bottom-right-radius:4px}' +
    '.w8ai-msg.a{background:#fff;color:#111;align-self:flex-start;border:1px solid #e5e7eb;border-bottom-left-radius:4px}' +
    '.w8ai-form{display:flex;border-top:1px solid #e5e7eb;padding:8px;gap:6px;background:#fff}' +
    '.w8ai-input{flex:1;border:1px solid #e5e7eb;border-radius:20px;padding:9px 14px;font-size:14px;outline:none;color:#111;background:#fff}' +
    '.w8ai-input:focus{border-color:' + COLOR + '}' +
    '.w8ai-send{background:' + COLOR + ';color:#fff;border:none;border-radius:50%;width:38px;height:38px;cursor:pointer;font-size:16px}' +
    '.w8ai-send:disabled{opacity:.5;cursor:not-allowed}';

  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  var fab = document.createElement("button");
  fab.className = "w8ai-fab";
  fab.innerHTML = "💬";
  fab.setAttribute("aria-label", "Open chat");

  var panel = document.createElement("div");
  panel.className = "w8ai-panel";
  panel.innerHTML =
    '<div class="w8ai-head"><span>' + TITLE + '</span><button class="w8ai-close" aria-label="Close">×</button></div>' +
    '<div class="w8ai-msgs"></div>' +
    '<form class="w8ai-form"><input class="w8ai-input" placeholder="Type a message..." autocomplete="off"/><button class="w8ai-send" type="submit">➤</button></form>';

  document.body.appendChild(fab);
  document.body.appendChild(panel);

  var msgsEl = panel.querySelector(".w8ai-msgs");
  var form = panel.querySelector(".w8ai-form");
  var input = panel.querySelector(".w8ai-input");
  var sendBtn = panel.querySelector(".w8ai-send");

  function render() {
    msgsEl.innerHTML = "";
    messages.forEach(function (m) {
      var d = document.createElement("div");
      d.className = "w8ai-msg " + (m.role === "user" ? "u" : "a");
      d.textContent = m.content;
      msgsEl.appendChild(d);
    });
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }
  render();

  fab.onclick = function () {
    panel.classList.toggle("open");
    if (panel.classList.contains("open")) input.focus();
  };
  panel.querySelector(".w8ai-close").onclick = function () {
    panel.classList.remove("open");
  };

  form.onsubmit = async function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text) return;
    messages.push({ role: "user", content: text });
    input.value = "";
    sendBtn.disabled = true;

    // placeholder assistant bubble for streaming
    messages.push({ role: "assistant", content: "" });
    render();
    var assistantIdx = messages.length - 1;

    try {
      var resp = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + ANON,
        },
        body: JSON.stringify({ messages: messages.slice(0, -1) }),
      });

      if (!resp.ok || !resp.body) {
        messages[assistantIdx].content =
          resp.status === 429 ? "⚠️ Bahut requests aa rahi. Thodi der baad try kariye."
          : resp.status === 402 ? "⚠️ AI credits khatam ho gaye."
          : "⚠️ Error: " + resp.status;
        render();
        sendBtn.disabled = false;
        return;
      }

      var reader = resp.body.getReader();
      var decoder = new TextDecoder();
      var buffer = "";
      var done = false;

      while (!done) {
        var r = await reader.read();
        if (r.done) break;
        buffer += decoder.decode(r.value, { stream: true });
        var nl;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          var line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line || line.startsWith(":") || !line.startsWith("data: ")) continue;
          var data = line.slice(6).trim();
          if (data === "[DONE]") { done = true; break; }
          try {
            var parsed = JSON.parse(data);
            var c = parsed.choices && parsed.choices[0] && parsed.choices[0].delta && parsed.choices[0].delta.content;
            if (c) {
              messages[assistantIdx].content += c;
              render();
            }
          } catch (_) {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      if (!messages[assistantIdx].content) {
        messages[assistantIdx].content = "Sorry, koi reply nahi mila.";
        render();
      }
    } catch (err) {
      console.error("w8-ai-widget error", err);
      messages[assistantIdx].content = "⚠️ Network error";
      render();
    } finally {
      sendBtn.disabled = false;
      input.focus();
    }
  };
})();
