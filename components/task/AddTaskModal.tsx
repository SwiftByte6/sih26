'use client';

import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { useTaskStore, generateNextTaskId } from '../../store/taskStore';
import { useWarehouseStore } from '../../store/warehouseStore';
import { TaskType, TaskPriority } from '../../types/task';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TASK_TYPES: { label: string; value: TaskType; pickupLabel: string; dropLabel: string }[] = [
  {
    label: 'Deliver Item',
    value: 'DELIVER_ITEM',
    pickupLabel: 'Pickup Point',
    dropLabel: 'Drop Point',
  },
  {
    label: 'Restock Shelf',
    value: 'RESTOCK_SHELF',
    pickupLabel: 'Storage Location',
    dropLabel: 'Shelf',
  },
  {
    label: 'Take to Packing',
    value: 'TAKE_TO_PACKING',
    pickupLabel: 'Shelf',
    dropLabel: 'Packing Area',
  },
  {
    label: 'Store Item',
    value: 'STORE_ITEM',
    pickupLabel: 'Source Location',
    dropLabel: 'Storage Location',
  },
  {
    label: 'Move Container',
    value: 'MOVE_CONTAINER',
    pickupLabel: 'Source Container',
    dropLabel: 'Destination Container',
  },
];

// Helper to filter allowed source options strictly by task type
const getFilteredSourceOptions = (
  type: TaskType,
  pois: { id: string; type: string; label: string }[],
  shelves: { id: string }[]
): { label: string; value: string }[] => {
  switch (type) {
    case 'DELIVER_ITEM':
    case 'STORE_ITEM':
      // ONLY pickup locations (exclude CHARGER and DROP)
      return [
        ...pois.filter((p) => p.type === 'PICKUP').map((p) => ({ label: p.label, value: p.label })),
        { label: 'P1', value: 'P1' },
        { label: 'P3', value: 'P3' },
      ];

    case 'RESTOCK_SHELF':
      // ONLY storage locations
      return [
        { label: 'Storage-01', value: 'Storage-01' },
        { label: 'Storage-02', value: 'Storage-02' },
      ];

    case 'TAKE_TO_PACKING':
      // ONLY shelves
      return shelves.map((s) => ({ label: `Shelf ${s.id}`, value: `Shelf ${s.id}` }));

    case 'MOVE_CONTAINER':
      // ONLY containers/bins
      return [
        { label: 'Bin-A', value: 'Bin-A' },
        { label: 'Bin-B', value: 'Bin-B' },
      ];

    default:
      return [];
  }
};

// Helper to filter allowed target options strictly by task type
const getFilteredTargetOptions = (
  type: TaskType,
  pois: { id: string; type: string; label: string }[],
  shelves: { id: string }[]
): { label: string; value: string }[] => {
  switch (type) {
    case 'DELIVER_ITEM':
      // ONLY drop locations (exclude CHARGER and PICKUP)
      return [
        ...pois.filter((p) => p.type === 'DROP').map((p) => ({ label: p.label, value: p.label })),
        { label: 'D5', value: 'D5' },
        { label: 'D8', value: 'D8' },
      ];

    case 'RESTOCK_SHELF':
      // ONLY shelves
      return shelves.map((s) => ({ label: `Shelf ${s.id}`, value: `Shelf ${s.id}` }));

    case 'TAKE_TO_PACKING':
      // ONLY packing areas
      return [{ label: 'Packing Area B', value: 'Packing Area B' }];

    case 'STORE_ITEM':
      // ONLY storage locations
      return [
        { label: 'Storage-01', value: 'Storage-01' },
        { label: 'Storage-02', value: 'Storage-02' },
      ];

    case 'MOVE_CONTAINER':
      // ONLY containers/bins
      return [
        { label: 'Bin-A', value: 'Bin-A' },
        { label: 'Bin-B', value: 'Bin-B' },
      ];

    default:
      return [];
  }
};

