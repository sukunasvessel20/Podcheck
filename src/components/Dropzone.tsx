"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";

interface DropzoneProps {
  onFilesAdded: (files: File[]) => void;
  disabled?: boolean;
  selectedCount: number;
}

export default function Dropzone({ onFilesAdded, disabled = false, selectedCount }: DropzoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFilesAdded(acceptedFiles);
      }
    },
    [onFilesAdded],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled,
    multiple: true,
    accept: {
      "audio/*": [],
    },
  });

  const className = [
    "ui-dropzone",
    isDragActive ? "is-active" : "",
    disabled ? "is-disabled" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div {...getRootProps({ className })}>
      <input {...getInputProps()} />
      <div className="ui-dropzone-title">Drag & drop audio files here</div>
      <div className="ui-dropzone-subtitle">or click to choose multiple files</div>
      <div className="ui-dropzone-privacy">🔒 Runs locally — files never upload</div>
      <div className="ui-dropzone-count">Selected files: {selectedCount}</div>
    </div>
  );
}
