'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Save,
  Download,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  Zap,
  Bot,
  Filter,
  ArrowUpDown,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { useTaskStore } from '../../store/taskStore';
import { useWarehouseStore } from '../../store/warehouseStore';
import { AddTaskModal } from './AddTaskModal';

import { TaskStatus, TaskPriority, Task } from '../../types/task';

export const TaskManagementPanel: React.FC = () => {
  const {
    tasks,
    updatePriority,
    deleteTask,
    saveTasks,
    // loadTasks retained for backward compatibility
    loadTasks,
    importTasks,
  } = useTaskStore();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Status stats
  const pendingCount = tasks.filter((t) => t.status === 'PENDING' || t.status === 'REASSIGNED').length;
  const assignedCount = tasks.filter((t) => t.status === 'ASSIGNED').length;
  const activeCount = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const completedCount = tasks.filter((t) => t.status === 'COMPLETED').length;
  const failedCount = tasks.filter((t) => t.status === 'FAILED').length;

  // Main table displays tasks in stable Task ID / Creation order
  const filteredTasks = tasks.filter((t) => {
    if (filterStatus !== 'ALL' && t.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.task_id.toLowerCase().includes(q) ||
        t.pickup_point.toLowerCase().includes(q) ||
        t.drop_point.toLowerCase().includes(q) ||
        (t.assigned_robot_id && t.assigned_robot_id.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleSaveToFile = () => {
    const jsonStr = saveTasks();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `warehouse_tasks_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setFeedbackMsg({ type: 'success', text: 'Current Master Task List exported to JSON.' });
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleLoadFromFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.csv,.xlsx';
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (!file) return;

      const ext = file.name.split('.').pop()?.toLowerCase();
      const reader = new FileReader();

      reader.onload = async (ev) => {
        const content = ev.target?.result;
        if (!content) return;
        try {
          const { parseTaskFile } = await import('../../utils/taskFileParser');
          const tasks = parseTaskFile(content as any, ext!);
          const success = importTasks(tasks);
          if (success) {
            setFeedbackMsg({ type: 'success', text: `Loaded ${tasks.length} tasks from ${ext?.toUpperCase()} file.` });
          } else {
            setFeedbackMsg({ type: 'error', text: 'Failed to import tasks.' });
          }
        } catch (err) {
          console.error(err);
          setFeedbackMsg({ type: 'error', text: 'Error parsing task file.' });
        }
        setTimeout(() => setFeedbackMsg(null), 4000);
      };

      if (ext === 'xlsx') {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const renderStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-warning/15 text-warning border border-warning/30 flex items-center gap-1 w-fit">
            <Clock size={12} /> PENDING
          </span>
        );
      case 'ASSIGNED':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-accent/15 text-accent border border-accent/30 flex items-center gap-1 w-fit">
            <Bot size={12} /> ASSIGNED
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-path/20 text-path border border-path/40 flex items-center gap-1 w-fit animate-pulse">
            <Zap size={12} /> IN_PROGRESS
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-success/15 text-success border border-success/30 flex items-center gap-1 w-fit">
            <CheckCircle2 size={12} /> COMPLETED
          </span>
        );
      case 'FAILED':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-danger/15 text-danger border border-danger/30 flex items-center gap-1 w-fit">
            <AlertTriangle size={12} /> FAILED
          </span>
        );
      case 'REASSIGNED':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-warning/20 text-warning border border-warning/40 flex items-center gap-1 w-fit">
            <RotateCcw size={12} /> REASSIGNED
          </span>
        );
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-muted text-white">{status}</span>;
    }
  };

  const renderPriorityBadge = (task: any) => {
    switch (task.priority) {
      case 'URGENT':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-danger/15 text-danger border border-danger/30 uppercase tracking-wider">
            ⚡ URGENT
          </span>
        );
      case 'LOW':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-app text-muted border border-border uppercase">
            LOW
          </span>
        );
      case 'NORMAL':
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-toolbar text-text border border-border uppercase">
            NORMAL
          </span>
        );
    }
  };

  return (
    <div className="flex-1 bg-workspace flex flex-col overflow-hidden text-text select-none">
      {/* Top Controls Bar */}
      <div className="h-[48px] bg-toolbar border-b border-border px-4 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white rounded text-[12px] font-medium hover:bg-opacity-90 transition-colors shadow-sm"
          >
            <Plus size={15} />
            + Add Task
          </button>



          <div className="w-px h-5 bg-border mx-1" />

          <button
            onClick={handleSaveToFile}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-app border border-border rounded text-[12px] font-medium text-text hover:bg-workspace"
            title="Save Tasks JSON"
          >
            <Save size={14} />
            Save Tasks
          </button>

          <button
            onClick={handleLoadFromFile}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-app border border-border rounded text-[12px] font-medium text-text hover:bg-workspace"
            title="Load Tasks JSON"
          >
            <Download size={14} />
            Load Tasks
          </button>
        </div>

        {/* Metrics Summary Badges */}
        <div className="flex items-center gap-2 text-[11px]">
          <div className="px-2.5 py-1 bg-white border border-border rounded flex items-center gap-1.5 font-medium">
            <span className="text-muted">Total:</span>
            <span className="font-bold text-text">{tasks.length}</span>
          </div>
          <div className="px-2.5 py-1 bg-white border border-border rounded flex items-center gap-1.5 font-medium">
            <span className="text-warning font-semibold">Pending:</span>
            <span className="font-bold text-warning">{pendingCount}</span>
          </div>
          <div className="px-2.5 py-1 bg-white border border-border rounded flex items-center gap-1.5 font-medium">
            <span className="text-accent font-semibold">Assigned:</span>
            <span className="font-bold text-accent">{assignedCount}</span>
          </div>
          <div className="px-2.5 py-1 bg-white border border-border rounded flex items-center gap-1.5 font-medium">
            <span className="text-path font-semibold">In Progress:</span>
            <span className="font-bold text-path">{activeCount}</span>
          </div>
          <div className="px-2.5 py-1 bg-white border border-border rounded flex items-center gap-1.5 font-medium">
            <span className="text-success font-semibold">Completed:</span>
            <span className="font-bold text-success">{completedCount}</span>
          </div>
          {failedCount > 0 && (
            <div className="px-2.5 py-1 bg-white border border-border rounded flex items-center gap-1.5 font-medium">
              <span className="text-danger font-semibold">Failed:</span>
              <span className="font-bold text-danger">{failedCount}</span>
            </div>
          )}
        </div>
      </div>

      {feedbackMsg && (
        <div
          className={`px-4 py-2 text-[12px] font-semibold flex items-center justify-between border-b ${
            feedbackMsg.type === 'success' ? 'bg-success/10 border-success/30 text-success' : 'bg-danger/10 border-danger/30 text-danger'
          }`}
        >
          <span>{feedbackMsg.text}</span>
          <button onClick={() => setFeedbackMsg(null)} className="text-[11px] underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Filter and Table Ordering Info */}
      <div className="bg-white border-b border-border px-4 py-2 flex items-center justify-between gap-4 text-[12px] shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-workspace px-2.5 py-1 rounded border border-border">
            <Filter size={14} className="text-muted" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent text-text font-medium focus:outline-none text-[12px]"
            >
              <option value="ALL">All Statuses ({tasks.length})</option>
              <option value="PENDING">PENDING ({pendingCount})</option>
              <option value="ASSIGNED">ASSIGNED ({assignedCount})</option>
              <option value="IN_PROGRESS">IN_PROGRESS ({activeCount})</option>
              <option value="COMPLETED">COMPLETED ({completedCount})</option>
              <option value="FAILED">FAILED ({failedCount})</option>
            </select>
          </div>

          <input
            type="text"
            placeholder="Search by Task ID, Pickup, Drop, AMR..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-2.5 py-1 bg-workspace border border-border rounded text-text w-[260px] focus:outline-none focus:border-accent text-[12px]"
          />
        </div>

        <div className="flex items-center gap-2 text-[11px] text-muted bg-toolbar px-3 py-1 rounded border border-border">
          <ArrowUpDown size={13} className="text-accent" />
          <span>
            <strong>Table Order:</strong> Sequential Task ID / Creation order. <em>Pending Queue Order: URGENT → LOW → NORMAL</em>
          </span>
        </div>
      </div>

      {/* Master Task Table Container - 9 Columns */}
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white border border-border rounded shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse text-[12px]">
            <thead className="bg-app text-muted font-bold border-b border-border text-[11px] uppercase tracking-wider sticky top-0 z-10">
              <tr>
                <th className="p-3 border-r border-border">ID</th>
                <th className="p-3 border-r border-border">TYPE</th>
                <th className="p-3 border-r border-border">SOURCE</th>
                <th className="p-3 border-r border-border">DESTINATION</th>
                <th className="p-3 border-r border-border">PRIORITY</th>
                <th className="p-3 border-r border-border">WEIGHT</th>
                <th className="p-3 border-r border-border">STATUS</th>
                <th className="p-3 border-r border-border">ASSIGNED AMR</th>
                <th className="p-3 border-r border-border">DELETE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted">
                    No tasks found. Click <strong>+ Add Task</strong> to get started.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((t) => {
                  const canDelete = t.status === 'PENDING' && t.assigned_robot_id === null && !t.started_time;

                  return (
                    <tr key={t.task_id} className="hover:bg-workspace/80 transition-colors">
                      <td className="p-3 font-bold text-accent border-r border-border font-mono">{t.task_id}</td>
                      <td className="p-3 border-r border-border font-medium">
                        {t.task_type.replace(/_/g, ' ')}
                      </td>
                      <td className="p-3 border-r border-border font-semibold text-text">{t.pickup_point}</td>
                      <td className="p-3 border-r border-border font-semibold text-text">{t.drop_point}</td>
                      <td className="p-3 border-r border-border">
                        <div className="flex items-center gap-1.5">
                          {renderPriorityBadge(t)}
                          {t.deliveryComplexity && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-purple-100 text-purple-900 border border-purple-300">
                              {t.deliveryComplexity}
                            </span>
                          )}
                          {t.status === 'PENDING' && (
                            <select
                              value={t.priority}
                              onChange={(e) => updatePriority(t.task_id, e.target.value as TaskPriority)}
                              className="text-[10px] bg-workspace border border-border rounded px-1 py-0.5 focus:outline-none focus:border-accent text-text ml-1"
                              title="Change priority (recalculates pending execution sequence)"
                            >
                              <option value="URGENT">URGENT</option>
                              <option value="LOW">LOW</option>
                              <option value="NORMAL">NORMAL</option>
                            </select>
                          )}
                        </div>
                      </td>
                      <td className="p-3 border-r border-border font-mono">{t.weight || 0} kg</td>
                      <td className="p-3 border-r border-border">
                        <div className="flex items-center gap-2">
                          {renderStatusBadge(t.status)}
                          {(t.status === 'COMPLETED' || t.status === 'FAILED') && (
                            <button 
                              onClick={() => {
                                const redoTask = useTaskStore.getState().redoTask;
                                if (redoTask) redoTask(t.task_id);
                              }} 
                              className="p-1 hover:bg-workspace border border-transparent hover:border-border rounded text-muted hover:text-text transition-colors" 
                              title="Redo Task"
                            >
                              <RotateCcw size={12} />
                            </button>
                          )}
                        </div>
                        {t.status === 'PENDING' && t.priority === 'URGENT' && (
                          (() => {
                            const warehouseRobots = useWarehouseStore.getState().robots;
                            const freeCount = warehouseRobots.filter((r) => (r.state === 'WAITING' || r.state === 'IDLE') && !r.currentTask && r.isOnline !== false).length;
                            if (freeCount === 0) {
                              return (
                                <div className="mt-1.5 px-2 py-0.5 bg-amber-600 text-white rounded text-[9.5px] font-bold tracking-wide uppercase font-mono animate-pulse w-fit border border-amber-700 shadow-sm">
                                  URGENT — WAITING FOR AMR
                                </div>
                              );
                            }
                            return null;
                          })()
                        )}
                        {t.handoverAudit && (
                          <div className="mt-1.5 p-1.5 bg-blue-50 border border-blue-300 text-blue-950 rounded text-[10px] font-mono leading-tight max-w-[280px]">
                            <span className="font-bold uppercase tracking-wider text-[9px] text-blue-900 block mb-0.5">🤝 Dyn Handover ({t.handoverAudit.handoverReason}):</span>
                            {t.handoverAudit.originalRobotId} → {t.handoverAudit.replacementRobotId || 'HANDING OVER...'}
                          </div>
                        )}
                        {t.recoveryAudit && (
                          <div className="mt-1.5 p-1.5 bg-amber-50 border border-amber-300 text-amber-950 rounded text-[10px] font-mono leading-tight max-w-[280px]">
                            <span className="font-bold uppercase tracking-wider text-[9px] text-amber-900 block mb-0.5">🔄 Decen Recovery:</span>
                            {t.recoveryAudit.failedRobotId} FAILED → {t.recoveryAudit.recoveredRobotId || 'RECOVERING...'}
                          </div>
                        )}
                        {t.status === 'FAILED' && t.failure_reason && (
                          <div className="mt-1.5 p-1.5 bg-rose-100 border border-rose-300 text-rose-950 rounded text-[10px] font-mono leading-tight max-w-[280px]">
                            <span className="font-bold uppercase tracking-wider text-[9px] text-rose-900 block mb-0.5">⚠️ Failure Reason:</span>
                            {t.failure_reason}
                          </div>
                        )}
                        {t.status === 'PENDING' && t.ineligibilityAudit && Object.keys(t.ineligibilityAudit).length > 0 && (
                          <div className="mt-1.5 p-1.5 bg-rose-50 border border-rose-200 text-rose-900 rounded text-[10px] font-mono flex flex-col gap-0.5 max-w-[280px]">
                            <div className="font-bold text-[9px] uppercase tracking-wider text-rose-800 flex items-center gap-1">
                              <span>⚠️ Fleet Non-Bidding Reasons:</span>
                            </div>
                            {Object.entries(t.ineligibilityAudit).map(([rId, reasons]) => (
                              <div key={rId} className="leading-tight text-[9.5px]">
                                <span className="font-bold text-rose-950">{rId}:</span> {reasons.join(', ')}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="p-3 font-semibold font-mono">
                        {t.assigned_robot_id ? (
                          <span className="px-2 py-0.5 rounded bg-app border border-border text-text flex items-center gap-1 w-fit">
                            🤖 {t.assigned_robot_id}
                          </span>
                        ) : (
                          <span className="text-muted font-normal italic">— Unassigned</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => canDelete && setTaskToDelete(t)}
                          disabled={!canDelete}
                          className={`p-1.5 rounded transition-colors ${
                            canDelete
                              ? 'text-danger hover:bg-danger/10 border border-danger/30 cursor-pointer'
                              : 'text-muted/40 bg-workspace border border-border cursor-not-allowed opacity-40'
                          }`}
                          title={canDelete ? `Delete Task ${t.task_id}` : 'Started or assigned tasks cannot be deleted'}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Task Confirmation Modal */}
      {taskToDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-workspace border border-border rounded-lg shadow-xl max-w-md w-full p-5 flex flex-col gap-4 text-text animate-in fade-in">
            <div className="flex items-center gap-2 text-danger border-b border-border pb-3">
              <AlertCircle size={20} />
              <h3 className="font-bold text-base">Delete this task?</h3>
            </div>

            <div className="bg-app border border-border rounded p-3 flex flex-col gap-2 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-muted">Task ID:</span>
                <span className="font-bold text-accent">{taskToDelete.task_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Pickup:</span>
                <span className="font-bold">{taskToDelete.pickup_point}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Drop:</span>
                <span className="font-bold">{taskToDelete.drop_point}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Priority:</span>
                <span className="font-bold">{taskToDelete.priority}</span>
              </div>
            </div>

            <div className="text-[11px] text-muted leading-relaxed">
              Are you sure you want to delete task <strong>{taskToDelete.task_id}</strong>? This action will remove it from the task queue and P2P agent memory.
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                onClick={() => setTaskToDelete(null)}
                className="px-3 py-1.5 bg-app border border-border rounded text-xs font-medium hover:bg-workspace transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const res = deleteTask(taskToDelete.task_id);
                  if (res.success) {
                    setFeedbackMsg({ type: 'success', text: `Task ${taskToDelete.task_id} deleted.` });
                  } else {
                    setFeedbackMsg({ type: 'error', text: res.error || 'Started or assigned tasks cannot be deleted.' });
                  }
                  setTaskToDelete(null);
                  setTimeout(() => setFeedbackMsg(null), 3000);
                }}
                className="px-3 py-1.5 bg-danger text-white rounded text-xs font-bold hover:bg-opacity-90 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <AddTaskModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />

    </div>
  );
};
