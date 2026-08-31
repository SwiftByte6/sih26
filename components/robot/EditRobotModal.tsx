'use client';

import React, { useState, useEffect } from 'react';
import { useWarehouseStore } from '../../store/warehouseStore';
import { Robot } from '../../types/warehouse';
import { X, Save, Edit3 } from 'lucide-react';

interface EditRobotModalProps {
  robot: Robot | null;
  onClose: () => void;
}

export const EditRobotModal: React.FC<EditRobotModalProps> = ({ robot, onClose }) => {
  const { updateRobot } = useWarehouseStore();

  const [speed, setSpeed] = useState(1.2);
  const [battery, setBattery] = useState(100);
  const [sensingRadius, setSensingRadius] = useState(5);
  const [payloadCapacity, setPayloadCapacity] = useState(20);
  const [capability, setCapability] = useState('Standard Transport');

  useEffect(() => {
    if (robot) {
      setSpeed(robot.speed || 1.2);
      setBattery(robot.battery || 100);
      setSensingRadius(robot.sensingRadius || 5);
      setPayloadCapacity(robot.payloadCapacity || 20);
      setCapability(robot.deliveryCapability || 'Standard Transport');
    }
  }, [robot]);

  if (!robot) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    updateRobot(robot.id, {
      speed: Number(speed),
      battery: Number(battery),
      sensingRadius: Number(sensingRadius),
      payloadCapacity: Number(payloadCapacity),
      deliveryCapability: capability,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-border w-[420px] shadow-xl rounded-md flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-[40px] bg-app border-b border-border flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Edit3 size={16} className="text-accent" />
            <span className="font-bold text-[13px] text-text">EDIT AMR CONFIGURATION: {robot.id}</span>
          </div>
          <button onClick={onClose} className="p-1 text-muted hover:text-text rounded-sm">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-3 text-[11px]">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="font-bold text-text">Max Speed (m/s):</label>
              <input
                type="number"
                step="0.1"
                min="0.5"
                max="4.0"
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="bg-workspace border border-border p-2 rounded-sm font-mono"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-bold text-text">Battery Level (%):</label>
              <input
                type="number"
                min="0"
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
                max="20"
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
                max="200"
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

          {/* Footer Actions */}
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
              <Save size={14} /> Save Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
