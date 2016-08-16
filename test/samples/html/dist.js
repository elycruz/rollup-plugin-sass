'use strict';

function ___$styleInject(css) {
    if (!css) return;

    if (typeof window == 'undefined') return;
    var style = document.createElement('style');
    style.setAttribute('media', 'screen');

    style.innerHTML = css;
    document.head.appendChild(style);
    return css;
}
___$styleInject("body {\n  color: green; }\n");