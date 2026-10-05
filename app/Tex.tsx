// A question's LaTeX, typeset by KaTeX. The API sends each question's
// rendering as `latex` (such as "7 \times 8 ="), so the page shows the
// question the way the API wrote it rather than reworking its plain text.
import katex from 'katex';

export default function Tex({ latex }: { latex: string }) {
  const html = katex.renderToString(latex, { throwOnError: false, output: 'html' });
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}
