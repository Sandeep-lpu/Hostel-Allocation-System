'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  Building2,
  Layers,
  Bed,
  CheckCircle2,
  AlertTriangle,
  X,
  Wrench,
  Clock,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
  ArrowLeft,
  ShieldCheck,
  ChevronRight,
  Info,
} from 'lucide-react';
import { fetchFloorMapAction, updateBedStatusAction } from '@/app/actions/inventory-actions';

interface BedItem {
  _id: string;
  bedLabel: string;
  status: 'AVAILABLE' | 'LOCKED_IN_CART' | 'BOOKED' | 'MAINTENANCE';
  allocatedTo?: string | null;
  lockExpiresAt?: string | null;
}

interface RoomItem {
  roomNumber: string;
  floor: number;
  blockCode: string;
  categoryCode: string;
  roomType: string;
  seaterCount: number;
  annualFee: number;
  washroomType: string;
  hasPantry: boolean;
  totalBeds: number;
  availableBeds: number;
  occupiedBeds: number;
  maintenanceBeds: number;
  beds: BedItem[];
}

interface FloorBedMapProps {
  initialBlockCode: string;
  initialFloor: number;
  blocks: Array<{
    blockCode: string;
    blockName: string;
    gender: string;
    totalBeds: number;
    availableBeds: number;
    occupiedBeds: number;
  }>;
}

