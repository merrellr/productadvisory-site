/* Shared by the four interactive tools; loaded before each tool's own script. */
(function () {
  "use strict";
  /* Save to my account: the interactive tools hand their work to Product Advisory Learning, where accounts live
     (assessment.productadvisory.co/my-tools). The work travels in the link's #, so nothing is sent to a server
     until the person chooses Save there. Opening a saved tool from Learning comes back as "#<prefix>=<data>&doc=<id>",
     and the tool remembers the id so the next Save updates that copy instead of making a new one. */
  window.PASave = {
    url: "https://assessment.productadvisory.co/my-tools",
    key: function (tool) { return "pa_saved_" + tool; },
    docId: function (tool) { try { return localStorage.getItem(this.key(tool)) || ""; } catch (e) { return ""; } },
    remember: function (tool, id) { try { if (id) localStorage.setItem(this.key(tool), id); else localStorage.removeItem(this.key(tool)); } catch (e) { /* storage off */ } },
    forget: function (tool) { this.remember(tool, ""); },
    // "#s=DATA" or "#s=DATA&doc=ID" for this page's prefix: { data, doc } or null
    readHash: function (prefix) {
      var m = location.hash.match(new RegExp("^#" + prefix + "=([A-Za-z0-9_-]+)(?:&doc=([A-Za-z0-9]{1,40}))?$"));
      return m ? { data: m[1], doc: m[2] || "" } : null;
    },
    go: function (tool, data, title, summary) {
      var payload = JSON.stringify({ v: 1, tool: tool, doc: this.docId(tool), title: String(title || "").slice(0, 100), summary: String(summary || "").slice(0, 200), data: data });
      var bytes = new TextEncoder().encode(payload), bin = "";
      bytes.forEach(function (b) { bin += String.fromCharCode(b); });
      try { if (window.gtag) window.gtag("event", "tool_save", { tool: tool }); } catch (e) { /* no analytics */ }
      location.href = this.url + "#save=" + btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    }
  };
})();
