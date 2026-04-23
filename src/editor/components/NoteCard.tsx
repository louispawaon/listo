import React from "react";
import type { ListoNoteBlock } from "../../types/listo";
import { CardShell } from "./CardShell";
import { TextArea, TextField } from "./Field";

interface NoteCardProps {
  block: ListoNoteBlock;
  onChange: (patch: Partial<ListoNoteBlock>) => void;
  onRemove: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  dragHandleRef?: React.Ref<HTMLButtonElement>;
}

export function NoteCard({
  block,
  onChange,
  onRemove,
  dragHandleProps,
  dragHandleRef,
}: NoteCardProps): React.ReactElement {
  return (
    <CardShell
      title={block.title || "Note"}
      onRemove={onRemove}
      {...(dragHandleProps !== undefined ? { dragHandleProps } : {})}
      {...(dragHandleRef !== undefined ? { dragHandleRef } : {})}
    >
      <TextField
        label="Title"
        value={block.title}
        onChange={(title) => { onChange({ title }); }}
      />
      <TextArea
        label="Content"
        value={block.content}
        onChange={(content) => { onChange({ content }); }}
        rows={4}
      />
    </CardShell>
  );
}
