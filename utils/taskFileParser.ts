import * as XLSX from 'xlsx';
import { Task } from '../types/task';
import { TaskType, TaskPriority } from '../types/task';

/** Mapping from human‑readable column values to internal enum values */
const TYPE_MAP: Record<string, TaskType> = {
  'Deliver Item': 'DELIVER_ITEM',
  'Restock Shelf': 'RESTOCK_SHELF',
  'Take to Packing': 'TAKE_TO_PACKING',
  'Store Item': 'STORE_ITEM',
  'Move Container': 'MOVE_CONTAINER',
};

const PRIORITY_MAP: Record<string, TaskPriority> = {
  urgent: 'URGENT',
  low: 'LOW',
  normal: 'NORMAL',
};

/** Convert a raw spreadsheet row (CSV/XLSX) to the shape expected by `normalizeTask` */
function mapRawRow(row: Record<string, any>): Record<string, any> {
  const get = (keys: string[]) => {
    for (const k of keys) {
      if (row[k] !== undefined) return row[k];
    }
    return undefined;
  };

  const rawType = get(['Task Type', 'task type', 'type']);
  const rawPriority = get(['Priority', 'priority']);
  const rawSource = get(['Source', 'source', 'Pickup', 'pickup_point']);
  const rawTarget = get(['Target', 'target', 'Destination', 'drop_point']);
  const rawWeight = get(['Weight', 'weight']);
  const rawStatus = get(['Status', 'status']);

  const mapped: Record<string, any> = {};

  if (rawType) {
    mapped.task_type = TYPE_MAP[rawType] ?? rawType;
  }
  if (rawPriority) {
    const lowered = String(rawPriority).toLowerCase();
    mapped.priority = PRIORITY_MAP[lowered] ?? rawPriority;
  }
  if (rawSource) mapped.pickup_point = rawSource;
  if (rawTarget) mapped.drop_point = rawTarget;
  if (rawWeight !== undefined) mapped.weight = Number(rawWeight);
  if (rawStatus) mapped.status = rawStatus;

  return mapped;
}

/** Normalizes a raw row (already mapped) into a full `Task` object. */
function normalizeTask(row: Record<string, any>): Task {
  const toNumber = (val: any) => (val === '' || val === undefined || val === null ? undefined : Number(val));
  const toStringOrNull = (val: any) => (val === '' || val === undefined || val === null ? null : String(val));

  return {
    task_id: undefined,
    task_type: String(row.task_type),
    pickup_point: String(row.pickup_point),
    drop_point: String(row.drop_point),
    priority: String(row.priority) as any,
    weight: toNumber(row.weight) ?? 0,
    status: row.status ? String(row.status) : 'PENDING',
    assigned_robot_id: toStringOrNull(row.assigned_robot_id),
    created_time: row.created_time ? String(row.created_time) : new Date().toISOString(),
    assigned_time: toStringOrNull(row.assigned_time),
    started_time: toStringOrNull(row.started_time),
    completed_time: toStringOrNull(row.completed_time),
    failed_time: toStringOrNull(row.failed_time),
    reassigned_count: toNumber(row.reassigned_count) ?? 0,
    failure_reason: toStringOrNull(row.failure_reason),
  } as Task;
}

/** Parse a task file based on its extension. Supports JSON, CSV, and XLSX. */
export function parseTaskFile(content: string | ArrayBuffer, ext: string): Task[] {
  if (ext === 'json') {
    const data = JSON.parse(content as string);
    if (!Array.isArray(data)) throw new Error('JSON file must contain an array of tasks');
    return data.map((t) => ({ ...t, status: t.status || 'PENDING' } as Task));
  }

  if (ext === 'csv') {
    const text = content as string;
    const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
    if (lines.length === 0) return [];
    const header = lines[0].split(',').map((h) => h.trim());
    const rawRows: Record<string, any>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim());
      const row: Record<string, any> = {};
      header.forEach((col, idx) => {
        row[col] = values[idx] ?? '';
      });
      rawRows.push(row);
    }
    const mappedRows = rawRows.map(mapRawRow);
    return mappedRows.map(normalizeTask);
  }

  if (ext === 'xlsx') {
    const workbook = XLSX.read(content as ArrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
    const mappedRows = rawRows.map(mapRawRow);
    return mappedRows.map(normalizeTask);
  }

  throw new Error(`Unsupported file extension: ${ext}`);
}
