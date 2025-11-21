import "server-only";

import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";

export type LetterDocxOptions = {
  title: string;
  version: number;
  author: string;
  body: string;
};

export async function generateLetterDocx(options: LetterDocxOptions) {
  const doc = new Document({
    creator: options.author,
    description: `${options.title} v${options.version}`,
    title: options.title,
    styles: {
      default: {
        document: {
          run: {
            font: "Calibri",
            size: 24,
          },
        },
      },
    },
    sections: [
      {
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: options.title, bold: true })],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Version ${options.version} — Author: ${options.author}`,
                italics: true,
                size: 20,
              }),
            ],
          }),
          ...options.body.split("\n\n").map(
            (block) =>
              new Paragraph({
                children: [new TextRun(block)],
                spacing: { after: 200 },
              }),
          ),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer;
}

