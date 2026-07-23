/**
 * EmplyFlow marketing site — заявки с форм «Получить доступ/демо»
 * уходят в Google Apps Script (Sheet + email), минуя Tilda Forms API.
 *
 * Почему так: на экспорте Tilda отклоняет домен emplyflow.ru
 * («not on the list of the approved domains»). Валидацию Tilda оставляем,
 * а send() подменяем на наш endpoint (как в Competency Hub).
 *
 * Подключение (перед </body>):
 *   <script>window.EMPLYFLOW_LEAD_ENDPOINT='https://script.google.com/macros/s/.../exec';</script>
 *   <script src="js/emplyflow-site-leads.js" charset="utf-8"></script>
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
    var hasName = !!form.querySelector('[name="Name"],[name="name"]');
    var hasEmail = !!form.querySelector('[name="Email"],[name="email"]');
    if (hasName && hasEmail) return true;
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
    return fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: body,
    })
      .then(function (res) {
        // Apps Script часто отвечает opaque/redirect — для CORS это норма
        if (res.type === 'opaque' || res.ok) return res;
        // даже при странном статусе пробуем no-cors fallback ниже
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

  function resetSendingBtn(btn) {
    if (!btn) return;
    if (typeof t_removeClass === 'function') t_removeClass(btn, 't-btn_sending');
    else btn.classList.remove('t-btn_sending');
    btn.tildaSendingStatus = '0';
  }

  function showFormError(form, message) {
    var boxes = form.querySelectorAll('.js-errorbox-all, .t-form__errorbox-wrapper, .t-form__errorbox-text');
    var shown = false;
    Array.prototype.forEach.call(boxes, function (el) {
      if (el.classList.contains('js-errorbox-all') || el.classList.contains('t-form__errorbox-wrapper')) {
        el.style.display = 'block';
      }
      if (el.classList.contains('t-form__errorbox-text') || el.classList.contains('js-rule-error-all')) {
        el.innerHTML = message;
        el.style.display = 'block';
        shown = true;
      }
    });
    if (!shown && typeof console !== 'undefined') {
      console.warn('[EmplyFlow leads]', message);
      alert(message);
    }
    if (typeof t_addClass === 'function') t_addClass(form, 'js-send-form-error');
    else form.classList.add('js-send-form-error');
  }

  function showSuccess(form) {
    var successUrl = form.getAttribute('data-success-url') || '';
    var successCallback = form.getAttribute('data-success-callback') || '';

    if (window.tildaForm && typeof window.tildaForm.successEnd === 'function') {
      window.tildaForm.successEnd(form, successUrl, successCallback);
      return;
    }

    // fallback, если Tilda API UI недоступен
    if (successCallback && typeof window[successCallback] === 'function') {
      window[successCallback](form);
      return;
    }
    alert('Спасибо! Заявка отправлена — мы свяжемся с вами.');
    try {
      form.reset();
    } catch (e) {}
  }

  function submitViaAppsScript(form, btn) {
    var payload;
    try {
      payload = collectPayload(form);
    } catch (err) {
      resetSendingBtn(btn);
      showFormError(form, 'Не удалось прочитать форму. Попробуйте ещё раз.');
      return;
    }

    if (!payload.email && !payload.phone && !payload.name) {
      resetSendingBtn(btn);
      showFormError(form, 'Заполните поля формы.');
      return;
    }

    sendLead(payload)
      .then(function () {
        resetSendingBtn(btn);
        showSuccess(form);
      })
      .catch(function (err) {
        resetSendingBtn(btn);
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('[EmplyFlow leads] send failed', err);
        }
        showFormError(
          form,
          'Не удалось отправить заявку. Напишите на headoffice@emplyflow.ru или попробуйте позже.'
        );
      });
  }

  function patchTildaSend() {
    if (!window.tildaForm || typeof window.tildaForm.send !== 'function') return false;
    if (window.tildaForm.__efLeadPatched) return true;

    var original = window.tildaForm.send;
    window.tildaForm.send = function (formNode, btnNode) {
      var form =
        typeof formNode === 'string'
          ? document.querySelector(formNode)
          : formNode && formNode.jquery
            ? formNode[0]
            : formNode;
      var btn =
        typeof btnNode === 'string'
          ? document.querySelector(btnNode)
          : btnNode && btnNode.jquery
            ? btnNode[0]
            : btnNode;

      // Только lead-формы сайта — в Apps Script, без Tilda domain check
      if (form && looksLikeLeadForm(form)) {
        submitViaAppsScript(form, btn);
        return false;
      }
      return original.apply(this, arguments);
    };
    window.tildaForm.__efLeadPatched = true;
    return true;
  }

  function tagForms() {
    var forms = document.querySelectorAll('form.js-form-proccess, .tn-atom__form form');
    Array.prototype.forEach.call(forms, function (form) {
      if (!looksLikeLeadForm(form)) return;
      if (!form.getAttribute('data-ef-lead-source')) {
        var src = SOURCE_DEFAULT;
        if (form.closest('#rec1572865321')) src = 'site_demo_popup';
        form.setAttribute('data-ef-lead-source', src);
      }
    });
  }

  function boot() {
    patchTildaSend();
    tagForms();
  }

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

  if (typeof MutationObserver !== 'undefined') {
    var mo = new MutationObserver(function () {
      tagForms();
      patchTildaSend();
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
