/**
 * EmplyFlow marketing site — нативные формы заявок → Google Apps Script.
 * Не зависит от Tilda Forms API / подписки Tilda.
 */
(function () {
  'use strict';

  var ENDPOINT = (window.EMPLYFLOW_LEAD_ENDPOINT || '').trim();
  var FORM_SELECTOR = 'form.ef-lead-form';

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

  function collectSelectedModules(form) {
    var labels = [];
    Array.prototype.forEach.call(
      form.querySelectorAll('[name="modules[]"]:checked'),
      function (cb) {
        labels.push(cb.getAttribute('data-label') || cb.value);
      }
    );
    return labels;
  }

  function collectPayload(form) {
    var fd = new FormData(form);
    var contactPref = firstVal(fd, [
      'Как с вами удобнее связаться?',
      'contact',
      'Contact',
    ]);
    var comment = firstVal(fd, ['Textarea', 'comment', 'Comment', 'Message']);
    var modules = collectSelectedModules(form);
    var modulesLine = modules.length ? 'Модули: ' + modules.join(', ') : '';
    if (contactPref) {
      comment = comment
        ? 'Связь: ' + contactPref + '\n' + comment
        : 'Связь: ' + contactPref;
    }
    if (modulesLine) {
      comment = comment ? modulesLine + '\n' + comment : modulesLine;
    }

    return {
      name: firstVal(fd, ['Name', 'name', 'Имя']),
      company: firstVal(fd, ['Input', 'company', 'Company', 'Компания']),
      email: firstVal(fd, ['Email', 'email']),
      phone: firstVal(fd, ['Phone', 'phone', 'Телефон']),
      industry: contactPref,
      who: modules.join(', '),
      count: '',
      competency: '',
      competencyTitle: '',
      caseId: '',
      caseTitle: '',
      comment: comment,
      source: form.getAttribute('data-ef-lead-source') || 'site_demo',
      page: window.location.href,
      ts: new Date().toISOString(),
      visitor_id: '',
      session_id: '',
    };
  }

  function sendLead(payload) {
    if (!ENDPOINT) {
      if (typeof console !== 'undefined' && console.info) {
        console.info('[EmplyFlow leads] demo mode, payload:', payload);
      }
      return Promise.resolve({ ok: true, demo: true });
    }

    var body = JSON.stringify(payload);
    return fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: body,
    })
      .then(function (res) {
        if (res.type === 'opaque' || res.ok) return res;
        throw new Error('HTTP ' + res.status);
      })
      .catch(function () {
        return fetch(ENDPOINT, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: body,
        });
      });
  }

  function setError(form, message) {
    var box = form.querySelector('[data-ef-error]');
    if (!box) return;
    if (message) {
      box.textContent = message;
      box.classList.add('is-visible');
    } else {
      box.textContent = '';
      box.classList.remove('is-visible');
    }
  }

  function clearFieldErrors(form) {
    Array.prototype.forEach.call(
      form.querySelectorAll('.is-error'),
      function (el) {
        el.classList.remove('is-error');
      }
    );
  }

  function validate(form) {
    clearFieldErrors(form);
    setError(form, '');

    var required = form.querySelectorAll('[required]');
    var invalid = [];
    Array.prototype.forEach.call(required, function (el) {
      var ok = true;
      if (el.type === 'checkbox' || el.type === 'radio') {
        if (el.type === 'radio') {
          var group = form.querySelectorAll('[name="' + el.name + '"]');
          ok = Array.prototype.some.call(group, function (r) {
            return r.checked;
          });
        } else {
          ok = !!el.checked;
        }
      } else if (el.type === 'email') {
        ok = !!el.value.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim());
      } else {
        ok = !!el.value.trim();
      }
      if (!ok) {
        invalid.push(el);
        if (el.classList) el.classList.add('is-error');
      }
    });

    if (invalid.length) {
      setError(form, 'Пожалуйста, заполните обязательные поля.');
      try {
        invalid[0].focus();
      } catch (e) {}
      return false;
    }

    var modulesList = form.querySelector('[data-ef-demo-modules-list]');
    if (modulesList && modulesList.children.length) {
      var modulesChecked = form.querySelectorAll('[name="modules[]"]:checked');
      if (!modulesChecked.length) {
        var modulesField = form.querySelector('[data-ef-demo-modules]');
        if (modulesField) modulesField.classList.add('is-error');
        setError(form, 'Выберите хотя бы один модуль.');
        var firstModule = modulesList.querySelector('input');
        if (firstModule) {
          try {
            firstModule.focus();
          } catch (e) {}
        }
        return false;
      }
    }

    return true;
  }

  function ensureDemoModalVisible() {
    var modal = document.getElementById('ef-demo-modal');
    if (!modal) return;
    modal.classList.add('is-open');
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    if (modal.getAttribute('data-ef-mode') !== 'corner') {
      document.body.classList.add('ef-demo-open');
    }
  }

  function showSuccess(form) {
    form.classList.add('is-success');
    var success = form.querySelector('[data-ef-success]');
    if (success) success.classList.add('is-visible');
    var panel = form.closest('.ef-demo-modal__panel');
    if (panel) panel.classList.add('ef-demo-modal__panel--success');
    ensureDemoModalVisible();
  }

  function resetLeadForm(form) {
    if (!form) {
      var modal = document.getElementById('ef-demo-modal');
      form = modal ? modal.querySelector(FORM_SELECTOR) : null;
    }
    if (!form) return;
    form.classList.remove('is-success');
    form.removeAttribute('data-ef-sending');
    var success = form.querySelector('[data-ef-success]');
    if (success) success.classList.remove('is-visible');
    setError(form, '');
    clearFieldErrors(form);
    var btn = form.querySelector('[type="submit"]');
    if (btn) {
      btn.disabled = false;
      if (btn.dataset.efOriginalText) btn.textContent = btn.dataset.efOriginalText;
    }
    var panel = form.closest('.ef-demo-modal__panel');
    if (panel) panel.classList.remove('ef-demo-modal__panel--success');
    try {
      form.reset();
    } catch (e) {}
  }

  window.__efResetLeadForm = resetLeadForm;

  function patchDemoOpen() {
    var prev = window.__efOpenDemoForm;
    if (!prev || prev.__efBindWrapped) return;
    window.__efOpenDemoForm = function () {
      var r = prev.apply(this, arguments);
      var modal = document.getElementById('ef-demo-modal');
      if (modal) bindForms(modal);
      return r;
    };
    window.__efOpenDemoForm.__efBindWrapped = true;
  }

  function onSubmit(event) {
    var form = event.target;
    if (!form || !form.classList || !form.classList.contains('ef-lead-form')) return;

    event.preventDefault();
    event.stopPropagation();

    if (form.getAttribute('data-ef-sending') === '1') return;
    if (!validate(form)) return;

    var btn = form.querySelector('[type="submit"]');
    var payload = collectPayload(form);

    form.setAttribute('data-ef-sending', '1');
    if (btn) {
      btn.disabled = true;
      btn.dataset.efOriginalText = btn.textContent;
      btn.textContent = 'Отправляем…';
    }

    sendLead(payload)
      .then(function () {
        showSuccess(form);
      })
      .catch(function (err) {
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('[EmplyFlow leads] send failed', err);
        }
        setError(
          form,
          'Не удалось отправить заявку. Напишите на headoffice@emplyflow.ru или попробуйте позже.'
        );
      })
      .then(function () {
        form.removeAttribute('data-ef-sending');
        if (btn) {
          btn.disabled = false;
          if (btn.dataset.efOriginalText) btn.textContent = btn.dataset.efOriginalText;
        }
      });
  }

  function bindForms(root) {
    var scope = root && root.querySelectorAll ? root : document;
    var forms = scope.querySelectorAll
      ? scope.querySelectorAll(FORM_SELECTOR)
      : document.querySelectorAll(FORM_SELECTOR);

    // if root itself is the form
    if (root && root.matches && root.matches(FORM_SELECTOR)) {
      forms = [root];
    }

    Array.prototype.forEach.call(forms, function (form) {
      if (form.__efBound) return;
      form.__efBound = true;
      form.setAttribute('method', 'post');
      form.setAttribute('action', '');
      if (!form.__efSubmitGuard) {
        form.__efSubmitGuard = true;
        form.addEventListener(
          'submit',
          function (e) {
            e.preventDefault();
            e.stopPropagation();
          },
          true
        );
      }
      form.addEventListener('submit', onSubmit);
    });
  }

  function boot() {
    bindForms(document);
    patchDemoOpen();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  window.setTimeout(patchDemoOpen, 0);
  window.setTimeout(patchDemoOpen, 400);

  if (typeof MutationObserver !== 'undefined') {
    var mo = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var nodes = mutations[i].addedNodes;
        for (var j = 0; j < nodes.length; j++) {
          var n = nodes[j];
          if (n.nodeType !== 1) continue;
          if (n.matches && n.matches(FORM_SELECTOR)) bindForms(n);
          else if (n.querySelectorAll) bindForms(n);
        }
      }
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
