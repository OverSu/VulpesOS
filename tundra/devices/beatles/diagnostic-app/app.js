/* SPDX-License-Identifier: MPL-2.0 */
(function () {
  'use strict';
  var pages = document.querySelectorAll('.page');
  var current = 0;
  function show(index) {
    current = (index + pages.length) % pages.length;
    for (var i = 0; i < pages.length; i++) {
      pages[i].classList.toggle('active', i === current);
    }
    document.getElementById('position').textContent = (current + 1) + ' / ' + pages.length;
  }
  document.addEventListener('keydown', function (event) {
    document.getElementById('last-key').textContent = event.key || String(event.keyCode);
    if (event.key === 'ArrowRight' || event.key === 'Enter') {
      event.preventDefault(); show(current + 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault(); show(current - 1);
    }
  });
}());
