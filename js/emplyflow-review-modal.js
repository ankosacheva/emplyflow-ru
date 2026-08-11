/**
 * EmplyFlow marketing site — модалка отзыва клиента (блок «Клиенты»).
 */
(function () {
  'use strict';

  var lastTrigger = null;

  function getModal() {
    return document.getElementById('ef-review-modal');
  }

  function fill(card, modal) {
    var name = (card && card.getAttribute('data-ef-review-name')) || '';
    var role = (card && card.getAttribute('data-ef-review-role')) || '';
    var company = (card && card.getAttribute('data-ef-review-company')) || '';
    var quote = (card && card.getAttribute('data-ef-review-quote')) || '';
    var initials = '';
    if (name) {
      initials = name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(function (p) {
          return p.charAt(0);
        })
        .join('')
        .toUpperCase();
    }
    modal.querySelectorAll('[data-ef-review-field]').forEach(function (el) {
      var key = el.getAttribute('data-ef-review-field');
      var val = '';
      if (key === 'name') val = name;
      else if (key === 'role') val = role;
      else if (key === 'company') val = company;
      else if (key === 'quote') val = quote ? '\u00ab' + quote + '\u00bb' : '';
      else if (key === 'initials') val = initials;
      el.textContent = val;
    });
  }

  window.__efOpenReviewModal = function (card, trigger) {
    var modal = getModal();
    if (!modal || !card) return;
    lastTrigger = trigger || null;
    fill(card, modal);
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('ef-review-open');
    var closeBtn = modal.querySelector('.ef-review-modal__close');
    if (closeBtn) closeBtn.focus();
  };

  window.__efCloseReviewModal = function () {
    var modal = getModal();
    if (modal) {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
    }
    document.body.classList.remove('ef-review-open');
    if (lastTrigger) lastTrigger.focus();
    lastTrigger = null;
  };

  if (window.__efReviewModalBound) return;
  window.__efReviewModalBound = true;

  document.addEventListener('click', function (e) {
    var openBtn = e.target.closest('[data-ef-review-open]');
    if (openBtn) {
      e.preventDefault();
      e.stopPropagation();
      var card = openBtn.closest('.ef-client');
      if (card) window.__efOpenReviewModal(card, openBtn);
      return;
    }
    if (e.target.closest('[data-ef-review-close]')) {
      e.preventDefault();
      window.__efCloseReviewModal();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && getModal() && getModal().classList.contains('is-open')) {
      window.__efCloseReviewModal();
    }
  });
})();
