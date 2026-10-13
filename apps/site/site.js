(() => {
  "use strict";
  const toggle = document.getElementById("menu-toggle"),
    nav = document.getElementById("site-navigation");
  toggle?.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  nav?.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }),
  );
  fetch("public-config.json").then(r=>r.json()).then(config=>document.querySelectorAll('[data-support]').forEach(a=>a.href='mailto:'+config.SUPPORT_EMAIL)).catch(()=>{});
  const language=document.getElementById("language-toggle");
  language?.addEventListener("click",()=>{const hindi=document.documentElement.lang!=="hi";document.documentElement.lang=hindi?"hi":"en";const title=document.querySelector(".hero h1"),em=document.createElement("em");em.textContent=hindi?"ज़्यादा समय।":"what matters.";title.replaceChildren(document.createTextNode(hindi?"ज़रूरी बातों के लिए":"More time for"),document.createElement("br"),em);document.querySelector('.hero .actions .primary').textContent=hindi?"वर्कस्पेस का अनुरोध करें":"Request a workspace";document.querySelector('.hero .actions a:not(.primary)').textContent=hindi?"डेमो देखें":"Explore the demo";language.textContent=hindi?"English":"हिन्दी";language.setAttribute("aria-label",hindi?"Read the introduction in English":"Read the introduction in Hindi");});
  const form = document.getElementById("request-form");
  if (!form) return;
  let step = 0;
  const panels = [...form.querySelectorAll("[data-step]")],
    back = document.getElementById("request-back"),
    next = document.getElementById("request-next"),
    submit = document.getElementById("request-submit"),
    status = document.getElementById("request-result");
  let catalogue;
  fetch("capabilities.json")
    .then((r) => {
      if (!r.ok) throw Error("Catalogue unavailable");
      return r.json();
    })
    .then((data) => {
      catalogue = data;
      for (const module of data.modules.filter(
        (m) => !["private", "whatsapp_api", "apk"].includes(m.id),
      )) {
        const label = document.createElement("label");
        label.className = "check";
        const check = document.createElement("input");
        check.type = "checkbox";
        check.name = "modules";
        check.value = module.id;
        check.checked = true;
        label.append(check, document.createTextNode(module.name));
        document.getElementById("module-options").append(label);
      }
    })
    .catch(() => {
      status.textContent =
        "Capability list could not load. The request form still records your contact details.";
    });
  const show = () => {
    panels.forEach((p, i) => (p.hidden = i !== step));
    back.hidden = step === 0;
    next.hidden = step === 2;
    submit.hidden = step !== 2;
    document.getElementById("step-label").textContent =
      `Step ${step + 1} of 3 · ${["What you need", "Contact details", "Review"][step]}`;
    if (step === 2) {
      const values = new FormData(form);
      document.getElementById("request-summary").textContent =
        `${values.get("congregation")} · ${values.get("adminEmail")} · ${values.get("delivery")} delivery · ${values.get("privacy")} privacy preference. Private mode requests record interest only.`;
    }
  };
  next.addEventListener("click", () => {
    const inputs = [...panels[step].querySelectorAll("input,select")];
    if (inputs.some((i) => !i.reportValidity())) return;
    step = Math.min(step + 1, 2);
    show();
  });
  back.addEventListener("click", () => {
    step = Math.max(step - 1, 0);
    show();
  });
  form.elements.delivery.addEventListener("change", () => {
    document.getElementById("consequences").textContent =
      catalogue?.deliveryModes.find(
        (m) => m.id === form.elements.delivery.value,
      )?.description || "";
  });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (step !== 2) return;
    submit.disabled = true;
    status.textContent = "Submitting your request…";
    const v = new FormData(form);
    try {
      const response = await fetch(
        "https://ejosykrxjvwrhxfnputo.supabase.co/rest/v1/rpc/submit_v2_workspace_application",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: "sb_publishable_-WylxZpXTD06syk3LPGpWg_SfSf5K7C",
          },
          body: JSON.stringify({
            p_choices: {
              version: 2,
              delivery: v.get("delivery"),
              privacy: v.get("privacy"),
              modules: v.getAll("modules"),
            },
            p_name: v.get("name"),
            p_contact_email: v.get("email"),
            p_admin_email: v.get("adminEmail"),
            p_congregation: v.get("congregation"),
            p_phone: v.get("phone"),
            p_authorized: v.get("authorized") === "on",
            p_website: v.get("website"),
          }),
        },
      );
      const result = await response.json();
      if (!response.ok || !result.received)
        throw Error(result.message || "Request not confirmed");
      const preferences = {
        reference: result.reference,
        delivery: v.get("delivery"),
        privacy: v.get("privacy"),
        modules: v.getAll("modules"),
      };
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(preferences, null, 2)], {
          type: "application/json",
        }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "congregation-requirements.json";
      a.textContent = "Download your selected requirements";
      status.textContent = result.reference
        ? `Request received. Reference: ${result.reference}. Your delivery and module choices are recorded. Private mode remains unavailable. `
        : "A pending request already exists. Its choices have not been overwritten. Download these preferences to share with support. ";
      status.append(a);
      submit.textContent = "Request received";
    } catch (error) {
      status.textContent =
        "Your request was not confirmed. Details are kept. " + error.message;
      submit.disabled = false;
    }
  });
})();
