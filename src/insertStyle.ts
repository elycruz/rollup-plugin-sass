/**
 * Create a style tag and append to head tag
 *
 * @warning this file is not included directly in the source code!
 *          If user specifies inject option to true, an import to this file will be injected in rollup output.
 *          Due to this reason this file is compiled into a ESM module separated from other plugin source files.
 *          That is the reason of why there are two tsconfig.build files.
 *
 * @return css style
 */
export default function insertStyle(css: string | undefined): string | undefined {
  if (!css || typeof window === 'undefined') {
    return;
  }

  const style = document.createElement('style');
  style.setAttribute('type', 'text/css');
  style.innerHTML = css;

  document.head.appendChild(style);

  return css;
}
