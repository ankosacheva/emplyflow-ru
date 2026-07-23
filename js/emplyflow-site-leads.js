/**
 * EmplyFlow marketing site — дублируем заявки Tilda-форм
 * в Google Apps Script (Sheet + email), по той же схеме, что Hub.
 *
 * Подключение (перед </body>):
 *   <script>window.EMPLYFLOW_LEAD_ENDPOINT='https://script.google.com/macros/s/.../exec';</script>
 *   <script src="js/emplyflow-site-leads.js"></script>
 *
 * Если EMPLYFLOW_LEAD_ENDPOINT пустой — заявки только логируются в console (demo-режим).
 */
(function () {
  'use strict';

  var ENDPOINT = (window.EMPLYFLOW_LEAD_ENDPOINT || '').trim();
  var SOURCE_DEFAULT = 'site_demo';

  function val(fd, name) {
    var v = fd.get(name);
    return v == null ? '' : String(v).trim();
  }

  function firstVal(fd, names) {
    for (var i = 0; i < names.length; i++) {
      var v = val(fd, names[i]);
      if (v) return v;
    }
    return '';
  }

  function collectPayload(form) {
    var fd = new FormData(form);
    var contactPref = firstVal(fd, [
      'Как с вами удобнее связаться?',
      'contact',
      'Contact',
    ]);
    var comment = firstVal(fd, ['Textarea', 'comment', 'Comment', 'Message']);
    if (contactPref) {
      comment = comment
        ? 'Связь: ' + contactPref + '\n' + comment
        : 'Связь: ' + contactPref;
    }

    return {
      name: firstVal(fd, ['Name', 'name', 'Имя']),
      company: firstVal(fd, ['Input', 'company', 'Company', 'Компания']),
      email: firstVal(fd, ['Email', 'email']),
      phone: firstVal(fd, ['Phone', 'phone', 'Телефон']),
      industry: contactPref,
      who: '',
      count: '',
      competency: '',
      competencyTitle: '',
      caseId: '',
      caseTitle: '',
      comment: comment,
      source: form.getAttribute('data-ef-lead-source') || SOURCE_DEFAULT,
      page: window.location.href,
      ts: new Date().toISOString(),
      visitor_id: '',
      session_id: '',
    };
  }

  function looksLikeLeadForm(form) {
    if (!form || !form.querySelector) return false;
    // Zero Block / Tilda lead forms with Name + Email
    var hasName = !!(
      form.querySelector('[name="Name"],[name="name"]') ||
      form.querySelector('input[name="Name"]')
    );
    var hasEmail = !!(
      form.querySelector('[name="Email"],[name="email"]') ||
      form.querySelector('input[name="Email"]')
    );
    if (hasName && hasEmail) return true;
    // demo popup zero-block wrapper
    if (form.closest && form.closest('#rec1572865321, .tn-atom__form')) return true;
    return false;
  }

  function sendLead(payload) {
    if (!ENDPOINT) {
      if (typeof console !== 'undefined' && console.info) {
        console.info('[EmplyFlow leads] demo mode, payload:', payload);
      }
      return Promise.resolve({ ok: true, demo: true });
    }

    var body = JSON.stringify(payload);
    var opts = {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: body,
    };

    return fetch(ENDPOINT, opts)
      .then(function (res) {
        // Apps Script may opaque-redirect; treat network OK as success
        if (!res.ok && res.type !== 'opaque') {
          throw new Error('HTTP ' + res.status);
        }
        return res;
      })
      .catch(function () {
        // CORS fallback — как в Hub
        return fetch(ENDPOINT, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: body,
        });
      });
  }

  function forwardForm(form) {
    if (!looksLikeLeadForm(form)) return;
    if (form.getAttribute('data-ef-lead-sent') === '1') return;
    try {
      var payload = collectPayload(form);
      if (!payload.email && !payload.phone && !payload.name) return;
      form.setAttribute('data-ef-lead-sent', '1');
      // сброс флага через чуть — чтобы повторная отправка после ошибки Tilda была возможна
      setTimeout(function () {
        form.removeAttribute('data-ef-lead-sent');
      }, 8000);
      sendLead(payload).catch(function (err) {
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('[EmplyFlow leads] send failed', err);
        }
      });
    } catch (err) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[EmplyFlow leads] collect failed', err);
      }
    }
  }

  function patchTildaSend() {
    if (!window.tildaForm || typeof window.tildaForm.send !== 'function') return false;
    if (window.tildaForm.__efLeadPatched) return true;

    var original = window.tildaForm.send;
    window.tildaForm.send = function (formNode) {
      try {
        var form =
          typeof formNode === 'string'
            ? document.querySelector(formNode)
            : formNode && formNode.jquery
              ? formNode[0]
              : formNode;
        if (form) forwardForm(form);
      } catch (e) {}
      return original.apply(this, arguments);
    };
    window.tildaForm.__efLeadPatched = true;
    return true;
  }

  function onFormsEnded(form) {
    forwardForm(form);
  }

  // Tilda вызывает data-formsended-callback по имени из window
  window.emplyflowLeadFormSended = function (form) {
    var node = form && form.jquery ? form[0] : form;
    onFormsEnded(node);
  };

  function tagForms() {
    var forms = document.querySelectorAll('form.js-form-proccess, .tn-atom__form form');
    Array.prototype.forEach.call(forms, function (form) {
      if (!looksLikeLeadForm(form)) return;
      if (!form.getAttribute('data-formsended-callback')) {
        form.setAttribute('data-formsended-callback', 'emplyflowLeadFormSended');
      }
      if (!form.getAttribute('data-ef-lead-source')) {
        var src = 'site_demo';
        if (form.closest('#rec1572865321')) src = 'site_demo_popup';
        form.setAttribute('data-ef-lead-source', src);
      }
    });
  }

  function boot() {
    patchTildaSend();
    tagForms();
  }

  // Tilda подгружает формы асинхронно — патчим несколько раз
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  var tries = 0;
  var timer = setInterval(function () {
    tries += 1;
    boot();
    if ((window.tildaForm && window.tildaForm.__efLeadPatched && tries > 10) || tries > 40) {
      clearInterval(timer);
    }
  }, 500);

  // На случай, если Zero Form появится позже (открытие попапа)
  if (typeof MutationObserver !== 'undefined') {
    var mo = new MutationObserver(function () {
      tagForms();
      patchTildaSend();
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
