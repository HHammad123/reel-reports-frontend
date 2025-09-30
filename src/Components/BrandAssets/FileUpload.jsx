import React, { useEffect, useRef, useState } from 'react';

export default function FileUpload({
  label = 'Upload Files',
  accept = '*/*',
  multiple = true,
  maxSizeMB = 50,
  fileTypes = [],
  onFilesChange,
}) {
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState([]);
  const inputRef = useRef(null);

  const validate = (file) => {
    const errs = [];
    if (fileTypes.length > 0 && !fileTypes.some(t => (file.type || '').includes(t) || (file.name || '').toLowerCase().endsWith(t))) {
      errs.push(`Unsupported type: ${file.type || file.name}`);
    }
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) errs.push(`File too large: ${(file.size/1024/1024).toFixed(1)}MB > ${maxSizeMB}MB`);
    return errs;
  };

  const addFiles = (list) => {
    const arr = Array.from(list || []);
    const next = [...files];
    const errs = [];
    arr.forEach(f => {
      const e = validate(f);
      if (e.length === 0) next.push(f); else errs.push(...e);
    });
    setFiles(next);
    setErrors(errs);
  };

  const onInputChange = (e) => addFiles(e.target.files);
  const onDrop = (e) => { e.preventDefault(); addFiles(e.dataTransfer.files); };
  const onDragOver = (e) => e.preventDefault();

  useEffect(() => { if (onFilesChange) onFilesChange(files); }, [files]);

  return (
    <div>
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors"
      >
        <p className="text-sm text-gray-700 mb-2">{label}</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm"
        >
          Choose Files
        </button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={accept}
          multiple={multiple}
          onChange={onInputChange}
        />
        <p className="mt-2 text-xs text-gray-500">Max size {maxSizeMB}MB. Drag and drop supported.</p>
      </div>

      {errors.length > 0 && (
        <div className="mt-2 text-sm text-red-600">
          {errors.map((e, i) => <div key={i}>{e}</div>)}
        </div>
      )}

      {files.length > 0 && (
        <div className="mt-3 space-y-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center justify-between p-2 border rounded">
              <div className="text-sm text-gray-800 truncate mr-2">{f.name} <span className="text-gray-500">({(f.size/1024/1024).toFixed(2)} MB)</span></div>
              <button type="button" className="text-red-600 text-sm hover:underline" onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}>Remove</button>
            </div>
          ))}
          {files.length > 0 && (
            <button type="button" className="text-xs text-gray-600 hover:underline" onClick={() => setFiles([])}>Clear all</button>
          )}
        </div>
      )}
    </div>
  );
}