export const AddTaskModal: React.FC<AddTaskModalProps> = ({ isOpen, onClose }) => {
  const { createTask, tasks } = useTaskStore();
  const { pois, shelves } = useWarehouseStore();

  const [taskType, setTaskType] = useState<TaskType>('DELIVER_ITEM');
  const [pickupPoint, setPickupPoint] = useState('');
  const [dropPoint, setDropPoint] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('NORMAL');
  const [weight, setWeight] = useState(10);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentTypeConfig = TASK_TYPES.find((t) => t.value === taskType) || TASK_TYPES[0];
  const autoNextTaskId = generateNextTaskId(tasks);

  // Compute strictly filtered dropdown options dynamically based on selectedTaskType
  const sourceOptions = getFilteredSourceOptions(taskType, pois, shelves);
  const targetOptions = getFilteredTargetOptions(taskType, pois, shelves);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!pickupPoint.trim()) {
      setErrorMsg(`Please select a valid ${currentTypeConfig.pickupLabel}.`);
      return;
    }

    if (!dropPoint.trim()) {
      setErrorMsg(`Please select a valid ${currentTypeConfig.dropLabel}.`);
      return;
    }

    if (weight < 0) {
      setErrorMsg('Weight cannot be negative.');
      return;
    }

    const res = await createTask({
      task_type: taskType,
      pickup_point: pickupPoint.trim(),
      drop_point: dropPoint.trim(),
      priority,
      weight,
    });

    if (res.success) {
      onClose();
      // Reset form
      setPickupPoint('');
      setDropPoint('');
      setWeight(10);
      setPriority('NORMAL');
      setErrorMsg(null);
    } else if (res.error) {
      setErrorMsg(res.error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center pointer-events-auto">
      <div className="w-[500px] bg-workspace border border-border shadow-xl flex flex-col rounded-sm overflow-visible z-50">
        {/* Header */}
        <div className="h-[36px] bg-app border-b border-border flex items-center justify-between px-3 font-semibold text-[13px] tracking-wide text-text">
          <span>CREATE NEW TASK</span>
          <button onClick={onClose} className="p-1 hover:bg-toolbar text-muted hover:text-text rounded">
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4 text-[12px]">
          {errorMsg && (
            <div className="p-2.5 bg-danger/10 border border-danger/40 text-danger rounded flex items-center gap-2 text-[12px]">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Auto-generated Task ID Display & Task Type Selector */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-muted font-medium mb-1">Task ID (Auto-generated)</label>
              <div className="w-full px-2.5 py-1.5 bg-app border border-border rounded text-accent font-bold font-mono">
                {autoNextTaskId}
              </div>
            </div>

            <div>
              <label className="block text-muted font-medium mb-1">Task Type *</label>
              <select
                value={taskType}
                onChange={(e) => {
                  const newType = e.target.value as TaskType;
                  setTaskType(newType);
                  // CLEAR PREVIOUS INVALID SELECTIONS WHEN TASK TYPE CHANGES
                  setPickupPoint('');
                  setDropPoint('');
                }}
                className="w-full px-2.5 py-1.5 bg-white border border-border rounded text-text focus:outline-none focus:border-accent font-medium"
              >
                {TASK_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dynamic Filtered Source and Target Dropdown Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-muted font-medium mb-1">{currentTypeConfig.pickupLabel} *</label>
              <select
                value={pickupPoint}
                onChange={(e) => setPickupPoint(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-border rounded text-text focus:outline-none focus:border-accent"
                required
              >
                <option value="">-- Select {currentTypeConfig.pickupLabel} --</option>
                {sourceOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-muted font-medium mb-1">{currentTypeConfig.dropLabel} *</label>
              <select
                value={dropPoint}
                onChange={(e) => setDropPoint(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-border rounded text-text focus:outline-none focus:border-accent"
                required
              >
                <option value="">-- Select {currentTypeConfig.dropLabel} --</option>
                {targetOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Priority & Weight Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-muted font-medium mb-1">Priority *</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-2.5 py-1.5 bg-white border border-border rounded text-text focus:outline-none focus:border-accent font-medium"
              >
                <option value="NORMAL">NORMAL</option>
                <option value="LOW">LOW</option>
                <option value="URGENT">URGENT</option>
              </select>
            </div>

            <div>
              <label className="block text-muted font-medium mb-1">Weight (kg)</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={weight}
                onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 bg-white border border-border rounded text-text focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-app border border-border rounded text-[12px] hover:bg-toolbar font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-accent text-white rounded text-[12px] hover:bg-opacity-90 font-medium shadow-sm"
            >
              CREATE TASK ({autoNextTaskId})
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
