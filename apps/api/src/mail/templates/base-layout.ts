// Shared HTML wrapper for every transactional email - branded header/footer,
// inline styles throughout (email clients don't reliably support <style>
// blocks or external stylesheets, so styling has to travel on each element).
// The bookshelf icon is inlined as raw SVG rather than a hosted <img> so it
// always renders (no remote-image blocking) and never breaks layout if an
// image fails to load - it's the same mark used in the app's own sidebar,
// just redrawn at email size.
const BOOKSHELF_ICON = `<svg width="30" height="30" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" style="display:block;">
  <rect x="0" y="0" width="512" height="512" rx="117.8" fill="#eba946"/>
  <path d="M104.45 243.71a8.19 8.19 0 0 1 8.19-8.19h28.67a8.19 8.19 0 0 1 8.19 8.19v114.69h-45.06Z" fill="#fbf1de"/>
  <path d="M168.96 212.99a8.19 8.19 0 0 1 8.19-8.19h28.67a8.19 8.19 0 0 1 8.19 8.19v145.41h-45.06Z" fill="#4a3218"/>
  <path d="M233.47 228.35a8.19 8.19 0 0 1 8.19-8.19h28.67a8.19 8.19 0 0 1 8.19 8.19v130.05h-45.06Z" fill="#fbf1de"/>
  <path d="M297.98 182.27a8.19 8.19 0 0 1 8.19-8.19h28.67a8.19 8.19 0 0 1 8.19 8.19v176.13h-45.06Z" fill="#ffffff"/>
  <path d="M362.50 202.75a8.19 8.19 0 0 1 8.19-8.19h28.67a8.19 8.19 0 0 1 8.19 8.19v155.65h-45.06Z" fill="#4a3218" transform="rotate(7 407.55 358.40)"/>
  <rect x="97.28" y="384.00" width="317.44" height="25.60" rx="15.36" fill="#3c2a14"/>
</svg>`;

const SERIF = "Georgia, 'Times New Roman', Cambria, serif";
const SANS =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

interface BaseLayoutParams {
  previewText: string;
  bodyHtml: string;
}

export function baseLayout({
  previewText,
  bodyHtml,
}: BaseLayoutParams): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>NextShelf</title>
  </head>
  <body style="margin:0; padding:0; background-color:#fdf7ef; font-family: ${SANS};">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0;">${previewText}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fdf7ef;">
      <tr>
        <td align="center" style="padding: 32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color:#ffffff; border-radius: 14px; border: 1px solid #f0dcb8; overflow:hidden;">
            <!-- book-spine accent bar -->
            <tr>
              <td height="6" style="line-height:6px; font-size:6px; background:linear-gradient(90deg,#eba946,#c4761a); background-color:#c4761a;">&nbsp;</td>
            </tr>
            <tr>
              <td style="background-color:#4a3218; padding: 22px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding-right:10px; vertical-align:middle;">${BOOKSHELF_ICON}</td>
                    <td style="vertical-align:middle;">
                      <span style="font-family:${SERIF}; color:#fbf1de; font-size:20px; font-weight:700; letter-spacing:0.3px;">NextShelf</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 36px 32px 32px;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding: 18px 32px 26px; border-top: 1px dashed #e3b06a;">
                <p style="margin:0; font-family:${SERIF}; font-style:italic; font-size:13px; line-height:1.5; color:#a86215;">
                  Every book, every borrower, back on the shelf.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function emailHeading(text: string): string {
  return `<h1 style="margin:0 0 18px; font-family:${SERIF}; font-size:22px; font-weight:700; color:#4a3218;">${text}</h1>`;
}

export function emailButton(label: string, href: string): string {
  return `<a href="${href}" style="display:inline-block; background-color:#c4761a; color:#ffffff; text-decoration:none; font-weight:600; font-size:15px; padding:13px 30px; border-radius:999px; box-shadow: 0 2px 6px rgba(196,118,26,0.35);">${label}</a>`;
}

export function emailParagraph(text: string): string {
  return `<p style="margin:0 0 20px; font-size:15px; line-height:1.6; color:#4a3218;">${text}</p>`;
}

export function emailFootnote(text: string): string {
  return `<p style="margin:24px 0 0; font-size:13px; line-height:1.5; color:#a86215;">${text}</p>`;
}

// A rotated, rubber-stamp-style badge for the due date - the one visual that
// makes the due-reminder email feel like an actual library card stamp
// instead of a generic status pill. Degrades gracefully (renders unrotated,
// still fully legible) in clients that ignore CSS transforms.
export function emailDateStamp(params: {
  label: string;
  date: string;
  color: string;
  background: string;
}): string {
  const { label, date, color, background } = params;
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin: 4px 0 24px;">
    <tr>
      <td style="border: 2px solid ${color}; border-radius: 10px; background-color:${background}; padding: 12px 26px; transform: rotate(-3deg);">
        <div style="font-family:${SANS}; font-size:11px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:${color};">${label}</div>
        <div style="font-family:${SERIF}; font-size:22px; font-weight:700; color:${color}; margin-top:2px;">${date}</div>
      </td>
    </tr>
  </table>`;
}
