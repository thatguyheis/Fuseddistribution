const START = '<!-- SOCIAL_VIDEO_START -->';
const END = '<!-- SOCIAL_VIDEO_END -->';
const PANEL_PATTERN = new RegExp(`${START}[\\s\\S]*?${END}`);

function trimInsertionWhitespace(value) {
  return value.replace(/^(?:\r?\n[ \t]*)+/, '\n');
}

export function addPanelToHtml(html, panel) {
  const withoutExistingPanel = html.replace(PANEL_PATTERN, '');
  const articleBodyStart = withoutExistingPanel.indexOf('<div class="article-body">');

  if (articleBodyStart !== -1) {
    const firstParagraphEnd = withoutExistingPanel.indexOf('</p>', articleBodyStart);
    if (firstParagraphEnd !== -1) {
      const insertAt = firstParagraphEnd + '</p>'.length;
      const remainder = trimInsertionWhitespace(withoutExistingPanel.slice(insertAt));
      return `${withoutExistingPanel.slice(0, insertAt)}\n            ${panel}${remainder}`;
    }
  }

  return withoutExistingPanel.replace(
    /(?:\r?\n[ \t]*)+<div class="article-cta">/,
    `\n          ${panel}\n\n          <div class="article-cta">`,
  );
}
