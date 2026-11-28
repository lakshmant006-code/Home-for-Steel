/* Phones: touches scroll the page by default. Sketching on the hero turns on only after you start it
   ("Sketch your own plan" / the draw button) and turns off again with "Done sketching". */
(function () {
  'use strict';
  var hero = document.getElementById('top');
  if (!hero || !document.getElementById('skPad')) return;      // the home page has a room builder now, not a sketch pad
  var stop = document.createElement('button');
  stop.type = 'button';
  stop.className = 'sk-stop';
  stop.textContent = 'Done sketching';
  hero.appendChild(stop);
  function on() { hero.classList.add('sketching'); }
  function off() { hero.classList.remove('sketching'); }
  ['hSkip', 'skGo'].forEach(function (id) { var b = document.getElementById(id); if (b) b.addEventListener('click', on); });
  ['hFinish', 'hExtrude'].forEach(function (id) { var b = document.getElementById(id); if (b) b.addEventListener('click', off); });
  stop.addEventListener('click', off);
})();
