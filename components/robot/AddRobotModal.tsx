'use client';

import React, { useState } from 'react';
import { useWarehouseStore } from '../../store/warehouseStore';
import { X, Plus, Bot, Shield, Gauge, Battery, Box } from 'lucide-react';

interface AddRobotModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddRobotModal: React.FC<AddRobotModalProps> = ({ isOpen, onClose }) => {
  const { robots, addRobot } = useWarehouseStore();

  const nextIdNum = (robots.length + 1).toString().padStart(2, '0');
  const [robotId, setRobotId] = useState(`AMR-${nextIdNum}`);
  const [speed, setSpeed] = useState(1.2);
  const [battery, setBattery] = useState(100);
  const [sensingRadius, setSensingRadius] = useState(5);
  const [payloadCapacity, setPayloadCapacity] = useState(20);
  const [capability, setCapability] = useState('Standard Transport');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = robotId.trim().toUpperCase();

    if (!cleanId) {
      setError('AMR ID is required.');
      return;
    }

    if (robots.some((r) => r.id === cleanId)) {
      setError(`Robot ID "${cleanId}" already exists.`);
      return;
    }

    addRobot({
      id: cleanId,
      label: cleanId,
      col: 10 + (robots.length % 5) * 2,
      row: 10 + Math.floor(robots.length / 5) * 2,
      state: 'IDLE',
      speed: Number(speed) || 1.2,
      battery: Number(battery) || 100,
      sensingRadius: Number(sensingRadius) || 5,
      payloadCapacity: Number(payloadCapacity) || 20,
      deliveryCapability: capability,
      currentLoad: 0,
      temperature: 35,
      signalStrength: 98,
      isOnline: true,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-border w-[440px] shadow-xl rounded-md flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="h-[40px] bg-app border-b border-border flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Bot size={16} className="text-accent" />
            <span className="font-bold text-[13px] text-text">ADD NEW AMR ROBOT</span>
          </div>
          <button onClick={onClose} className="p-1 text-muted hover:text-text rounded-sm">
            <X size={16} />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-3 text-[11px]">
          {error && (
            <div className="p-2 bg-danger/10 border border-danger text-danger font-semibold rounded-sm">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="font-bold text-text">AMR ID / Identifier:</label>
            <input
              type="text"
              value={robotId}
              onChange={(e) => {
                setRobotId(e.target.value);
                setError(null);
              }}
              className="bg-workspace border border-border p-2 rounded-sm font-mono font-bold text-[12px] uppercase"
              placeholder="e.g. AMR-04"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="font-bold text-text">Max Speed (m/s):</label>
              <input
                type="number"
                step="0.1"
                min="0.5"
                max="3.0"
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="bg-workspace border border-border p-2 rounded-sm font-mono"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-bold text-text">Initial Battery (%):</label>
              <input
                type="number"
                min="10"
                max="100"
                value={battery}
                onChange={(e) => setBattery(parseInt(e.target.value, 10))}
                className="bg-workspace border border-border p-2 rounded-sm font-mono"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="font-bold text-text">Sensing Radius (m):</label>
              <input
                type="number"
                min="1"
                max="15"
                value={sensingRadius}
                onChange={(e) => setSensingRadius(parseInt(e.target.value, 10))}
                className="bg-workspace border border-border p-2 rounded-sm font-mono"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-bold text-text">Payload Capacity (kg):</label>
              <input
                type="number"
                min="5"
                max="100"
                value={payloadCapacity}
                onChange={(e) => setPayloadCapacity(parseInt(e.target.value, 10))}
                className="bg-workspace border border-border p-2 rounded-sm font-mono"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-bold text-text">Delivery Capability:</label>
            <select
              value={capability}
              onChange={(e) => setCapability(e.target.value)}
              className="bg-workspace border border-border p-2 rounded-sm font-sans"
            >
              <option value="Standard Transport">Standard Transport</option>
              <option value="Heavy Transport">Heavy Transport</option>
              <option value="Express Lightweight">Express Lightweight</option>
              <option value="Hazardous / Sensitive">Hazardous / Sensitive</option>
            </select>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-app border border-border text-text rounded-sm font-medium hover:bg-toolbar"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-accent text-white rounded-sm font-bold flex items-center gap-1 hover:bg-opacity-90"
            >
              <Plus size={14} /> Add to Fleet & P2P Mesh
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
