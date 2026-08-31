'use client';

import React, { useState, useRef } from 'react';
import { X, Upload, FileText, AlertTriangle, CheckCircle, FileCode } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useTaskStore, validateImportedRow } from '../../store/taskStore';
import { Task } from '../../types/task';

interface UploadTaskListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UploadTaskListModal: React.FC<UploadTaskListModalProps> = ({ isOpen, onClose }) => {
  const { addMultipleTasks } = useTaskStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [rowValidations, setRowValidations] = useState<{ rowNum: number; valid: boolean; error?: string; task?: any }[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<{ count: number; errors: string[] } | null>(null);

  if (!isOpen) return null;

  const validCount = rowValidations.filter((r) => r.valid).length;
  const invalidCount = rowValidations.filter((r) => !r.valid).length;

  const processRows = (rows: any[]) => {
    if (!rows || rows.length === 0) {
      setFileError('No tasks found in the uploaded file.');
      setRawRows([]);
      setRowValidations([]);
      return;
    }

    const validations = rows.map((r, idx) => {
      const res = validateImportedRow(r, idx + 1);
      return {
        rowNum: idx + 1,
        valid: res.valid,
        error: res.error,
        task: res.task,
      };
    });

    setRawRows(rows);
    setRowValidations(validations);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError(null);
    setUploadResult(null);
    setFileName(file.name);

    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    // Check allowed file types: .json, .csv, .xlsx
    if (ext !== '.json' && ext !== '.csv' && ext !== '.xlsx') {
      setFileError(`Unsupported file format "${ext}". Please upload a .json, .csv, or .xlsx file.`);
      setRawRows([]);
      setRowValidations([]);
      return;
    }

    try {
      if (ext === '.xlsx') {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          setFileError('The Excel file contains no worksheets.');
          return;
        }
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const sheetData = XLSX.utils.sheet_to_json(worksheet);
        processRows(sheetData);
      } else if (ext === '.json') {
        const text = await file.text();
        try {
          const parsed = JSON.parse(text);
          const arrayData = Array.isArray(parsed) ? parsed : parsed.tasks || [];
          processRows(arrayData);
        } catch (err) {
          setFileError('Malformed JSON file syntax. Could not parse file.');
        }
      } else if (ext === '.csv') {
        const text = await file.text();
        const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
        if (lines.length === 0) {
          setFileError('No tasks found in the uploaded file.');
          return;
        }

        const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
        const rows: any[] = [];

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (!line) continue;
          const cols = line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
          const rowObj: Record<string, string> = {};
          headers.forEach((h, idx) => {
            if (cols[idx] !== undefined) {
              rowObj[h] = cols[idx];
            }
          });
          rows.push(rowObj);
        }
        processRows(rows);
      }
    } catch (err) {
      console.error('File reading error:', err);
      setFileError('Failed to read file content.');
    }
  };

  const handleConfirmUpload = () => {
    const validTasksToPush = rowValidations.filter((r) => r.valid && r.task).map((r) => r.task);
    if (validTasksToPush.length === 0) {
      setFileError('No valid rows available to import.');
      return;
    }

    // Add to Master Task List (sequential multiple upload support)
    const res = addMultipleTasks(validTasksToPush);
    const rejectedErrors = rowValidations.filter((r) => !r.valid).map((r) => r.error || `Row ${r.rowNum}: Invalid row.`);
    setUploadResult({ count: res.addedCount, errors: rejectedErrors });

    if (res.success) {
      setTimeout(() => {
        onClose();
        handleReset();
      }, 1500);
    }
  };

  const handleReset = () => {
    setFileName(null);
    setRawRows([]);
    setRowValidations([]);
    setFileError(null);
    setUploadResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center pointer-events-auto">
      <div className="w-[620px] bg-workspace border border-border shadow-xl flex flex-col rounded-sm overflow-hidden z-50 max-h-[85vh]">
        {/* Header */}
        <div className="h-[36px] bg-app border-b border-border flex items-center justify-between px-3 font-semibold text-[13px] tracking-wide text-text">
          <span>UPLOAD TASK LIST (JSON / CSV / XLSX)</span>
          <button onClick={() => { handleReset(); onClose(); }} className="p-1 hover:bg-toolbar text-muted hover:text-text rounded">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col gap-4 text-[12px] overflow-y-auto">
          {/* File Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border hover:border-accent bg-white p-6 rounded flex flex-col items-center justify-center cursor-pointer transition-colors"
          >
            <Upload size={32} className="text-accent mb-2" />
            <span className="font-semibold text-text">
              {fileName ? fileName : 'Click to Browse File (.json, .csv, .xlsx)'}
            </span>
            <span className="text-[11px] text-muted mt-1">
              Expected columns: Task Type, Source, Target, Priority, Weight
            </span>
            <a
              href="/demo_tasks.csv"
              download="demo_tasks.csv"
              className="text-accent text-[11px] underline mt-2 z-10"
              onClick={(e) => e.stopPropagation()}
            >
              Download Demo CSV
            </a>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv, .json, .xlsx, text/csv, application/json, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Feedback Messages */}
          {fileError && (
            <div className="p-3 bg-danger/10 border border-danger/40 text-danger text-[12px] rounded flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{fileError}</span>
            </div>
          )}

          {uploadResult && (
            <div
              className={`p-3 rounded border text-[12px] ${
                uploadResult.count > 0 ? 'bg-success/10 border-success/40 text-success' : 'bg-danger/10 border-danger/40 text-danger'
              }`}
            >
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle size={16} />
                <span>
                  {uploadResult.count} task(s) imported successfully.
                  {uploadResult.errors.length > 0 && ` ${uploadResult.errors.length} row(s) rejected.`}
                </span>
              </div>
              {uploadResult.errors.length > 0 && (
                <div className="mt-2 text-[11px] text-danger space-y-1 max-h-[90px] overflow-y-auto">
                  <div className="font-bold">Rejection Reasons:</div>
                  {uploadResult.errors.map((err, idx) => (
                    <div key={idx}>• {err}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Validation Breakdown & Preview */}
          {rowValidations.length > 0 && !uploadResult && (
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center bg-app p-2 rounded border border-border text-[11px]">
                <div>
                  <span className="font-semibold text-text">Validation Summary:</span>{' '}
                  <span className="text-success font-bold">{validCount} Valid</span> |{' '}
                  <span className="text-danger font-bold">{invalidCount} Rejected</span>
                </div>
                <span className="text-muted text-[10px]">Auto Task IDs will be assigned to valid rows</span>
              </div>

              {invalidCount > 0 && (
                <div className="p-2.5 bg-warning/10 border border-warning/40 text-warning text-[11px] rounded space-y-1 max-h-[85px] overflow-y-auto">
                  <div className="font-bold flex items-center gap-1">
                    <AlertTriangle size={13} /> Row Rejections ({invalidCount}):
                  </div>
                  {rowValidations.filter((r) => !r.valid).map((r, i) => (
                    <div key={i}>• {r.error}</div>
                  ))}
                </div>
              )}

              {validCount > 0 && (
                <div className="border border-border rounded bg-white max-h-[160px] overflow-y-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-app text-muted font-medium border-b border-border sticky top-0">
                      <tr>
                        <th className="p-2">Row</th>
                        <th className="p-2">Task Type</th>
                        <th className="p-2">Source</th>
                        <th className="p-2">Target</th>
                        <th className="p-2">Priority</th>
                        <th className="p-2">Weight</th>
                        <th className="p-2">Validation Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {rowValidations.map((r, i) => (
                        <tr key={i} className={r.valid ? 'hover:bg-workspace' : 'bg-danger/5'}>
                          <td className="p-2 font-mono">{r.rowNum}</td>
                          <td className="p-2">{r.task?.task_type || '-'}</td>
                          <td className="p-2">{r.task?.pickup_point || '-'}</td>
                          <td className="p-2">{r.task?.drop_point || '-'}</td>
                          <td className="p-2 font-medium">{r.task?.priority || '-'}</td>
                          <td className="p-2">{r.task?.weight || '-'} kg</td>
                          <td className="p-2 font-semibold">
                            {r.valid ? (
                              <span className="text-success flex items-center gap-1">✓ Valid</span>
                            ) : (
                              <span className="text-danger flex items-center gap-1">✕ Rejected</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 bg-app border-t border-border flex justify-between items-center">
          <button
            onClick={handleReset}
            className="px-3 py-1.5 text-muted hover:text-text font-medium text-[11px]"
          >
            Clear File
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => { handleReset(); onClose(); }}
              className="px-4 py-1.5 bg-workspace border border-border rounded text-[12px] hover:bg-toolbar font-medium"
            >
              Cancel
            </button>
            <button
              disabled={validCount === 0}
              onClick={handleConfirmUpload}
              className={`px-4 py-1.5 rounded text-[12px] font-medium shadow-sm flex items-center gap-1.5 ${
                validCount > 0
                  ? 'bg-accent text-white hover:bg-opacity-90'
                  : 'bg-border text-muted cursor-not-allowed'
              }`}
            >
              <FileText size={14} />
              IMPORT {validCount} VALID TASK(S)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
