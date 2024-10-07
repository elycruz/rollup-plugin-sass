/**
 * Create a style tag and append to head tag
 *
 * @warning This function is injected inside rollup. According to this be sure
 *          - to not include any side-effect
 *          - do not import any library / other files content
 *
 * @return css style
 */
export default function insertStyle(
  css: string | undefined,
): string | undefined {
  if (!css || typeof window === 'undefined') {
    return;
  }

  const style = document.createElement('style');
  style.setAttribute('type', 'text/css');
  style.innerHTML = css;

  document.head.appendChild(style);

  return css;
}
