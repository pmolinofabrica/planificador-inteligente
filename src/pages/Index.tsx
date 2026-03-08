import React, { useState } from 'react';
import { Calendar, Undo2 } from 'lucide-react';
import { useAssignmentData } from '@/hooks/useAssignmentData';
import { useUndoStack } from '@/hooks/useUndoStack';
import { PlanningMatrix } from '@/components/assignments/PlanningMatrix';
import { ExecutionTab } from '@/components/assignments/ExecutionTab';
import { MenuView } from '@/components/assignments/MenuView';
import { DevicesTab } from '@/components/assignments/DevicesTab';
import { ResidentSidebar } from '@/components/assignments/ResidentSidebar';
import { DeviceSidebar } from '@/components/assignments/DeviceSidebar';
import { DateSidebar } from '@/components/assignments/DateSidebar';
import { CellSidebar } from '@/components/assignments/CellSidebar';
import { VacantsSidebar } from '@/components/assignments/VacantsSidebar';
import { VacantActionSidebar } from '@/components/assignments/VacantActionSidebar';
import type { ActiveTab, SelectedResident, SelectedDevice, SelectedVacant } from '@/types/assignments';

const MONTHS_LIST = ["Febrero 2026", "Marzo 2026", "Abril 2026"];
const TURNO_FILTERS = [
  { key: 'apertura', label: 'Apertura' },
  { key: 'tarde', label: 'Turno tarde' },
  { key: 'manana', label: 'Turno mañana' },
] as const;

type TurnoFilter = typeof TURNO_FILTERS[number]['key'];

