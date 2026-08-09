/**
 * EmplyFlow — поле «Какие модули вас интересуют?» в форме демодоступа.
 * Автовыбор по data-module на странице или data-ef-demo-module на кнопке.
 */
(function () {
  'use strict';

  var MODULES = [
    { id: 'performance-review', label: 'Performance Review' },
    { id: 'assessment-360', label: 'Оценка 360°' },
    { id: 'career-development', label: 'Карьера и развитие' },
    { id: 'nine-box', label: 'Матрица потенциала' },
    { id: 'goal-setting', label: 'Целеполагание' },
    { id: 'succession', label: 'Планирование преемственности' },
    { id: 'recognition', label: 'Нематериальная мотивация' },
    { id: 'ai-assessment-assistant', label: 'ИИ-ассистент оценки компетенций' },
  ];

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function resolvePreset(trigger) {
    if (trigger) {
      var fromBtn = trigger.getAttribute('data-ef-demo-module');
      if (fromBtn) return fromBtn;
    }
    var bodyMod = document.body && document.body.getAttribute('data-module');
    return bodyMod || '';
  }

  function buildList(list) {
    if (!list || list.children.length) return;
    MODULES.forEach(function (mod) {
      var label = document.createElement('label');
      label.className = 'ef-lead-form__chip ef-lead-form__chip--' + mod.id;
      var input = document.createElement('input');
      input.type = 'checkbox';
      input.name = 'modules[]';
      input.value = mod.id;
      input.setAttribute('data-label', mod.label);
      var span = document.createElement('span');
      span.textContent = mod.label;
      label.appendChild(input);
      label.appendChild(span);
      list.appendChild(label);
    });
  }

  function ensureModulesField(form) {
    if (!form || !form.classList.contains('ef-lead-form')) return null;

    var list = form.querySelector('[data-ef-demo-modules-list]');
    if (list) {
      buildList(list);
      return list;
    }

    var emailInput = form.querySelector('input[name="Email"]');
    if (!emailInput) return null;

    var emailField = emailInput.closest('.ef-lead-form__field');
    if (!emailField) return null;

    var fieldset = document.createElement('fieldset');
    fieldset.className = 'ef-lead-form__field ef-lead-form__modules';
    fieldset.setAttribute('data-ef-demo-modules', '');

    var legend = document.createElement('legend');
    legend.className = 'ef-lead-form__legend';
    legend.textContent = 'Какие модули вас интересуют?';

    var hint = document.createElement('p');
    hint.className = 'ef-lead-form__modules-hint';
    hint.textContent = 'Можно выбрать несколько';

    list = document.createElement('div');
    list.className = 'ef-lead-form__checks';
    list.setAttribute('data-ef-demo-modules-list', '');
    list.setAttribute('role', 'group');
    list.setAttribute('aria-label', 'Модули платформы');

    fieldset.appendChild(legend);
    fieldset.appendChild(hint);
    fieldset.appendChild(list);

    if (emailField.nextSibling) {
      emailField.parentNode.insertBefore(fieldset, emailField.nextSibling);
    } else {
      emailField.parentNode.appendChild(fieldset);
    }

    buildList(list);
    return list;
  }

  function applyPreset(form, moduleId) {
    ensureModulesField(form);
    var boxes = form.querySelectorAll('[name="modules[]"]');
    Array.prototype.forEach.call(boxes, function (cb) {
      cb.checked = false;
    });
    var field = form.querySelector('[data-ef-demo-modules]');
    if (field) field.classList.remove('is-error');

    if (!moduleId) return;

    var match = form.querySelector('[name="modules[]"][value="' + moduleId + '"]');
    if (match) match.checked = true;
  }

  function presetModalForm(trigger) {
    var modal = document.getElementById('ef-demo-modal');
    if (!modal) return;
    var form = modal.querySelector('form.ef-lead-form');
    if (!form) return;
    applyPreset(form, resolvePreset(trigger));
  }

  function initForms(root) {
    var scope = root && root.querySelectorAll ? root : document;
    var forms = scope.querySelectorAll
      ? scope.querySelectorAll('#ef-demo-modal form.ef-lead-form, form.ef-lead-form')
      : [];

    if (root && root.matches && root.matches('form.ef-lead-form')) {
      forms = [root];
    }

    Array.prototype.forEach.call(forms, function (form) {
      ensureModulesField(form);
      if (form.__efModulesChangeBound) return;
      form.__efModulesChangeBound = true;
      form.addEventListener('change', function (e) {
        if (!e.target || e.target.name !== 'modules[]') return;
        var field = form.querySelector('[data-ef-demo-modules]');
        if (field) field.classList.remove('is-error');
      });
    });
  }

  function wrapOpenDemoForm() {
    var prev = window.__efOpenDemoForm;
    if (!prev || prev.__efModulesWrapped) return;

    window.__efOpenDemoForm = function (opts) {
      opts = opts || {};
      if (opts.trigger) window.__efLastDemoTrigger = opts.trigger;
      prev.apply(this, arguments);
      window.setTimeout(function () {
        presetModalForm(window.__efLastDemoTrigger);
      }, 0);
    };
    window.__efOpenDemoForm.__efModulesWrapped = true;
  }

  document.addEventListener(
    'click',
    function (e) {
      var btn = e.target.closest('[data-ef-demo-open]');
      if (!btn) return;
      window.__efLastDemoTrigger = btn;
      window.setTimeout(function () {
        presetModalForm(btn);
      }, 0);
    },
    true
  );

  function boot() {
    initForms(document);
    wrapOpenDemoForm();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.setTimeout(wrapOpenDemoForm, 0);
  window.setTimeout(wrapOpenDemoForm, 120);

  if (typeof MutationObserver !== 'undefined') {
    var mo = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var nodes = mutations[i].addedNodes;
        for (var j = 0; j < nodes.length; j++) {
          var n = nodes[j];
          if (n.nodeType !== 1) continue;
          if (n.matches && n.matches('form.ef-lead-form')) initForms(n);
          else if (n.querySelectorAll) initForms(n);
        }
      }
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
