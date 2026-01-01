/**
 * We will assume a utility similar to 'textarea-caret' to get coordinates.
 * This implementation mirrors the textarea properties to a hidden div to calculate the position.
 */

// The properties that affect text layout
const properties = [
  'direction',
  'boxSizing',
  'width',
  'height',
  'overflowX',
  'overflowY',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'caretColor',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'fontStyle',
  'fontVariant',
  'fontWeight',
  'fontStretch',
  'fontSize',
  'fontSizeAdjust',
  'lineHeight',
  'fontFamily',
  'textAlign',
  'textTransform',
  'textIndent',
  'textDecoration',
  'letterSpacing',
  'wordSpacing',
  'tabSize',
  'MozTabSize',
] as const;

export interface Coordinates {
  top: number;
  left: number;
  height: number;
}

export function getCaretCoordinates(element: HTMLTextAreaElement, position: number): Coordinates {
  const isBrowser = typeof window !== 'undefined';
  if (!isBrowser) {
    return { top: 0, left: 0, height: 0 };
  }

  const div = document.createElement('div');
  div.id = 'input-textarea-caret-position-mirror-div';
  document.body.appendChild(div);

  const style = div.style;
  const computed = window.getComputedStyle(element);

  // Default wrapping styles
  style.whiteSpace = 'pre-wrap';
  style.wordWrap = 'break-word'; 

  // Position off-screen
  style.position = 'absolute'; 
  style.visibility = 'hidden'; 

  // Copy all relevant properties from the textarea
  properties.forEach((prop) => {
      // @ts-ignore
    style[prop] = computed[prop];
  });

  if (isFirefox()) {
    // Firefox lies about the overflow property for textareas: https://bugzilla.mozilla.org/show_bug.cgi?id=984275
    if (element.scrollHeight > parseInt(computed.height))
      style.overflowY = 'scroll';
  } else {
    style.overflow = 'hidden'; 
  }

  div.textContent = element.value.substring(0, position);

  const span = document.createElement('span');
  // Wrapping must be replicated *exactly*, including when a long word gets onto the next line.
  // We use a zero-width space to create a marker
  span.textContent = element.value.substring(position) || '.'; 
  div.appendChild(span);

  const coordinates = {
    top: span.offsetTop + parseInt(computed['borderTopWidth']),
    left: span.offsetLeft + parseInt(computed['borderLeftWidth']),
    height: parseInt(computed['lineHeight'])
  };

  document.body.removeChild(div);

  return coordinates;
}

function isFirefox() {
    // @ts-ignore
  return typeof window !== 'undefined' && window.mozInnerScreenX != null;
}
