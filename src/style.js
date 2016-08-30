/*
 * Create a style tag and append to head tag
 *
 * @param {String} css style
 * @return {String} css style
 */
function insertStyle(css) {
    if (!css) {
        return;
    }

    if (typeof window === 'undefined') {
        return;
    }

    let style = document.createElement('style');

    style.setAttribute('type', 'text/css');
    style.innerHTML = css;

    document.head.appendChild(style);

    return css;
}

export {
    insertStyle
};