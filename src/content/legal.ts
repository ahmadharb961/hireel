/** Long-form legal documents. A block is a paragraph (string), a bullet list (string[]) or a sub-heading ({ h }). */
export type LegalBlock = string | string[] | { h: string };
export type LegalSection = { id: string; h: string; body: LegalBlock[] };
export type LegalDoc = {
  title: string;
  effective?: string;
  updated?: string;
  facts?: [string, string][];
  note?: string;
  sections: LegalSection[];
  closing?: string[];
};
