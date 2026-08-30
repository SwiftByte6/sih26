'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Upload,
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
} from 'lucide-react';
import { useTaskStore } from '../../store/taskStore';
import { AddTaskModal } from './AddTaskModal';
import { UploadTaskListModal } from './UploadTaskListModal';
import { TaskStatus, TaskPriority } from '../../types/task';

export const TaskManagementPanel: React.FC = () => {
  const {
    tasks,
    updatePriority,
    saveTasks,
    loadTasks,
  } = useTaskStore();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
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
    input.accept = '.json, application/json';
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const content = ev.target?.result as string;
          if (content) {
            const success = loadTasks(content);
            if (success) {
              setFeedbackMsg({ type: 'success', text: 'Master Task List state restored successfully.' });
            } else {
              setFeedbackMsg({ type: 'error', text: 'Failed to restore tasks. Invalid JSON state format.' });
            }
            setTimeout(() => setFeedbackMsg(null), 4000);
          }
        };
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

          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-app border border-border rounded text-[12px] font-medium text-text hover:bg-workspace transition-colors"
          >
            <Upload size={15} />
            Upload Task List
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

      {/* Master Task Table Container - Exactly 8 Columns */}
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
                <th className="p-3">ASSIGNED AMR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted">
                    No tasks found. Click <strong>+ Add Task</strong> or <strong>Upload Task List</strong> to get started.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((t) => (
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
                    <td className="p-3 border-r border-border font-mono">{t.weight} kg</td>
                    <td className="p-3 border-r border-border">
                      <div className="flex items-center gap-2">
                        {renderStatusBadge(t.status)}
                        {(t.status === 'COMPLETED' || t.status === 'FAILED') && (
                          <button 
                            onClick={() => handleRedo(t.task_id)} 
                            className="p-1 hover:bg-workspace border border-transparent hover:border-border rounded text-muted hover:text-text transition-colors" 
                            title="Redo Task"
                          >
                            <RotateCcw size={12} />
                          </button>
                        )}
                      </div>
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <AddTaskModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
      <UploadTaskListModal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} />
    </div>
  );
};