const Index = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('plan');
  const [selectedMonth, setSelectedMonth] = useState("Marzo 2026");
  const [turnoFilter, setTurnoFilter] = useState<TurnoFilter>('apertura');
  const [menuLocked, setMenuLocked] = useState(false);

  const data = useAssignmentData({ selectedMonth, turnoFilter });
  const { undoStack, pushUndo, handleUndo } = useUndoStack(data.refresh);

  // Selection states
  const [selectedResident, setSelectedResident] = useState<SelectedResident | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<SelectedDevice | null>(null);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);
  const [showVacantsSidebar, setShowVacantsSidebar] = useState(false);
  const [selectedVacant, setSelectedVacant] = useState<SelectedVacant | null>(null);

  // Exec tab state
  const [execDate, setExecDate] = useState("");

  React.useEffect(() => {
    if (data.activeDates.length > 0 && !execDate) {
      setExecDate(data.activeDates[0]);
    }
  }, [data.activeDates, execDate]);

  const clearSelections = () => {
    setSelectedResident(null);
    setSelectedDevice(null);
    setSelectedDateFilter(null);
    setSelectedVacant(null);
  };

  const year = selectedMonth.split(" ")[1] || "2026";

  const isNonAperturaFilter = turnoFilter === 'tarde' || turnoFilter === 'manana';

  // Determine which sidebar to show on the right
  const showResidentSidebar = !!selectedResident;
  const showCellSidebar = !selectedResident && !!selectedDevice && !!selectedDateFilter;
  const showDeviceSidebar = !selectedResident && !!selectedDevice && !selectedDateFilter;
  const showDateSidebar = !selectedResident && !selectedDevice && !!selectedDateFilter;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col relative overflow-hidden">
      {/* HEADER - hidden when menu is locked */}
      {!(menuLocked && activeTab === 'menu') && (
      <header className="bg-card border-b border-border px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 flex flex-col gap-2 sticky top-0 z-20 shadow-warm">
        {/* Row 1: Logo + Title + Month selector */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-primary p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl text-primary-foreground shadow-warm">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <h1 className="text-base sm:text-xl font-bold text-foreground tracking-tight leading-tight">Asignaciones</h1>
            <select
              className="bg-muted border border-border rounded-md px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-bold text-foreground outline-none hover:bg-accent cursor-pointer"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {MONTHS_LIST.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Actions — desktop only inline, mobile collapsed */}
          <div className="hidden sm:flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => {
                if (undoStack.length === 0) { alert("No hay acciones recientes para deshacer."); return; }
                handleUndo(data.setIsLoading);
              }}
              className={`font-bold px-3 py-1.5 rounded-xl transition-colors shadow-warm text-xs border-2 flex items-center gap-1.5
                ${undoStack.length > 0
                  ? 'bg-card border-primary/30 text-primary hover:bg-accent'
                  : 'bg-muted border-border text-muted-foreground cursor-not-allowed'
                }`}
            >
              <Undo2 className="w-4 h-4" /> Deshacer ({undoStack.length})
            </button>
            {isNonAperturaFilter && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-xl border border-border">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Org:</span>
                <span className="text-xs font-bold text-foreground">{Object.values(data.tipoOrganizacionMap)[0] || 'Sin datos'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Tabs + Turno filter */}
        <div className="flex items-center gap-2 justify-between">
          {/* Tab toggle */}
          <div className="flex overflow-x-auto bg-muted p-0.5 sm:p-1 rounded-lg border border-border shadow-inner flex-shrink min-w-0">
            {[
              { key: 'plan' as ActiveTab, label: 'Plan', labelFull: 'Planificación', color: 'text-primary' },
              { key: 'menu' as ActiveTab, label: 'Menú', labelFull: 'Menú', color: 'text-primary' },
              { key: 'exec' as ActiveTab, label: 'Apert.', labelFull: 'Apertura', color: 'text-destructive' },
              { key: 'devices' as ActiveTab, label: 'Disp.', labelFull: 'Dispositivos', color: 'text-primary' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); clearSelections(); }}
                className={`px-2 sm:px-4 py-1 sm:py-1.5 text-[10px] sm:text-sm font-bold rounded-md transition-all whitespace-nowrap flex-shrink-0 ${
                  activeTab === tab.key
                    ? `bg-card shadow-warm ${tab.color} border border-border/50`
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className="sm:hidden">{tab.label}</span>
                <span className="hidden sm:inline">{tab.labelFull}</span>
              </button>
            ))}
          </div>

          {/* Turno filter */}
          <div className="flex bg-muted p-0.5 rounded-md border border-border flex-shrink-0">
            {TURNO_FILTERS.map(tf => (
              <button
                key={tf.key}
                onClick={() => { setTurnoFilter(tf.key); clearSelections(); }}
                className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-[9px] sm:text-[10px] font-bold rounded transition-all whitespace-nowrap ${
                  turnoFilter === tf.key
                    ? 'bg-card shadow-warm text-primary border border-border/50'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>

        {/* Row 3: Mobile-only action row */}
        <div className="flex sm:hidden items-center gap-2">
          <button
            onClick={() => {
              if (undoStack.length === 0) { alert("No hay acciones recientes para deshacer."); return; }
              handleUndo(data.setIsLoading);
            }}
            className={`font-bold px-2.5 py-1 rounded-lg transition-colors text-[10px] border flex items-center gap-1 flex-1
              ${undoStack.length > 0
                ? 'bg-card border-primary/30 text-primary'
                : 'bg-muted border-border text-muted-foreground cursor-not-allowed'
              }`}
          >
            <Undo2 className="w-3 h-3" /> Deshacer ({undoStack.length})
          </button>
          {isNonAperturaFilter && (
            <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-1 rounded-lg border border-border">
              Org: {Object.values(data.tipoOrganizacionMap)[0] || '—'}
            </span>
          )}
        </div>
      </header>
      )}

      <div className="flex flex-1 relative overflow-hidden">
        {/* Right Sidebars */}
        {showResidentSidebar && (
          <ResidentSidebar
            selectedResident={selectedResident!}
            setSelectedResident={setSelectedResident}
            data={data}
            pushUndo={pushUndo}
            year={year}
          />
        )}

        {showCellSidebar && (
          <CellSidebar
            selectedDevice={selectedDevice!}
            selectedDate={selectedDateFilter!}
            setSelectedDevice={setSelectedDevice}
            setSelectedDateFilter={setSelectedDateFilter}
            setSelectedResident={setSelectedResident}
            data={data}
            pushUndo={pushUndo}
            year={year}
          />
        )}

        {showDeviceSidebar && (
          <DeviceSidebar
            selectedDevice={selectedDevice!}
            setSelectedDevice={setSelectedDevice}
            data={data}
            year={year}
          />
        )}

        {showDateSidebar && (
          <DateSidebar
            selectedDate={selectedDateFilter!}
            setSelectedDateFilter={setSelectedDateFilter}
            data={data}
            year={year}
          />
        )}

        {/* Left Sidebar */}
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

        {activeTab === 'menu' && (
          <MenuView data={data} year={year} isLocked={menuLocked} onLock={setMenuLocked} />
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
        <div className="fixed inset-0 bg-background/60 backdrop-blur-md z-[100] flex items-center justify-center">
          <div className="bg-card border border-border rounded-2xl p-8 shadow-warm-lg flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-semibold text-muted-foreground tracking-wide">Cargando datos...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
