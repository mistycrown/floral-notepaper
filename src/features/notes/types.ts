export type NoteType = "text" | "list";

export interface OutlineNode {
  id: string;
  text: string;
  depth: number;
  kind: "bullet" | "todo";
  checked: boolean;
  collapsed: boolean;
}

export interface NoteMetadata {
  id: string;
  title: string;
  fileName: string;
  category: string;
  createdAt: string;
  updatedAt: string;
  wordCount: number;
  preview: string;
  tags?: string[];
  tileColor?: string;
  tileAccentColor?: string;
  noteType?: NoteType;
  outlineNodes?: OutlineNode[];
}

export interface Note extends Omit<NoteMetadata, "preview"> {
  content: string;
}

export interface SaveNoteRequest {
  title: string;
  content: string;
  category: string;
  noteType?: NoteType;
  outlineNodes?: OutlineNode[];
}

export interface ExternalFile {
  id: string;
  title: string;
  filePath: string;
}
