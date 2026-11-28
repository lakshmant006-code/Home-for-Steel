/* Contact page form: checks the fields, then opens the visitor's email app with the message ready (the site has no server to send mail). */
(function () {
  'use strict';
  var form = document.getElementById('cgForm');
  if (!form) return;
  var $ = function (id) { return document.getElementById(id); };
  var err = $('cgErr'), note = $('cgNote');
  $('m').maxLength = 1500;
  form.addEventListener('input', function (e) { e.target.classList.remove('bad'); err.hidden = true; });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('cgName'), email = $('cgEmail'), msg = $('m'), bad = [];
    if (!name.value.trim()) bad.push(name);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) bad.push(email);
    if (!msg.value.trim()) bad.push(msg);
    [name, email, msg].forEach(function (f) { f.classList.toggle('bad', bad.indexOf(f) > -1); });
    if (bad.length) {
      err.textContent = bad[0] === email ? 'Please enter a valid email address.' : 'Please fill in your name, email and message.';
      err.hidden = false; bad[0].focus(); return;
    }
    var lines = ['Name: ' + name.value.trim(), 'Phone: ' + ($('cgPhone').value.trim() || '-'), 'Email: ' + email.value.trim(),
      "I'm a: " + $('cgRole').value, 'Project type: ' + $('cgType').value, 'Location: ' + ($('cgLoc').value.trim() || '-'), '', msg.value.trim()];
    var href = 'mailto:marketing@homeplansforsteel.com?subject=' + encodeURIComponent('Website enquiry from ' + name.value.trim() + ' (' + $('cgRole').value + ')') + '&body=' + encodeURIComponent(lines.join('\n'));
    err.hidden = true;
    note.textContent = 'Your email app should open with this message ready. If it did not, write to marketing@homeplansforsteel.com.';
    window.location.href = href;
  });
})();