export default function FloorBedMap({
  initialBlockCode,
  initialFloor,
  blocks,
}: FloorBedMapProps) {
  const [selectedBlock, setSelectedBlock] = useState(initialBlockCode || 'BH-01');
  const [selectedFloor, setSelectedFloor] = useState(initialFloor || 1);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [floorData, setFloorData] = useState<{
    blockCode: string;
    blockName: string;
    floor: number;
    stats: {
      totalRooms: number;
      totalBeds: number;
      availableBeds: number;
      occupiedBeds: number;
      maintenanceBeds: number;
      occupancyPercentage: number;
    };
    rooms: RoomItem[];
  } | null>(null);

  // Selected Bed for Detail & Action Modal
  const [selectedBed, setSelectedBed] = useState<{
    bed: BedItem;
    room: RoomItem;
  } | null>(null);

  const [maintenanceReason, setMaintenanceReason] = useState('');
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Load floor bed data
  const loadFloor = async (blockCode: string, floor: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchFloorMapAction(blockCode, floor);
      if (res.success && res.data) {
        setFloorData(res.data);
      } else {
        setError(res.error || 'Failed to load floor matrix');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with inventory API');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFloor(selectedBlock, selectedFloor);
  }, [selectedBlock, selectedFloor]);

  // Keyboard shortcut: Escape to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedBed) {
        setSelectedBed(null);
        setActionMessage(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedBed]);

  // Handle bed status toggle
  const handleToggleStatus = async (newStatus: 'AVAILABLE' | 'MAINTENANCE') => {
    if (!selectedBed) return;
    setActionMessage(null);

    startTransition(async () => {
      const res = await updateBedStatusAction(
        selectedBed.bed._id,
        newStatus,
        newStatus === 'MAINTENANCE' ? maintenanceReason || 'Routine Warden Inspection' : undefined
      );

      if (res.success) {
        setActionMessage({
          type: 'success',
          text: `Bed ${selectedBed.bed.bedLabel} in Room ${selectedBed.room.roomNumber} set to ${newStatus}.`,
        });
        // Reload floor data
        await loadFloor(selectedBlock, selectedFloor);
        // Update local modal view
        setSelectedBed((prev) =>
          prev
            ? {
                ...prev,
                bed: {
                  ...prev.bed,
                  status: newStatus,
                  allocatedTo: newStatus === 'AVAILABLE' ? null : prev.bed.allocatedTo,
                },
              }
            : null
        );
      } else {
        setActionMessage({
          type: 'error',
          text: res.error || 'Failed to update bed status',
        });
      }
    });
  };

  // Max floors based on block (BH-01 has 6, GH-01 has 4)
  const availableFloors = selectedBlock === 'GH-01' ? [1, 2, 3, 4] : [1, 2, 3, 4, 5, 6];

  // Filtered rooms
  const filteredRooms = floorData?.rooms.filter((room) => {
    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'AVAILABLE') return room.availableBeds > 0;
    if (filterStatus === 'OCCUPIED') return room.occupiedBeds > 0;
    if (filterStatus === 'MAINTENANCE') return room.maintenanceBeds > 0;
    return true;
  }) || [];

  return (
    <div className="space-y-6">
      {/* 1. Hostel Block Switcher & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          {blocks.map((b) => {
            const isSelected = selectedBlock === b.blockCode;
            return (
              <button
                key={b.blockCode}
                onClick={() => {
                  setSelectedBlock(b.blockCode);
                  if (b.blockCode === 'GH-01' && selectedFloor > 4) {
                    setSelectedFloor(1);
                  }
                }}
                className={`inline-flex items-center space-x-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Building2 className={`h-4 w-4 ${isSelected ? 'text-indigo-400' : 'text-slate-500'}`} />
                <span>{b.blockName}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    isSelected ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {b.gender}
                </span>
              </button>
            );
          })}
        </div>

        {/* Refresh & Filter Controls */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1 rounded-2xl bg-slate-100 p-1 text-xs font-semibold text-slate-600">
            {['ALL', 'AVAILABLE', 'OCCUPIED', 'MAINTENANCE'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`rounded-xl px-3 py-1.5 transition-all capitalize ${
                  filterStatus === status
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {status.toLowerCase()}
              </button>
            ))}
          </div>

          <button
            onClick={() => loadFloor(selectedBlock, selectedFloor)}
            disabled={isLoading}
            className="flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-xs transition-colors disabled:opacity-50"
            title="Refresh floor data"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Floor Selector Pills */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-2 flex items-center space-x-1">
          <Layers className="h-3.5 w-3.5" />
          <span>Floor:</span>
        </span>
        {availableFloors.map((fl) => {
          const isSelected = selectedFloor === fl;
          return (
            <button
              key={fl}
              onClick={() => setSelectedFloor(fl)}
              className={`rounded-2xl px-4 py-2 text-xs font-bold transition-all flex items-center space-x-1.5 ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20 ring-2 ring-indigo-600/30'
                  : 'bg-white border border-slate-200/90 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>Floor {fl}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Floor Statistics Bar */}
      {floorData && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Rooms</span>
            <div className="text-xl font-black text-slate-900 mt-1">{floorData.stats.totalRooms}</div>
            <span className="text-[10px] text-slate-400">Floor {floorData.floor} layout</span>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Capacity</span>
            <div className="text-xl font-black text-slate-900 mt-1">{floorData.stats.totalBeds} Beds</div>
            <span className="text-[10px] text-slate-400">Floor inventory</span>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3.5 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Available</span>
            <div className="text-xl font-black text-emerald-700 mt-1">{floorData.stats.availableBeds}</div>
            <span className="text-[10px] text-emerald-600">Ready for allocation</span>
          </div>

          <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-3.5 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Occupied / Cart</span>
            <div className="text-xl font-black text-rose-700 mt-1">{floorData.stats.occupiedBeds}</div>
            <span className="text-[10px] text-rose-600">Allocated or locked</span>
          </div>

          <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-3.5 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Maintenance</span>
            <div className="text-xl font-black text-amber-700 mt-1">{floorData.stats.maintenanceBeds}</div>
            <span className="text-[10px] text-amber-600">Under service</span>
          </div>

          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-3.5 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Occupancy Rate</span>
            <div className="text-xl font-black text-indigo-700 mt-1">{floorData.stats.occupancyPercentage}%</div>
            <div className="w-full bg-indigo-100 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${floorData.stats.occupancyPercentage}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Loading & Error States */}
      {isLoading && (
        <div className="rounded-3xl border border-slate-200/90 bg-white p-12 text-center space-y-3 shadow-xs">
          <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-600">Loading Floor {selectedFloor} bed matrix from MongoDB...</p>
        </div>
      )}

      {error && !isLoading && (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-center space-y-2">
          <AlertTriangle className="h-6 w-6 text-rose-600 mx-auto" />
          <p className="text-sm font-bold text-rose-900">{error}</p>
          <button
            onClick={() => loadFloor(selectedBlock, selectedFloor)}
            className="rounded-xl bg-rose-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-rose-700"
          >
            Retry Loading
          </button>
        </div>
      )}

      {/* 4. Interactive Grid of Rooms and Individual Bed Cards */}
      {!isLoading && !error && filteredRooms.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredRooms.map((room) => {
            return (
              <div
                key={room.roomNumber}
                className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
              >
                {/* Room Header */}
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-base font-black text-slate-900">
                        {room.roomNumber}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200">
                        Floor {room.floor}
                      </span>
                    </div>

                    <span className="text-[11px] font-mono font-bold text-slate-700">
                      ₹{(room.annualFee / 1000).toFixed(0)}k/yr
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-slate-600 mt-1 line-clamp-1">
                    {room.roomType}
                  </p>

                  {/* Amenities Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="rounded-md bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500 border border-slate-100">
                      {room.seaterCount}-Seater
                    </span>
                    <span className="rounded-md bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500 border border-slate-100">
                      {room.washroomType.includes('Attached') ? 'Attached Bath' : 'Shared Bath'}
                    </span>
                    {room.hasPantry && (
                      <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600 border border-indigo-100">
                        Pantry
                      </span>
                    )}
                  </div>
                </div>

                {/* Bed Units Container */}
                <div className="border-t border-slate-100 pt-3 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Bed Allocation</span>
                    <span>
                      {room.availableBeds}/{room.totalBeds} Free
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {room.beds.map((b) => {
                      const isAvail = b.status === 'AVAILABLE';
                      const isMaint = b.status === 'MAINTENANCE';
                      const isOcc = b.status === 'BOOKED' || b.status === 'LOCKED_IN_CART';

                      return (
                        <button
                          key={b._id}
                          onClick={() => {
                            setSelectedBed({ bed: b, room });
                            setMaintenanceReason('');
                            setActionMessage(null);
                          }}
                          className={`rounded-2xl p-2.5 text-left border transition-all flex flex-col justify-between group ${
                            isAvail
                              ? 'border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/70'
                              : isMaint
                              ? 'border-amber-200 bg-amber-50/50 hover:bg-amber-100/70'
                              : 'border-rose-200 bg-rose-50/50 hover:bg-rose-100/70'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-black text-slate-800">
                              {b.bedLabel}
                            </span>
                            <Bed
                              className={`h-3.5 w-3.5 ${
                                isAvail
                                  ? 'text-emerald-600'
                                  : isMaint
                                  ? 'text-amber-600'
                                  : 'text-rose-600'
                              }`}
                            />
                          </div>

                          <div className="mt-2 flex items-center justify-between">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                                isAvail
                                  ? 'bg-emerald-600 text-white'
                                  : isMaint
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-rose-600 text-white'
                              }`}
                            >
                              {isAvail ? 'Available' : isMaint ? 'Maint' : 'Occupied'}
                            </span>

                            <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-900 transition-colors">
                              Inspect →
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. BED DETAIL & ACTION MODAL WITH WORKING (X) CLOSE BUTTON & CANCEL BUTTON */}
      {selectedBed && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150"
          onClick={() => {
            setSelectedBed(null);
            setActionMessage(null);
          }}
        >
          <div
            className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-2xl space-y-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header with WORKING (X) CLOSE BUTTON */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl text-white font-mono font-black ${
                    selectedBed.bed.status === 'AVAILABLE'
                      ? 'bg-emerald-600'
                      : selectedBed.bed.status === 'MAINTENANCE'
                      ? 'bg-amber-600'
                      : 'bg-rose-600'
                  }`}
                >
                  <Bed className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    {selectedBed.bed.bedLabel} — Room {selectedBed.room.roomNumber}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Floor {selectedBed.room.floor} • {selectedBed.room.blockCode} ({selectedBed.room.roomType})
                  </p>
                </div>
              </div>

              {/* Prominent Circular (X) Close Button (Identical to User's Uploaded Screenshot) */}
              <button
                type="button"
                onClick={() => {
                  setSelectedBed(null);
                  setActionMessage(null);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors focus:outline-hidden focus:ring-2 focus:ring-slate-400"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Status & Inventory Information Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-2xl bg-slate-50 p-3 border border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Status</span>
                <div className="mt-1 flex items-center space-x-1.5 font-bold">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      selectedBed.bed.status === 'AVAILABLE'
                        ? 'bg-emerald-500 animate-pulse'
                        : selectedBed.bed.status === 'MAINTENANCE'
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                  />
                  <span className="text-slate-900">{selectedBed.bed.status}</span>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3 border border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Annual Fee</span>
                <div className="mt-1 font-mono font-bold text-slate-900">
                  ₹{selectedBed.room.annualFee.toLocaleString()}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3 border border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Room Category</span>
                <div className="mt-1 font-mono text-[11px] font-semibold text-slate-700">
                  {selectedBed.room.categoryCode}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3 border border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Washroom / Pantry</span>
                <div className="mt-1 font-semibold text-slate-700">
                  {selectedBed.room.washroomType} {selectedBed.room.hasPantry ? '• Pantry' : ''}
                </div>
              </div>
            </div>

            {/* Occupancy details if booked/locked */}
            {selectedBed.bed.allocatedTo && (
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3.5 space-y-1 text-xs">
                <div className="flex items-center space-x-1.5 text-indigo-700 font-bold">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Allocated Resident Record</span>
                </div>
                <div className="font-mono text-slate-700 text-[11px]">
                  Student ID: {selectedBed.bed.allocatedTo}
                </div>
                {selectedBed.bed.lockExpiresAt && (
                  <div className="font-mono text-slate-500 text-[10px] flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>Cart Lock Expires: {new Date(selectedBed.bed.lockExpiresAt).toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}

            {/* Action Feedback Banner */}
            {actionMessage && (
              <div
                className={`rounded-2xl p-3 text-xs font-semibold flex items-center space-x-2 ${
                  actionMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {actionMessage.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                )}
                <span>{actionMessage.text}</span>
              </div>
            )}

            {/* Warden Actions */}
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                <Wrench className="h-3.5 w-3.5" />
                <span>Warden Inventory Maintenance Controls</span>
              </span>

              {selectedBed.bed.status === 'AVAILABLE' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Maintenance Inspection Reason (Optional)
                    </label>
                    <input
                      type="text"
                      value={maintenanceReason}
                      onChange={(e) => setMaintenanceReason(e.target.value)}
                      placeholder="e.g. Broken study table, AC refrigerant leak, paint touch-up"
                      className="w-full rounded-2xl border border-slate-200 px-3.5 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleToggleStatus('MAINTENANCE')}
                    className="w-full inline-flex items-center justify-center space-x-2 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white py-2.5 text-xs font-bold shadow-sm transition-colors disabled:opacity-50"
                  >
                    <Wrench className="h-3.5 w-3.5" />
                    <span>{isPending ? 'Updating...' : 'Set Bed Under Maintenance'}</span>
                  </button>
                </div>
              )}

              {selectedBed.bed.status === 'MAINTENANCE' && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleToggleStatus('AVAILABLE')}
                  className="w-full inline-flex items-center justify-center space-x-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 text-xs font-bold shadow-sm transition-colors disabled:opacity-50"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{isPending ? 'Updating...' : 'Mark as Inspected & Available for Allocation'}</span>
                </button>
              )}

              {selectedBed.bed.status !== 'AVAILABLE' && selectedBed.bed.status !== 'MAINTENANCE' && (
                <p className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  This bed is currently locked or booked in an active allocation cart. To reassign or vacate, use the Allocation Override panel.
                </p>
              )}
            </div>

            {/* Modal Footer with Cancel / Back Button */}
            <div className="flex items-center justify-end space-x-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => {
                  setSelectedBed(null);
                  setActionMessage(null);
                }}
                className="inline-flex items-center space-x-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Cancel & Return</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
