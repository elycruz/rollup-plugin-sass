/*
 * create a style tag and append to head tag
 * @params {String} css style
 */

function insertStyle ( css ) {
    if(!css) return ;

    if(typeof(window) == 'undefined') return ;
    let style = document.createElement('style');
    style.setAttribute('media', 'screen');

    style.innerHTML = css
    document.head.appendChild(style);
    return css
}

export {
    insertStyle
}