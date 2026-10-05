import katex from 'katex';

export default function Tex({ latex }: { latex: string }) {
  const html = katex.renderToString(latex, { throwOnError: false });
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}
