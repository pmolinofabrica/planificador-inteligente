import React, { useState } from 'react';
import { Calendar, Undo2 } from 'lucide-react';
import { useAssignmentData } from '@/hooks/useAssignmentData';
import { useUndoStack } from '@/hooks/useUndoStack';
import { PlanningMatrix } from '@/components/assignments/PlanningMatrix';
import { ExecutionTab } from '@/components/assignments/ExecutionTab';
import { DevicesTab } from '@/components/assignments/DevicesTab';
import { ResidentSidebar } from '@/components/assignments/ResidentSidebar';
import { VacantsSidebar } from '@/components/assignments/VacantsSidebar';
import { VacantActionSidebar } from '@/components/assignments/VacantActionSidebar';
import type { ActiveTab, SelectedResident, SelectedDevice, SelectedVacant, MONTHS } from '@/types/assignments';

const MONTHS_LIST = ["Febrero 2026", "Marzo 2026", "Abril 2026"];

const Index = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('plan');
  const [selectedMonth, setSelectedMonth] = useState("Marzo 2026");

  const data = useAssignmentData({ selectedMonth });
  const { undoStack, pushUndo, handleUndo } = useUndoStack(data.refresh);

  // Selection states
  const [selectedResident, setSelectedResident] = useState<SelectedResident | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<SelectedDevice | null>(null);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);
  const [showVacantsSidebar, setShowVacantsSidebar] = useState(false);
  const [selectedVacant, setSelectedVacant] = useState<SelectedVacant | null>(null);

  // Exec tab state
  const [execDate, setExecDate] = useState("");

  // Set initial exec date
  React.useEffect(() => {
    if (data.activeDates.length > 0 && !execDate) {
      setExecDate(data.activeDates[0]);
    }
  }, [data.activeDates, execDate]);

  const clearSelections = () => {
    setSelectedResident(null);
    setSelectedDevice(null);
    setSelectedVacant(null);
  };

  const year = selectedMonth.split(" ")[1] || "2026";

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col relative overflow-hidden">
      {/* HEADER */}
      <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-primary p-2 rounded-lg text-primary-foreground shadow-sm">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-foreground tracking-tight leading-tight">Asignaciones</h1>
              <select
                className="bg-muted border border-border rounded-md px-2 py-0.5 text-xs font-bold text-foreground outline-none hover:bg-accent cursor-pointer"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                {MONTHS_LIST.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-muted p-1 rounded-lg border border-border shadow-inner">
          {[
            { key: 'plan' as ActiveTab, label: 'Matriz de Planificación', color: 'text-primary' },
            { key: 'exec' as ActiveTab, label: 'Apertura / Inasistencias', color: 'text-destructive' },
            { key: 'devices' as ActiveTab, label: 'Dispositivos', color: 'text-primary' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); clearSelections(); }}
              className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${
                activeTab === tab.key
                  ? `bg-card shadow-sm ${tab.color} border border-border/50`
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (undoStack.length === 0) {
                alert("No hay acciones recientes para deshacer.");
                return;
              }
              handleUndo(data.setIsLoading);
            }}
            className={`font-bold px-4 py-1.5 rounded-xl transition-colors shadow-sm text-sm border-2 flex items-center gap-1.5
              ${undoStack.length > 0
                ? 'bg-card border-primary/30 text-primary hover:bg-accent'
                : 'bg-muted border-border text-muted-foreground cursor-not-allowed'
              }`}
          >
            <Undo2 className="w-4 h-4" /> Deshacer ({undoStack.length})
          </button>
          <button
            onClick={() => {
              if (confirm("¿Ejecutar motor de asignación? Esto recalculará las asignaciones.")) {
                alert("Motor de asignación en desarrollo. Usa la Edge Function cuando esté lista.");
              }
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-1.5 rounded-xl transition-colors shadow-md text-sm flex items-center gap-2"
          >
            🔮 Generar
          </button>
        </div>
      </header>

      <div className="flex flex-1 relative overflow-hidden">
        {/* Sidebars */}
        {selectedResident && (
          <ResidentSidebar
            selectedResident={selectedResident}
            setSelectedResident={setSelectedResident}
            data={data}
            pushUndo={pushUndo}
            year={year}
          />
        )}

        {showVacantsSidebar && (
          <VacantsSidebar
            data={data}
            selectedVacant={selectedVacant}
            setSelectedVacant={setSelectedVacant}
            setSelectedDevice={setSelectedDevice}
            setSelectedResident={setSelectedResident}
            setShowVacantsSidebar={setShowVacantsSidebar}
            year={year}
          />
        )}

        {selectedVacant && (
          <VacantActionSidebar
            selectedVacant={selectedVacant}
            setSelectedVacant={setSelectedVacant}
            data={data}
            year={year}
          />
        )}

        {/* Tab Content */}
        {activeTab === 'plan' && (
          <PlanningMatrix
            data={data}
            selectedResident={selectedResident}
            setSelectedResident={setSelectedResident}
            selectedDevice={selectedDevice}
            setSelectedDevice={setSelectedDevice}
            selectedDateFilter={selectedDateFilter}
            setSelectedDateFilter={setSelectedDateFilter}
            showVacantsSidebar={showVacantsSidebar}
            setShowVacantsSidebar={setShowVacantsSidebar}
            year={year}
          />
        )}

        {activeTab === 'exec' && (
          <ExecutionTab
            data={data}
            execDate={execDate}
            setExecDate={setExecDate}
            selectedResident={selectedResident}
            setSelectedResident={setSelectedResident}
            selectedVacant={selectedVacant}
            setSelectedVacant={setSelectedVacant}
            setShowVacantsSidebar={setShowVacantsSidebar}
            pushUndo={pushUndo}
            year={year}
          />
        )}

        {activeTab === 'devices' && (
          <DevicesTab
            data={data}
            year={year}
          />
        )}
      </div>

      {/* Loading Overlay */}
      {data.isLoading && (
        <div className="fixed inset-0 bg-background/50 backdrop-blur-sm z-[100] flex items-center justify-center">
          <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-bold text-muted-foreground">Cargando datos...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
