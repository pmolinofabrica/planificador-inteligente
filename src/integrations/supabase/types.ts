export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      agentes_grupos_dias: {
        Row: {
          dia_semana: number
          grupo: string
          id_agente: number
        }
        Insert: {
          dia_semana: number
          grupo: string
          id_agente: number
        }
        Update: {
          dia_semana?: number
          grupo?: string
          id_agente?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_agd_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "datos_personales"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_agd_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_agentes_capacitados"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_agd_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_historial_capacitaciones"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_agd_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_inasistencias_mes"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_agd_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_planificacion_escuelas"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_agd_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_saldo_horas_live"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_agd_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_saldos_resumen"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_agd_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_seguimiento_residentes"
            referencedColumns: ["id_agente"]
          },
        ]
      }
      ajustes_horas: {
        Row: {
          creado_por: string | null
          fecha_ajuste: string | null
          horas_delta: number
          id_agente: number | null
          id_ajuste: number
          motivo: string
        }
        Insert: {
          creado_por?: string | null
          fecha_ajuste?: string | null
          horas_delta: number
          id_agente?: number | null
          id_ajuste?: number
          motivo: string
        }
        Update: {
          creado_por?: string | null
          fecha_ajuste?: string | null
          horas_delta?: number
          id_agente?: number | null
          id_ajuste?: number
          motivo?: string
        }
        Relationships: [
          {
            foreignKeyName: "ajustes_horas_id_agente_fkey"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "datos_personales"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "ajustes_horas_id_agente_fkey"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_agentes_capacitados"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "ajustes_horas_id_agente_fkey"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_historial_capacitaciones"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "ajustes_horas_id_agente_fkey"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_inasistencias_mes"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "ajustes_horas_id_agente_fkey"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_planificacion_escuelas"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "ajustes_horas_id_agente_fkey"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_saldo_horas_live"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "ajustes_horas_id_agente_fkey"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_saldos_resumen"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "ajustes_horas_id_agente_fkey"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_seguimiento_residentes"
            referencedColumns: ["id_agente"]
          },
        ]
      }
      asignaciones: {
        Row: {
          created_at: string | null
          es_capacitacion_servicio: boolean | null
          es_doble_turno: boolean | null
          fecha: string
          id: number
          id_agente: number
          id_dispositivo: number
          id_turno: number
        }
        Insert: {
          created_at?: string | null
          es_capacitacion_servicio?: boolean | null
          es_doble_turno?: boolean | null
          fecha: string
          id?: number
          id_agente: number
          id_dispositivo: number
          id_turno: number
        }
        Update: {
          created_at?: string | null
          es_capacitacion_servicio?: boolean | null
          es_doble_turno?: boolean | null
          fecha?: string
          id?: number
          id_agente?: number
          id_dispositivo?: number
          id_turno?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_asig_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "datos_personales"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_asig_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_agentes_capacitados"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_asig_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_historial_capacitaciones"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_asig_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_inasistencias_mes"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_asig_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_planificacion_escuelas"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_asig_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_saldo_horas_live"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_asig_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_saldos_resumen"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_asig_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_seguimiento_residentes"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_asig_dispositivo"
            columns: ["id_dispositivo"]
            isOneToOne: false
            referencedRelation: "dispositivos"
            referencedColumns: ["id_dispositivo"]
          },
          {
            foreignKeyName: "fk_asig_dispositivo"
            columns: ["id_dispositivo"]
            isOneToOne: false
            referencedRelation: "vista_agentes_capacitados"
            referencedColumns: ["id_dispositivo"]
          },
          {
            foreignKeyName: "fk_asig_dispositivo"
            columns: ["id_dispositivo"]
            isOneToOne: false
            referencedRelation: "vista_dispositivos_ocupacion"
            referencedColumns: ["id_dispositivo"]
          },
          {
            foreignKeyName: "fk_asig_dispositivo"
            columns: ["id_dispositivo"]
            isOneToOne: false
            referencedRelation: "vista_historial_capacitaciones"
            referencedColumns: ["id_dispositivo"]
          },
          {
            foreignKeyName: "fk_asig_dispositivo"
            columns: ["id_dispositivo"]
            isOneToOne: false
            referencedRelation: "vista_salud_dispositivos"
            referencedColumns: ["id_dispositivo"]
          },
          {
            foreignKeyName: "fk_asig_turno"
            columns: ["id_turno"]
            isOneToOne: false
            referencedRelation: "turnos"
            referencedColumns: ["id_turno"]
          },
          {
            foreignKeyName: "fk_asig_turno"
            columns: ["id_turno"]
            isOneToOne: false
            referencedRelation: "vista_convocatoria_completa"
            referencedColumns: ["id_turno"]
          },
          {
            foreignKeyName: "fk_asig_turno"
            columns: ["id_turno"]
            isOneToOne: false
            referencedRelation: "vista_convocatoria_mes_activo"
            referencedColumns: ["id_turno"]
          },
          {
            foreignKeyName: "fk_asig_turno"
            columns: ["id_turno"]
            isOneToOne: false
            referencedRelation: "vista_disponibilidad_visitas"
            referencedColumns: ["id_turno"]
          },
        ]
      }
      asignaciones_visita: {
        Row: {
          agente_asigno: string | null
          cantidad_personas_original: number
          coeficiente_aplicado: number
          created_at: string | null
          cupo_calculado: number
          email_referente: string | null
          estado: string
          id_asignacion: number
          id_coeficiente: number | null
          id_plani: number | null
          id_visita: number | null
          mes_solicitado: number | null
          nombre_empresa: string | null
          nombre_institucion: string | null
          nombre_referente: string | null
          numero_grupo: number[] | null
          observaciones: string | null
          rango_etario: string | null
          telefono_institucion: string | null
          telefono_referente: string | null
          updated_at: string | null
        }
        Insert: {
          agente_asigno?: string | null
          cantidad_personas_original?: number
          coeficiente_aplicado?: number
          created_at?: string | null
          cupo_calculado?: number
          email_referente?: string | null
          estado?: string
          id_asignacion?: number
          id_coeficiente?: number | null
          id_plani?: number | null
          id_visita?: number | null
          mes_solicitado?: number | null
          nombre_empresa?: string | null
          nombre_institucion?: string | null
          nombre_referente?: string | null
          numero_grupo?: number[] | null
          observaciones?: string | null
          rango_etario?: string | null
          telefono_institucion?: string | null
          telefono_referente?: string | null
          updated_at?: string | null
        }
        Update: {
          agente_asigno?: string | null
          cantidad_personas_original?: number
          coeficiente_aplicado?: number
          created_at?: string | null
          cupo_calculado?: number
          email_referente?: string | null
          estado?: string
          id_asignacion?: number
          id_coeficiente?: number | null
          id_plani?: number | null
          id_visita?: number | null
          mes_solicitado?: number | null
          nombre_empresa?: string | null
          nombre_institucion?: string | null
          nombre_referente?: string | null
          numero_grupo?: number[] | null
          observaciones?: string | null
          rango_etario?: string | null
          telefono_institucion?: string | null
          telefono_referente?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asignaciones_visita_id_coeficiente_fkey"
            columns: ["id_coeficiente"]
            isOneToOne: false
            referencedRelation: "config_visitas_coeficientes"
            referencedColumns: ["id_coeficiente"]
          },
          {
            foreignKeyName: "asignaciones_visita_id_plani_fkey"
            columns: ["id_plani"]
            isOneToOne: false
            referencedRelation: "planificacion"
            referencedColumns: ["id_plani"]
          },
          {
            foreignKeyName: "asignaciones_visita_id_plani_fkey"
            columns: ["id_plani"]
            isOneToOne: false
            referencedRelation: "vista_disponibilidad_visitas"
            referencedColumns: ["id_plani"]
          },
          {
            foreignKeyName: "asignaciones_visita_id_plani_fkey"
            columns: ["id_plani"]
            isOneToOne: false
            referencedRelation: "vista_estado_cobertura"
            referencedColumns: ["id_plani"]
          },
          {
            foreignKeyName: "asignaciones_visita_id_plani_fkey"
            columns: ["id_plani"]
            isOneToOne: false
            referencedRelation: "vista_ocupacion"
            referencedColumns: ["id_plani"]
          },
          {
            foreignKeyName: "asignaciones_visita_id_plani_fkey"
            columns: ["id_plani"]
            isOneToOne: false
            referencedRelation: "vista_planificacion_anio"
            referencedColumns: ["id_plani"]
          },
          {
            foreignKeyName: "asignaciones_visita_id_visita_fkey"
            columns: ["id_visita"]
            isOneToOne: false
            referencedRelation: "visitas_grupales"
            referencedColumns: ["id_visita"]
          },
        ]
      }
      asignaciones_visita_historial: {
        Row: {
          created_at: string | null
          estado_anterior: string | null
          estado_nuevo: string
          id_asignacion: number
          id_hist: number
          motivo: string | null
          usuario: string | null
        }
        Insert: {
          created_at?: string | null
          estado_anterior?: string | null
          estado_nuevo: string
          id_asignacion: number
          id_hist?: number
          motivo?: string | null
          usuario?: string | null
        }
        Update: {
          created_at?: string | null
          estado_anterior?: string | null
          estado_nuevo?: string
          id_asignacion?: number
          id_hist?: number
          motivo?: string | null
          usuario?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asignaciones_visita_historial_id_asignacion_fkey"
            columns: ["id_asignacion"]
            isOneToOne: false
            referencedRelation: "asignaciones_visita"
            referencedColumns: ["id_asignacion"]
          },
        ]
      }
      calendario_dispositivos: {
        Row: {
          created_at: string | null
          cupo_objetivo: number | null
          fecha: string
          id: number
          id_dispositivo: number
          id_turno: number
        }
        Insert: {
          created_at?: string | null
          cupo_objetivo?: number | null
          fecha: string
          id?: number
          id_dispositivo: number
          id_turno: number
        }
        Update: {
          created_at?: string | null
          cupo_objetivo?: number | null
          fecha?: string
          id?: number
          id_dispositivo?: number
          id_turno?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_cal_dispositivo"
            columns: ["id_dispositivo"]
            isOneToOne: false
            referencedRelation: "dispositivos"
            referencedColumns: ["id_dispositivo"]
          },
          {
            foreignKeyName: "fk_cal_dispositivo"
            columns: ["id_dispositivo"]
            isOneToOne: false
            referencedRelation: "vista_agentes_capacitados"
            referencedColumns: ["id_dispositivo"]
          },
          {
            foreignKeyName: "fk_cal_dispositivo"
            columns: ["id_dispositivo"]
            isOneToOne: false
            referencedRelation: "vista_dispositivos_ocupacion"
            referencedColumns: ["id_dispositivo"]
          },
          {
            foreignKeyName: "fk_cal_dispositivo"
            columns: ["id_dispositivo"]
            isOneToOne: false
            referencedRelation: "vista_historial_capacitaciones"
            referencedColumns: ["id_dispositivo"]
          },
          {
            foreignKeyName: "fk_cal_dispositivo"
            columns: ["id_dispositivo"]
            isOneToOne: false
            referencedRelation: "vista_salud_dispositivos"
            referencedColumns: ["id_dispositivo"]
          },
          {
            foreignKeyName: "fk_cal_turno"
            columns: ["id_turno"]
            isOneToOne: false
            referencedRelation: "turnos"
            referencedColumns: ["id_turno"]
          },
          {
            foreignKeyName: "fk_cal_turno"
            columns: ["id_turno"]
            isOneToOne: false
            referencedRelation: "vista_convocatoria_completa"
            referencedColumns: ["id_turno"]
          },
          {
            foreignKeyName: "fk_cal_turno"
            columns: ["id_turno"]
            isOneToOne: false
            referencedRelation: "vista_convocatoria_mes_activo"
            referencedColumns: ["id_turno"]
          },
          {
            foreignKeyName: "fk_cal_turno"
            columns: ["id_turno"]
            isOneToOne: false
            referencedRelation: "vista_disponibilidad_visitas"
            referencedColumns: ["id_turno"]
          },
        ]
      }
      cambio_transaccion: {
        Row: {
          agente_iniciador: number
          estado: string | null
          fecha_aprobacion: string | null
          fecha_ejecucion: string | null
          fecha_solicitud: string | null
          fecha_validacion: string | null
          id_transaccion: number
          motivo_rechazo: string | null
          observaciones: string | null
          tipo_transaccion: string
          usuario_aprobador: string | null
        }
        Insert: {
          agente_iniciador: number
          estado?: string | null
          fecha_aprobacion?: string | null
          fecha_ejecucion?: string | null
          fecha_solicitud?: string | null
          fecha_validacion?: string | null
          id_transaccion?: number
          motivo_rechazo?: string | null
          observaciones?: string | null
          tipo_transaccion: string
          usuario_aprobador?: string | null
        }
        Update: {
          agente_iniciador?: number
          estado?: string | null
          fecha_aprobacion?: string | null
          fecha_ejecucion?: string | null
          fecha_solicitud?: string | null
          fecha_validacion?: string | null
          id_transaccion?: number
          motivo_rechazo?: string | null
          observaciones?: string | null
          tipo_transaccion?: string
          usuario_aprobador?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_cambio_iniciador"
            columns: ["agente_iniciador"]
            isOneToOne: false
            referencedRelation: "datos_personales"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_cambio_iniciador"
            columns: ["agente_iniciador"]
            isOneToOne: false
            referencedRelation: "vista_agentes_capacitados"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_cambio_iniciador"
            columns: ["agente_iniciador"]
            isOneToOne: false
            referencedRelation: "vista_historial_capacitaciones"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_cambio_iniciador"
            columns: ["agente_iniciador"]
            isOneToOne: false
            referencedRelation: "vista_inasistencias_mes"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_cambio_iniciador"
            columns: ["agente_iniciador"]
            isOneToOne: false
            referencedRelation: "vista_planificacion_escuelas"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_cambio_iniciador"
            columns: ["agente_iniciador"]
            isOneToOne: false
            referencedRelation: "vista_saldo_horas_live"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_cambio_iniciador"
            columns: ["agente_iniciador"]
            isOneToOne: false
            referencedRelation: "vista_saldos_resumen"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_cambio_iniciador"
            columns: ["agente_iniciador"]
            isOneToOne: false
            referencedRelation: "vista_seguimiento_residentes"
            referencedColumns: ["id_agente"]
          },
        ]
      }
      cambio_transaccion_detalle: {
        Row: {
          fecha_nueva: string
          fecha_original: string
          id_agente_nuevo: number
          id_agente_original: number
          id_convocatoria_nueva: number | null
          id_convocatoria_original: number
          id_detalle: number
          id_transaccion: number
          id_turno_nuevo: number
          id_turno_original: number
          mensaje_validacion: string | null
          secuencia: number
          validacion_capacitacion: boolean | null
          validacion_conflicto: boolean | null
          validacion_disponibilidad: boolean | null
        }
        Insert: {
          fecha_nueva: string
          fecha_original: string
          id_agente_nuevo: number
          id_agente_original: number
          id_convocatoria_nueva?: number | null
          id_convocatoria_original: number
          id_detalle?: number
          id_transaccion: number
          id_turno_nuevo: number
          id_turno_original: number
          mensaje_validacion?: string | null
          secuencia: number
          validacion_capacitacion?: boolean | null
          validacion_conflicto?: boolean | null
          validacion_disponibilidad?: boolean | null
        }
        Update: {
          fecha_nueva?: string
          fecha_original?: string
          id_agente_nuevo?: number
          id_agente_original?: number
          id_convocatoria_nueva?: number | null
          id_convocatoria_original?: number
          id_detalle?: number
          id_transaccion?: number
          id_turno_nuevo?: number
          id_turno_original?: number
          mensaje_validacion?: string | null
          secuencia?: number
          validacion_capacitacion?: boolean | null
          validacion_conflicto?: boolean | null
          validacion_disponibilidad?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_detalle_agente_nuevo"
            columns: ["id_agente_nuevo"]
            isOneToOne: false
            referencedRelation: "datos_personales"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_detalle_agente_nuevo"
            columns: ["id_agente_nuevo"]
            isOneToOne: false
            referencedRelation: "vista_agentes_capacitados"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_detalle_agente_nuevo"
            columns: ["id_agente_nuevo"]
            isOneToOne: false
            referencedRelation: "vista_historial_capacitaciones"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_detalle_agente_nuevo"
            columns: ["id_agente_nuevo"]
            isOneToOne: false
            referencedRelation: "vista_inasistencias_mes"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_detalle_agente_nuevo"
            columns: ["id_agente_nuevo"]
            isOneToOne: false
            referencedRelation: "vista_planificacion_escuelas"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_detalle_agente_nuevo"
            columns: ["id_agente_nuevo"]
            isOneToOne: false
            referencedRelation: "vista_saldo_horas_live"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_detalle_agente_nuevo"
            columns: ["id_agente_nuevo"]
            isOneToOne: false
            referencedRelation: "vista_saldos_resumen"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_detalle_agente_nuevo"
            columns: ["id_agente_nuevo"]
            isOneToOne: false
            referencedRelation: "vista_seguimiento_residentes"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_detalle_agente_orig"
            columns: ["id_agente_original"]
            isOneToOne: false
            referencedRelation: "datos_personales"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_detalle_agente_orig"
            columns: ["id_agente_original"]
            isOneToOne: false
            referencedRelation: "vista_agentes_capacitados"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_detalle_agente_orig"
            columns: ["id_agente_original"]
            isOneToOne: false
            referencedRelation: "vista_historial_capacitaciones"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_detalle_agente_orig"
            columns: ["id_agente_original"]
            isOneToOne: false
            referencedRelation: "vista_inasistencias_mes"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_detalle_agente_orig"
            columns: ["id_agente_original"]
            isOneToOne: false
            referencedRelation: "vista_planificacion_escuelas"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_detalle_agente_orig"
            columns: ["id_agente_original"]
            isOneToOne: false
            referencedRelation: "vista_saldo_horas_live"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_detalle_agente_orig"
            columns: ["id_agente_original"]
            isOneToOne: false
            referencedRelation: "vista_saldos_resumen"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_detalle_agente_orig"
            columns: ["id_agente_original"]
            isOneToOne: false
            referencedRelation: "vista_seguimiento_residentes"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_detalle_conv_nueva"
            columns: ["id_convocatoria_nueva"]
            isOneToOne: false
            referencedRelation: "convocatoria"
            referencedColumns: ["id_convocatoria"]
          },
          {
            foreignKeyName: "fk_detalle_conv_nueva"
            columns: ["id_convocatoria_nueva"]
            isOneToOne: false
            referencedRelation: "vista_cambios_turno"
            referencedColumns: ["id_nuevo"]
          },
          {
            foreignKeyName: "fk_detalle_conv_nueva"
            columns: ["id_convocatoria_nueva"]
            isOneToOne: false
            referencedRelation: "vista_convocatoria_completa"
            referencedColumns: ["id_convocatoria"]
          },
          {
            foreignKeyName: "fk_detalle_conv_nueva"
            columns: ["id_convocatoria_nueva"]
            isOneToOne: false
            referencedRelation: "vista_convocatoria_mes_activo"
            referencedColumns: ["id_convocatoria"]
          },
          {
            foreignKeyName: "fk_detalle_conv_nueva"
            columns: ["id_convocatoria_nueva"]
            isOneToOne: false
            referencedRelation: "vista_planificacion_escuelas"
            referencedColumns: ["id_convocatoria"]
          },
          {
            foreignKeyName: "fk_detalle_conv_orig"
            columns: ["id_convocatoria_original"]
            isOneToOne: false
            referencedRelation: "convocatoria"
            referencedColumns: ["id_convocatoria"]
          },
          {
            foreignKeyName: "fk_detalle_conv_orig"
            columns: ["id_convocatoria_original"]
            isOneToOne: false
            referencedRelation: "vista_cambios_turno"
            referencedColumns: ["id_nuevo"]
          },
          {
            foreignKeyName: "fk_detalle_conv_orig"
            columns: ["id_convocatoria_original"]
            isOneToOne: false
            referencedRelation: "vista_convocatoria_completa"
            referencedColumns: ["id_convocatoria"]
          },
          {
            foreignKeyName: "fk_detalle_conv_orig"
            columns: ["id_convocatoria_original"]
            isOneToOne: false
            referencedRelation: "vista_convocatoria_mes_activo"
            referencedColumns: ["id_convocatoria"]
          },
          {
            foreignKeyName: "fk_detalle_conv_orig"
            columns: ["id_convocatoria_original"]
            isOneToOne: false
            referencedRelation: "vista_planificacion_escuelas"
            referencedColumns: ["id_convocatoria"]
          },
          {
            foreignKeyName: "fk_detalle_trans"
            columns: ["id_transaccion"]
            isOneToOne: false
            referencedRelation: "cambio_transaccion"
            referencedColumns: ["id_transaccion"]
          },
          {
            foreignKeyName: "fk_detalle_trans"
            columns: ["id_transaccion"]
            isOneToOne: false
            referencedRelation: "vista_cambios_pendientes"
            referencedColumns: ["id_transaccion"]
          },
        ]
      }
      cambio_validacion: {
        Row: {
          detalle_tecnico: string | null
          es_alerta: boolean | null
          es_bloqueante: boolean | null
          estado: string | null
          fecha_resolucion: string | null
          fecha_validacion: string | null
          id_transaccion: number
          id_validacion: number
          mensaje: string
          tipo_validacion: string
          usuario_resolucion: string | null
        }
        Insert: {
          detalle_tecnico?: string | null
          es_alerta?: boolean | null
          es_bloqueante?: boolean | null
          estado?: string | null
          fecha_resolucion?: string | null
          fecha_validacion?: string | null
          id_transaccion: number
          id_validacion?: number
          mensaje: string
          tipo_validacion: string
          usuario_resolucion?: string | null
        }
        Update: {
          detalle_tecnico?: string | null
          es_alerta?: boolean | null
          es_bloqueante?: boolean | null
          estado?: string | null
          fecha_resolucion?: string | null
          fecha_validacion?: string | null
          id_transaccion?: number
          id_validacion?: number
          mensaje?: string
          tipo_validacion?: string
          usuario_resolucion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_val_trans"
            columns: ["id_transaccion"]
            isOneToOne: false
            referencedRelation: "cambio_transaccion"
            referencedColumns: ["id_transaccion"]
          },
          {
            foreignKeyName: "fk_val_trans"
            columns: ["id_transaccion"]
            isOneToOne: false
            referencedRelation: "vista_cambios_pendientes"
            referencedColumns: ["id_transaccion"]
          },
        ]
      }
      capacitaciones: {
        Row: {
          coordinador_cap: number
          fecha_registro: string | null
          grupo: string | null
          id_cap: number
          id_dia: number
          id_turno: number | null
          observaciones: string | null
          tema: string
        }
        Insert: {
          coordinador_cap: number
          fecha_registro?: string | null
          grupo?: string | null
          id_cap?: number
          id_dia: number
          id_turno?: number | null
          observaciones?: string | null
          tema: string
        }
        Update: {
          coordinador_cap?: number
          fecha_registro?: string | null
          grupo?: string | null
          id_cap?: number
          id_dia?: number
          id_turno?: number | null
          observaciones?: string | null
          tema?: string
        }
        Relationships: [
          {
            foreignKeyName: "capacitaciones_id_turno_fkey"
            columns: ["id_turno"]
            isOneToOne: false
            referencedRelation: "turnos"
            referencedColumns: ["id_turno"]
          },
          {
            foreignKeyName: "capacitaciones_id_turno_fkey"
            columns: ["id_turno"]
            isOneToOne: false
            referencedRelation: "vista_convocatoria_completa"
            referencedColumns: ["id_turno"]
          },
          {
            foreignKeyName: "capacitaciones_id_turno_fkey"
            columns: ["id_turno"]
            isOneToOne: false
            referencedRelation: "vista_convocatoria_mes_activo"
            referencedColumns: ["id_turno"]
          },
          {
            foreignKeyName: "capacitaciones_id_turno_fkey"
            columns: ["id_turno"]
            isOneToOne: false
            referencedRelation: "vista_disponibilidad_visitas"
            referencedColumns: ["id_turno"]
          },
          {
            foreignKeyName: "fk_cap_coordinador"
            columns: ["coordinador_cap"]
            isOneToOne: false
            referencedRelation: "datos_personales"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_cap_coordinador"
            columns: ["coordinador_cap"]
            isOneToOne: false
            referencedRelation: "vista_agentes_capacitados"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_cap_coordinador"
            columns: ["coordinador_cap"]
            isOneToOne: false
            referencedRelation: "vista_historial_capacitaciones"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_cap_coordinador"
            columns: ["coordinador_cap"]
            isOneToOne: false
            referencedRelation: "vista_inasistencias_mes"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_cap_coordinador"
            columns: ["coordinador_cap"]
            isOneToOne: false
            referencedRelation: "vista_planificacion_escuelas"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_cap_coordinador"
            columns: ["coordinador_cap"]
            isOneToOne: false
            referencedRelation: "vista_saldo_horas_live"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_cap_coordinador"
            columns: ["coordinador_cap"]
            isOneToOne: false
            referencedRelation: "vista_saldos_resumen"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_cap_coordinador"
            columns: ["coordinador_cap"]
            isOneToOne: false
            referencedRelation: "vista_seguimiento_residentes"
            referencedColumns: ["id_agente"]
          },
        ]
      }
      capacitaciones_dispositivos: {
        Row: {
          id_cap: number
          id_cap_dispo: number
          id_dispositivo: number
          orden: number | null
          tiempo_minutos: number | null
        }
        Insert: {
          id_cap: number
          id_cap_dispo?: number
          id_dispositivo: number
          orden?: number | null
          tiempo_minutos?: number | null
        }
        Update: {
          id_cap?: number
          id_cap_dispo?: number
          id_dispositivo?: number
          orden?: number | null
          tiempo_minutos?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_cap_dispo_cap"
            columns: ["id_cap"]
            isOneToOne: false
            referencedRelation: "capacitaciones"
            referencedColumns: ["id_cap"]
          },
          {
            foreignKeyName: "fk_cap_dispo_dispo"
            columns: ["id_dispositivo"]
            isOneToOne: false
            referencedRelation: "dispositivos"
            referencedColumns: ["id_dispositivo"]
          },
          {
            foreignKeyName: "fk_cap_dispo_dispo"
            columns: ["id_dispositivo"]
            isOneToOne: false
            referencedRelation: "vista_agentes_capacitados"
            referencedColumns: ["id_dispositivo"]
          },
          {
            foreignKeyName: "fk_cap_dispo_dispo"
            columns: ["id_dispositivo"]
            isOneToOne: false
            referencedRelation: "vista_dispositivos_ocupacion"
            referencedColumns: ["id_dispositivo"]
          },
          {
            foreignKeyName: "fk_cap_dispo_dispo"
            columns: ["id_dispositivo"]
            isOneToOne: false
            referencedRelation: "vista_historial_capacitaciones"
            referencedColumns: ["id_dispositivo"]
          },
          {
            foreignKeyName: "fk_cap_dispo_dispo"
            columns: ["id_dispositivo"]
            isOneToOne: false
            referencedRelation: "vista_salud_dispositivos"
            referencedColumns: ["id_dispositivo"]
          },
        ]
      }
      capacitaciones_participantes: {
        Row: {
          asistio: boolean | null
          id_agente: number
          id_cap: number
          id_participante: number
          observaciones: string | null
        }
        Insert: {
          asistio?: boolean | null
          id_agente: number
          id_cap: number
          id_participante?: number
          observaciones?: string | null
        }
        Update: {
          asistio?: boolean | null
          id_agente?: number
          id_cap?: number
          id_participante?: number
          observaciones?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_cap_part_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "datos_personales"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_cap_part_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_agentes_capacitados"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_cap_part_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_historial_capacitaciones"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_cap_part_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_inasistencias_mes"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_cap_part_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_planificacion_escuelas"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_cap_part_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_saldo_horas_live"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_cap_part_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_saldos_resumen"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_cap_part_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_seguimiento_residentes"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_cap_part_cap"
            columns: ["id_cap"]
            isOneToOne: false
            referencedRelation: "capacitaciones"
            referencedColumns: ["id_cap"]
          },
        ]
      }
      certificados: {
        Row: {
          estado_certificado: string | null
          fecha_entrega_certificado: string
          fecha_inasistencia_justifica: string
          fecha_revision: string | null
          id_agente: number
          id_certificado: number
          id_inasistencia: number
          motivo_rechazo: string | null
          observaciones: string | null
          tipo_certificado: string | null
          usuario_reviso: string | null
        }
        Insert: {
          estado_certificado?: string | null
          fecha_entrega_certificado: string
          fecha_inasistencia_justifica: string
          fecha_revision?: string | null
          id_agente: number
          id_certificado?: number
          id_inasistencia: number
          motivo_rechazo?: string | null
          observaciones?: string | null
          tipo_certificado?: string | null
          usuario_reviso?: string | null
        }
        Update: {
          estado_certificado?: string | null
          fecha_entrega_certificado?: string
          fecha_inasistencia_justifica?: string
          fecha_revision?: string | null
          id_agente?: number
          id_certificado?: number
          id_inasistencia?: number
          motivo_rechazo?: string | null
          observaciones?: string | null
          tipo_certificado?: string | null
          usuario_reviso?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_cert_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "datos_personales"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_cert_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_agentes_capacitados"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_cert_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_historial_capacitaciones"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_cert_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_inasistencias_mes"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_cert_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_planificacion_escuelas"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_cert_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_saldo_horas_live"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_cert_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_saldos_resumen"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_cert_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_seguimiento_residentes"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_cert_inasis"
            columns: ["id_inasistencia"]
            isOneToOne: false
            referencedRelation: "inasistencias"
            referencedColumns: ["id_inasistencia"]
          },
          {
            foreignKeyName: "fk_cert_inasis"
            columns: ["id_inasistencia"]
            isOneToOne: false
            referencedRelation: "vista_inasistencias_completa"
            referencedColumns: ["id_inasistencia"]
          },
          {
            foreignKeyName: "fk_cert_inasis"
            columns: ["id_inasistencia"]
            isOneToOne: false
            referencedRelation: "vista_inasistencias_mes"
            referencedColumns: ["id_inasistencia"]
          },
        ]
      }
      config_ciclo_lectivo: {
        Row: {
          anio: number
          fecha_fin: string
          fecha_inicio: string
          horas_semanales_meta: number | null
          limite_imprevistos_anual: number | null
          limite_imprevistos_mensual: number | null
          limite_inasistencias_injustificadas: number | null
          limite_inasistencias_justificadas: number | null
        }
        Insert: {
          anio: number
          fecha_fin: string
          fecha_inicio: string
          horas_semanales_meta?: number | null
          limite_imprevistos_anual?: number | null
          limite_imprevistos_mensual?: number | null
          limite_inasistencias_injustificadas?: number | null
          limite_inasistencias_justificadas?: number | null
        }
        Update: {
          anio?: number
          fecha_fin?: string
          fecha_inicio?: string
          horas_semanales_meta?: number | null
          limite_imprevistos_anual?: number | null
          limite_imprevistos_mensual?: number | null
          limite_inasistencias_injustificadas?: number | null
          limite_inasistencias_justificadas?: number | null
        }
        Relationships: []
      }
      config_cohorte: {
        Row: {
          activo: boolean | null
          anio: number
          created_at: string | null
          fecha_fin: string
          fecha_inicio: string
          horas_semanales_requeridas: number | null
        }
        Insert: {
          activo?: boolean | null
          anio: number
          created_at?: string | null
          fecha_fin: string
          fecha_inicio: string
          horas_semanales_requeridas?: number | null
        }
        Update: {
          activo?: boolean | null
          anio?: number
          created_at?: string | null
          fecha_fin?: string
          fecha_inicio?: string
          horas_semanales_requeridas?: number | null
        }
        Relationships: []
      }
      config_visitas_coeficientes: {
        Row: {
          activo: boolean | null
          id_coeficiente: number
          nombre_categoria: string
          rango_edad_texto: string | null
          valor: number
        }
        Insert: {
          activo?: boolean | null
          id_coeficiente?: number
          nombre_categoria: string
          rango_edad_texto?: string | null
          valor?: number
        }
        Update: {
          activo?: boolean | null
          id_coeficiente?: number
          nombre_categoria?: string
          rango_edad_texto?: string | null
          valor?: number
        }
        Relationships: []
      }
      configuracion: {
        Row: {
          clave: string
          descripcion: string | null
          fecha_modificacion: string | null
          modificado_por: string | null
          tipo_dato: string | null
          valor: string
        }
        Insert: {
          clave: string
          descripcion?: string | null
          fecha_modificacion?: string | null
          modificado_por?: string | null
          tipo_dato?: string | null
          valor: string
        }
        Update: {
          clave?: string
          descripcion?: string | null
          fecha_modificacion?: string | null
          modificado_por?: string | null
          tipo_dato?: string | null
          valor?: string
        }
        Relationships: []
      }
      configuracion_turnos: {
        Row: {
          fecha: string
          id_turno: number
          tipo_organizacion: string
        }
        Insert: {
          fecha: string
          id_turno: number
          tipo_organizacion?: string
        }
        Update: {
          fecha?: string
          id_turno?: number
          tipo_organizacion?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_config_turnos"
            columns: ["id_turno"]
            isOneToOne: false
            referencedRelation: "turnos"
            referencedColumns: ["id_turno"]
          }
        ]
      }
      convocatoria: {
        Row: {
          estado: string | null
          fecha_convocatoria: string
          fecha_modificacion: string | null
          fecha_registro: string | null
          id_agente: number
          id_convocatoria: number
          id_convocatoria_origen: number | null
          id_plani: number
          id_turno: number
          motivo_cambio: string | null
          turno_cancelado: boolean | null
          usuario_modificacion: string | null
        }
        Insert: {
          estado?: string | null
          fecha_convocatoria: string
          fecha_modificacion?: string | null
          fecha_registro?: string | null
          id_agente: number
          id_convocatoria?: number
          id_convocatoria_origen?: number | null
          id_plani: number
          id_turno: number
          motivo_cambio?: string | null
          turno_cancelado?: boolean | null
          usuario_modificacion?: string | null
        }
        Update: {
          estado?: string | null
          fecha_convocatoria?: string
          fecha_modificacion?: string | null
          fecha_registro?: string | null
          id_agente?: number
          id_convocatoria?: number
          id_convocatoria_origen?: number | null
          id_plani?: number
          id_turno?: number
          motivo_cambio?: string | null
          turno_cancelado?: boolean | null
          usuario_modificacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_conv_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "datos_personales"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_conv_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_agentes_capacitados"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_conv_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_historial_capacitaciones"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_conv_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_inasistencias_mes"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_conv_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_planificacion_escuelas"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_conv_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_saldo_horas_live"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_conv_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_saldos_resumen"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_conv_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_seguimiento_residentes"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_conv_origen"
            columns: ["id_convocatoria_origen"]
            isOneToOne: false
            referencedRelation: "convocatoria"
            referencedColumns: ["id_convocatoria"]
          },
          {
            foreignKeyName: "fk_conv_origen"
            columns: ["id_convocatoria_origen"]
            isOneToOne: false
            referencedRelation: "vista_cambios_turno"
            referencedColumns: ["id_nuevo"]
          },
          {
            foreignKeyName: "fk_conv_origen"
            columns: ["id_convocatoria_origen"]
            isOneToOne: false
            referencedRelation: "vista_convocatoria_completa"
            referencedColumns: ["id_convocatoria"]
          },
          {
            foreignKeyName: "fk_conv_origen"
            columns: ["id_convocatoria_origen"]
            isOneToOne: false
            referencedRelation: "vista_convocatoria_mes_activo"
            referencedColumns: ["id_convocatoria"]
          },
          {
            foreignKeyName: "fk_conv_origen"
            columns: ["id_convocatoria_origen"]
            isOneToOne: false
            referencedRelation: "vista_planificacion_escuelas"
            referencedColumns: ["id_convocatoria"]
          },
          {
            foreignKeyName: "fk_conv_plani"
            columns: ["id_plani"]
            isOneToOne: false
            referencedRelation: "planificacion"
            referencedColumns: ["id_plani"]
          },
          {
            foreignKeyName: "fk_conv_plani"
            columns: ["id_plani"]
            isOneToOne: false
            referencedRelation: "vista_disponibilidad_visitas"
            referencedColumns: ["id_plani"]
          },
          {
            foreignKeyName: "fk_conv_plani"
            columns: ["id_plani"]
            isOneToOne: false
            referencedRelation: "vista_estado_cobertura"
            referencedColumns: ["id_plani"]
          },
          {
            foreignKeyName: "fk_conv_plani"
            columns: ["id_plani"]
            isOneToOne: false
            referencedRelation: "vista_ocupacion"
            referencedColumns: ["id_plani"]
          },
          {
            foreignKeyName: "fk_conv_plani"
            columns: ["id_plani"]
            isOneToOne: false
            referencedRelation: "vista_planificacion_anio"
            referencedColumns: ["id_plani"]
          },
        ]
      }
      convocatoria_historial: {
        Row: {
          fecha_cambio: string | null
          id_agente_anterior: number
          id_agente_nuevo: number
          id_convocatoria: number
          id_hist: number
          id_transaccion_cambio: number | null
          motivo: string | null
          tipo_cambio: string
          usuario_responsable: string | null
        }
        Insert: {
          fecha_cambio?: string | null
          id_agente_anterior: number
          id_agente_nuevo: number
          id_convocatoria: number
          id_hist?: number
          id_transaccion_cambio?: number | null
          motivo?: string | null
          tipo_cambio: string
          usuario_responsable?: string | null
        }
        Update: {
          fecha_cambio?: string | null
          id_agente_anterior?: number
          id_agente_nuevo?: number
          id_convocatoria?: number
          id_hist?: number
          id_transaccion_cambio?: number | null
          motivo?: string | null
          tipo_cambio?: string
          usuario_responsable?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_hist_agente_ant"
            columns: ["id_agente_anterior"]
            isOneToOne: false
            referencedRelation: "datos_personales"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_hist_agente_ant"
            columns: ["id_agente_anterior"]
            isOneToOne: false
            referencedRelation: "vista_agentes_capacitados"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_hist_agente_ant"
            columns: ["id_agente_anterior"]
            isOneToOne: false
            referencedRelation: "vista_historial_capacitaciones"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_hist_agente_ant"
            columns: ["id_agente_anterior"]
            isOneToOne: false
            referencedRelation: "vista_inasistencias_mes"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_hist_agente_ant"
            columns: ["id_agente_anterior"]
            isOneToOne: false
            referencedRelation: "vista_planificacion_escuelas"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_hist_agente_ant"
            columns: ["id_agente_anterior"]
            isOneToOne: false
            referencedRelation: "vista_saldo_horas_live"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_hist_agente_ant"
            columns: ["id_agente_anterior"]
            isOneToOne: false
            referencedRelation: "vista_saldos_resumen"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_hist_agente_ant"
            columns: ["id_agente_anterior"]
            isOneToOne: false
            referencedRelation: "vista_seguimiento_residentes"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_hist_agente_nue"
            columns: ["id_agente_nuevo"]
            isOneToOne: false
            referencedRelation: "datos_personales"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_hist_agente_nue"
            columns: ["id_agente_nuevo"]
            isOneToOne: false
            referencedRelation: "vista_agentes_capacitados"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_hist_agente_nue"
            columns: ["id_agente_nuevo"]
            isOneToOne: false
            referencedRelation: "vista_historial_capacitaciones"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_hist_agente_nue"
            columns: ["id_agente_nuevo"]
            isOneToOne: false
            referencedRelation: "vista_inasistencias_mes"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_hist_agente_nue"
            columns: ["id_agente_nuevo"]
            isOneToOne: false
            referencedRelation: "vista_planificacion_escuelas"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_hist_agente_nue"
            columns: ["id_agente_nuevo"]
            isOneToOne: false
            referencedRelation: "vista_saldo_horas_live"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_hist_agente_nue"
            columns: ["id_agente_nuevo"]
            isOneToOne: false
            referencedRelation: "vista_saldos_resumen"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_hist_agente_nue"
            columns: ["id_agente_nuevo"]
            isOneToOne: false
            referencedRelation: "vista_seguimiento_residentes"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_hist_conv"
            columns: ["id_convocatoria"]
            isOneToOne: false
            referencedRelation: "convocatoria"
            referencedColumns: ["id_convocatoria"]
          },
          {
            foreignKeyName: "fk_hist_conv"
            columns: ["id_convocatoria"]
            isOneToOne: false
            referencedRelation: "vista_cambios_turno"
            referencedColumns: ["id_nuevo"]
          },
          {
            foreignKeyName: "fk_hist_conv"
            columns: ["id_convocatoria"]
            isOneToOne: false
            referencedRelation: "vista_convocatoria_completa"
            referencedColumns: ["id_convocatoria"]
          },
          {
            foreignKeyName: "fk_hist_conv"
            columns: ["id_convocatoria"]
            isOneToOne: false
            referencedRelation: "vista_convocatoria_mes_activo"
            referencedColumns: ["id_convocatoria"]
          },
          {
            foreignKeyName: "fk_hist_conv"
            columns: ["id_convocatoria"]
            isOneToOne: false
            referencedRelation: "vista_planificacion_escuelas"
            referencedColumns: ["id_convocatoria"]
          },
        ]
      }
      correos_visita: {
        Row: {
          asunto: string | null
          created_at: string | null
          cuerpo: string | null
          destinatario_email: string
          estado_envio: string
          fecha_envio: string | null
          fecha_respuesta: string | null
          id_asignacion: number
          id_correo: number
          notas: string | null
          respuesta_recibida: boolean | null
          tipo_correo: string
        }
        Insert: {
          asunto?: string | null
          created_at?: string | null
          cuerpo?: string | null
          destinatario_email: string
          estado_envio?: string
          fecha_envio?: string | null
          fecha_respuesta?: string | null
          id_asignacion: number
          id_correo?: number
          notas?: string | null
          respuesta_recibida?: boolean | null
          tipo_correo?: string
        }
        Update: {
          asunto?: string | null
          created_at?: string | null
          cuerpo?: string | null
          destinatario_email?: string
          estado_envio?: string
          fecha_envio?: string | null
          fecha_respuesta?: string | null
          id_asignacion?: number
          id_correo?: number
          notas?: string | null
          respuesta_recibida?: boolean | null
          tipo_correo?: string
        }
        Relationships: [
          {
            foreignKeyName: "correos_visita_id_asignacion_fkey"
            columns: ["id_asignacion"]
            isOneToOne: false
            referencedRelation: "asignaciones_visita"
            referencedColumns: ["id_asignacion"]
          },
        ]
      }
      datos_personales: {
        Row: {
          activo: boolean | null
          apellido: string
          cohorte: number
          dni: string
          domicilio: string | null
          email: string | null
          fecha_alta: string | null
          fecha_baja: string | null
          fecha_nacimiento: string | null
          id_agente: number
          nombre: string
          telefono: string | null
        }
        Insert: {
          activo?: boolean | null
          apellido: string
          cohorte?: number
          dni: string
          domicilio?: string | null
          email?: string | null
          fecha_alta?: string | null
          fecha_baja?: string | null
          fecha_nacimiento?: string | null
          id_agente?: number
          nombre: string
          telefono?: string | null
        }
        Update: {
          activo?: boolean | null
          apellido?: string
          cohorte?: number
          dni?: string
          domicilio?: string | null
          email?: string | null
          fecha_alta?: string | null
          fecha_baja?: string | null
          fecha_nacimiento?: string | null
          id_agente?: number
          nombre?: string
          telefono?: string | null
        }
        Relationships: []
      }
      datos_personales_adicionales: {
        Row: {
          created_at: string | null
          formacion_extra: string | null
          id_agente: number
          info_extra: string | null
          nombre_preferido: string | null
          pronombres: string | null
          referencia_emergencia: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          formacion_extra?: string | null
          id_agente: number
          info_extra?: string | null
          nombre_preferido?: string | null
          pronombres?: string | null
          referencia_emergencia?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          formacion_extra?: string | null
          id_agente?: number
          info_extra?: string | null
          nombre_preferido?: string | null
          pronombres?: string | null
          referencia_emergencia?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "datos_personales_adicionales_id_agente_fkey"
            columns: ["id_agente"]
            isOneToOne: true
            referencedRelation: "datos_personales"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "datos_personales_adicionales_id_agente_fkey"
            columns: ["id_agente"]
            isOneToOne: true
            referencedRelation: "vista_agentes_capacitados"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "datos_personales_adicionales_id_agente_fkey"
            columns: ["id_agente"]
            isOneToOne: true
            referencedRelation: "vista_historial_capacitaciones"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "datos_personales_adicionales_id_agente_fkey"
            columns: ["id_agente"]
            isOneToOne: true
            referencedRelation: "vista_inasistencias_mes"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "datos_personales_adicionales_id_agente_fkey"
            columns: ["id_agente"]
            isOneToOne: true
            referencedRelation: "vista_planificacion_escuelas"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "datos_personales_adicionales_id_agente_fkey"
            columns: ["id_agente"]
            isOneToOne: true
            referencedRelation: "vista_saldo_horas_live"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "datos_personales_adicionales_id_agente_fkey"
            columns: ["id_agente"]
            isOneToOne: true
            referencedRelation: "vista_saldos_resumen"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "datos_personales_adicionales_id_agente_fkey"
            columns: ["id_agente"]
            isOneToOne: true
            referencedRelation: "vista_seguimiento_residentes"
            referencedColumns: ["id_agente"]
          },
        ]
      }
      descansos: {
        Row: {
          dia_solicitado: string
          estado: string | null
          fecha_respuesta: string | null
          fecha_solicitud: string | null
          id_agente: number
          id_desc: number
          mes_solicitado: number
          observaciones: string | null
        }
        Insert: {
          dia_solicitado: string
          estado?: string | null
          fecha_respuesta?: string | null
          fecha_solicitud?: string | null
          id_agente: number
          id_desc?: number
          mes_solicitado: number
          observaciones?: string | null
        }
        Update: {
          dia_solicitado?: string
          estado?: string | null
          fecha_respuesta?: string | null
          fecha_solicitud?: string | null
          id_agente?: number
          id_desc?: number
          mes_solicitado?: number
          observaciones?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_desc_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "datos_personales"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_desc_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_agentes_capacitados"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_desc_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_historial_capacitaciones"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_desc_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_inasistencias_mes"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_desc_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_planificacion_escuelas"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_desc_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_saldo_horas_live"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_desc_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_saldos_resumen"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_desc_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_seguimiento_residentes"
            referencedColumns: ["id_agente"]
          },
        ]
      }
      dias: {
        Row: {
          anio: number
          descripcion_feriado: string | null
          dia: number
          es_feriado: boolean | null
          fecha: string
          id_dia: number
          mes: number
          numero_dia_semana: number
        }
        Insert: {
          anio: number
          descripcion_feriado?: string | null
          dia: number
          es_feriado?: boolean | null
          fecha: string
          id_dia?: number
          mes: number
          numero_dia_semana: number
        }
        Update: {
          anio?: number
          descripcion_feriado?: string | null
          dia?: number
          es_feriado?: boolean | null
          fecha?: string
          id_dia?: number
          mes?: number
          numero_dia_semana?: number
        }
        Relationships: []
      }
      disponibilidad: {
        Row: {
          estado: string | null
          fecha_declaracion: string | null
          id_agente: number
          id_dispo: number
          id_turno: number
          prioridad: number | null
        }
        Insert: {
          estado?: string | null
          fecha_declaracion?: string | null
          id_agente: number
          id_dispo?: number
          id_turno: number
          prioridad?: number | null
        }
        Update: {
          estado?: string | null
          fecha_declaracion?: string | null
          id_agente?: number
          id_dispo?: number
          id_turno?: number
          prioridad?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_dispo_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "datos_personales"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_dispo_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_agentes_capacitados"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_dispo_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_historial_capacitaciones"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_dispo_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_inasistencias_mes"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_dispo_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_planificacion_escuelas"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_dispo_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_saldo_horas_live"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_dispo_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_saldos_resumen"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_dispo_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_seguimiento_residentes"
            referencedColumns: ["id_agente"]
          },
        ]
      }
      dispositivos: {
        Row: {
          activo: boolean | null
          cupo_minimo: number | null
          cupo_optimo: number | null
          es_critico: boolean | null
          fecha_creacion: string | null
          id_dispositivo: number
          nombre_dispositivo: string
          piso_dispositivo: number
        }
        Insert: {
          activo?: boolean | null
          cupo_minimo?: number | null
          cupo_optimo?: number | null
          es_critico?: boolean | null
          fecha_creacion?: string | null
          id_dispositivo?: number
          nombre_dispositivo: string
          piso_dispositivo: number
        }
        Update: {
          activo?: boolean | null
          cupo_minimo?: number | null
          cupo_optimo?: number | null
          es_critico?: boolean | null
          fecha_creacion?: string | null
          id_dispositivo?: number
          nombre_dispositivo?: string
          piso_dispositivo?: number
        }
        Relationships: []
      }
      error_patterns: {
        Row: {
          affected_users_count: number | null
          component: string | null
          error_type: string | null
          first_occurrence: string | null
          id_pattern: number
          last_occurrence: string | null
          occurrence_count: number | null
          pattern_signature: string
          pattern_status: string | null
          resolution_description: string | null
          severity_max: string | null
        }
        Insert: {
          affected_users_count?: number | null
          component?: string | null
          error_type?: string | null
          first_occurrence?: string | null
          id_pattern?: number
          last_occurrence?: string | null
          occurrence_count?: number | null
          pattern_signature: string
          pattern_status?: string | null
          resolution_description?: string | null
          severity_max?: string | null
        }
        Update: {
          affected_users_count?: number | null
          component?: string | null
          error_type?: string | null
          first_occurrence?: string | null
          id_pattern?: number
          last_occurrence?: string | null
          occurrence_count?: number | null
          pattern_signature?: string
          pattern_status?: string | null
          resolution_description?: string | null
          severity_max?: string | null
        }
        Relationships: []
      }
      inasistencias: {
        Row: {
          certificado_presentado: boolean | null
          descuento_confirmado: boolean | null
          estado: string | null
          fecha_actualizacion_estado: string | null
          fecha_aviso: string | null
          fecha_inasistencia: string
          genera_descuento: boolean | null
          id_agente: number
          id_inasistencia: number
          mes_informe_descuento: number | null
          motivo: string
          observaciones: string | null
          requiere_certificado: boolean | null
          tipo: string | null
          usuario_actualizo_estado: string | null
        }
        Insert: {
          certificado_presentado?: boolean | null
          descuento_confirmado?: boolean | null
          estado?: string | null
          fecha_actualizacion_estado?: string | null
          fecha_aviso?: string | null
          fecha_inasistencia: string
          genera_descuento?: boolean | null
          id_agente: number
          id_inasistencia?: number
          mes_informe_descuento?: number | null
          motivo?: string
          observaciones?: string | null
          requiere_certificado?: boolean | null
          tipo?: string | null
          usuario_actualizo_estado?: string | null
        }
        Update: {
          certificado_presentado?: boolean | null
          descuento_confirmado?: boolean | null
          estado?: string | null
          fecha_actualizacion_estado?: string | null
          fecha_aviso?: string | null
          fecha_inasistencia?: string
          genera_descuento?: boolean | null
          id_agente?: number
          id_inasistencia?: number
          mes_informe_descuento?: number | null
          motivo?: string
          observaciones?: string | null
          requiere_certificado?: boolean | null
          tipo?: string | null
          usuario_actualizo_estado?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_inasis_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "datos_personales"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_inasis_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_agentes_capacitados"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_inasis_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_historial_capacitaciones"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_inasis_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_inasistencias_mes"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_inasis_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_planificacion_escuelas"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_inasis_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_saldo_horas_live"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_inasis_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_saldos_resumen"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_inasis_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_seguimiento_residentes"
            referencedColumns: ["id_agente"]
          },
        ]
      }
      menu: {
        Row: {
          acompaña_grupo: boolean | null
          dispositivo_cerrado: boolean | null
          es_capacitacion_servicio: boolean | null
          estado_ejecucion: string | null
          fecha_asignacion: string
          fecha_registro: string | null
          id_agente: number
          id_convocatoria: number
          id_dispositivo: number
          id_dispositivo_origen: number | null
          id_menu: number
          orden: number | null
        }
        Insert: {
          acompaña_grupo?: boolean | null
          dispositivo_cerrado?: boolean | null
          es_capacitacion_servicio?: boolean | null
          estado_ejecucion?: string | null
          fecha_asignacion: string
          fecha_registro?: string | null
          id_agente: number
          id_convocatoria: number
          id_dispositivo: number
          id_dispositivo_origen?: number | null
          id_menu?: number
          orden?: number | null
        }
        Update: {
          acompaña_grupo?: boolean | null
          dispositivo_cerrado?: boolean | null
          es_capacitacion_servicio?: boolean | null
          estado_ejecucion?: string | null
          fecha_asignacion?: string
          fecha_registro?: string | null
          id_agente?: number
          id_convocatoria?: number
          id_dispositivo?: number
          id_dispositivo_origen?: number | null
          id_menu?: number
          orden?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_menu_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "datos_personales"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_menu_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_agentes_capacitados"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_menu_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_historial_capacitaciones"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_menu_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_inasistencias_mes"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_menu_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_planificacion_escuelas"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_menu_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_saldo_horas_live"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_menu_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_saldos_resumen"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_menu_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_seguimiento_residentes"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_menu_conv"
            columns: ["id_convocatoria"]
            isOneToOne: false
            referencedRelation: "convocatoria"
            referencedColumns: ["id_convocatoria"]
          },
          {
            foreignKeyName: "fk_menu_conv"
            columns: ["id_convocatoria"]
            isOneToOne: false
            referencedRelation: "vista_cambios_turno"
            referencedColumns: ["id_nuevo"]
          },
          {
            foreignKeyName: "fk_menu_conv"
            columns: ["id_convocatoria"]
            isOneToOne: false
            referencedRelation: "vista_convocatoria_completa"
            referencedColumns: ["id_convocatoria"]
          },
          {
            foreignKeyName: "fk_menu_conv"
            columns: ["id_convocatoria"]
            isOneToOne: false
            referencedRelation: "vista_convocatoria_mes_activo"
            referencedColumns: ["id_convocatoria"]
          },
          {
            foreignKeyName: "fk_menu_conv"
            columns: ["id_convocatoria"]
            isOneToOne: false
            referencedRelation: "vista_planificacion_escuelas"
            referencedColumns: ["id_convocatoria"]
          },
          {
            foreignKeyName: "fk_menu_dispo"
            columns: ["id_dispositivo"]
            isOneToOne: false
            referencedRelation: "dispositivos"
            referencedColumns: ["id_dispositivo"]
          },
          {
            foreignKeyName: "fk_menu_dispo"
            columns: ["id_dispositivo"]
            isOneToOne: false
            referencedRelation: "vista_agentes_capacitados"
            referencedColumns: ["id_dispositivo"]
          },
          {
            foreignKeyName: "fk_menu_dispo"
            columns: ["id_dispositivo"]
            isOneToOne: false
            referencedRelation: "vista_dispositivos_ocupacion"
            referencedColumns: ["id_dispositivo"]
          },
          {
            foreignKeyName: "fk_menu_dispo"
            columns: ["id_dispositivo"]
            isOneToOne: false
            referencedRelation: "vista_historial_capacitaciones"
            referencedColumns: ["id_dispositivo"]
          },
          {
            foreignKeyName: "fk_menu_dispo"
            columns: ["id_dispositivo"]
            isOneToOne: false
            referencedRelation: "vista_salud_dispositivos"
            referencedColumns: ["id_dispositivo"]
          },
          {
            foreignKeyName: "fk_menu_dispositivo_origen"
            columns: ["id_dispositivo_origen"]
            isOneToOne: false
            referencedRelation: "dispositivos"
            referencedColumns: ["id_dispositivo"]
          },
          {
            foreignKeyName: "fk_menu_dispositivo_origen"
            columns: ["id_dispositivo_origen"]
            isOneToOne: false
            referencedRelation: "vista_agentes_capacitados"
            referencedColumns: ["id_dispositivo"]
          },
          {
            foreignKeyName: "fk_menu_dispositivo_origen"
            columns: ["id_dispositivo_origen"]
            isOneToOne: false
            referencedRelation: "vista_dispositivos_ocupacion"
            referencedColumns: ["id_dispositivo"]
          },
          {
            foreignKeyName: "fk_menu_dispositivo_origen"
            columns: ["id_dispositivo_origen"]
            isOneToOne: false
            referencedRelation: "vista_historial_capacitaciones"
            referencedColumns: ["id_dispositivo"]
          },
          {
            foreignKeyName: "fk_menu_dispositivo_origen"
            columns: ["id_dispositivo_origen"]
            isOneToOne: false
            referencedRelation: "vista_salud_dispositivos"
            referencedColumns: ["id_dispositivo"]
          },
        ]
      }
      menu_semana: {
        Row: {
          acompaña_grupo: boolean | null
          dispositivo_cerrado: boolean | null
          es_capacitacion_servicio: boolean | null
          estado_ejecucion: string | null
          fecha_asignacion: string
          fecha_registro: string | null
          id_agente: number
          id_convocatoria: number
          id_dispositivo: number
          id_dispositivo_origen: number | null
          id_menu_semana: number
          id_turno: number
          numero_grupo: number | null
          orden: number | null
          tipo_organizacion: string | null
        }
        Insert: {
          acompaña_grupo?: boolean | null
          dispositivo_cerrado?: boolean | null
          es_capacitacion_servicio?: boolean | null
          estado_ejecucion?: string | null
          fecha_asignacion: string
          fecha_registro?: string | null
          id_agente: number
          id_convocatoria: number
          id_dispositivo: number
          id_dispositivo_origen?: number | null
          id_menu_semana?: number
          id_turno: number
          numero_grupo?: number | null
          orden?: number | null
          tipo_organizacion?: string | null
        }
        Update: {
          acompaña_grupo?: boolean | null
          dispositivo_cerrado?: boolean | null
          es_capacitacion_servicio?: boolean | null
          estado_ejecucion?: string | null
          fecha_asignacion?: string
          fecha_registro?: string | null
          id_agente?: number
          id_convocatoria?: number
          id_dispositivo?: number
          id_dispositivo_origen?: number | null
          id_menu_semana?: number
          id_turno?: number
          numero_grupo?: number | null
          orden?: number | null
          tipo_organizacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_menus_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "datos_personales"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_menus_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_agentes_capacitados"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_menus_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_historial_capacitaciones"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_menus_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_inasistencias_mes"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_menus_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_planificacion_escuelas"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_menus_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_saldo_horas_live"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_menus_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_saldos_resumen"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_menus_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_seguimiento_residentes"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_menus_conv"
            columns: ["id_convocatoria"]
            isOneToOne: false
            referencedRelation: "convocatoria"
            referencedColumns: ["id_convocatoria"]
          },
          {
            foreignKeyName: "fk_menus_conv"
            columns: ["id_convocatoria"]
            isOneToOne: false
            referencedRelation: "vista_cambios_turno"
            referencedColumns: ["id_nuevo"]
          },
          {
            foreignKeyName: "fk_menus_conv"
            columns: ["id_convocatoria"]
            isOneToOne: false
            referencedRelation: "vista_convocatoria_completa"
            referencedColumns: ["id_convocatoria"]
          },
          {
            foreignKeyName: "fk_menus_conv"
            columns: ["id_convocatoria"]
            isOneToOne: false
            referencedRelation: "vista_convocatoria_mes_activo"
            referencedColumns: ["id_convocatoria"]
          },
          {
            foreignKeyName: "fk_menus_conv"
            columns: ["id_convocatoria"]
            isOneToOne: false
            referencedRelation: "vista_planificacion_escuelas"
            referencedColumns: ["id_convocatoria"]
          },
          {
            foreignKeyName: "fk_menus_dispo"
            columns: ["id_dispositivo"]
            isOneToOne: false
            referencedRelation: "dispositivos"
            referencedColumns: ["id_dispositivo"]
          },
          {
            foreignKeyName: "fk_menus_dispo"
            columns: ["id_dispositivo"]
            isOneToOne: false
            referencedRelation: "vista_agentes_capacitados"
            referencedColumns: ["id_dispositivo"]
          },
          {
            foreignKeyName: "fk_menus_dispo"
            columns: ["id_dispositivo"]
            isOneToOne: false
            referencedRelation: "vista_dispositivos_ocupacion"
            referencedColumns: ["id_dispositivo"]
          },
          {
            foreignKeyName: "fk_menus_dispo"
            columns: ["id_dispositivo"]
            isOneToOne: false
            referencedRelation: "vista_historial_capacitaciones"
            referencedColumns: ["id_dispositivo"]
          },
          {
            foreignKeyName: "fk_menus_dispo"
            columns: ["id_dispositivo"]
            isOneToOne: false
            referencedRelation: "vista_salud_dispositivos"
            referencedColumns: ["id_dispositivo"]
          },
          {
            foreignKeyName: "fk_menus_dispo_origen"
            columns: ["id_dispositivo_origen"]
            isOneToOne: false
            referencedRelation: "dispositivos"
            referencedColumns: ["id_dispositivo"]
          },
          {
            foreignKeyName: "fk_menus_dispo_origen"
            columns: ["id_dispositivo_origen"]
            isOneToOne: false
            referencedRelation: "vista_agentes_capacitados"
            referencedColumns: ["id_dispositivo"]
          },
          {
            foreignKeyName: "fk_menus_dispo_origen"
            columns: ["id_dispositivo_origen"]
            isOneToOne: false
            referencedRelation: "vista_dispositivos_ocupacion"
            referencedColumns: ["id_dispositivo"]
          },
          {
            foreignKeyName: "fk_menus_dispo_origen"
            columns: ["id_dispositivo_origen"]
            isOneToOne: false
            referencedRelation: "vista_historial_capacitaciones"
            referencedColumns: ["id_dispositivo"]
          },
          {
            foreignKeyName: "fk_menus_dispo_origen"
            columns: ["id_dispositivo_origen"]
            isOneToOne: false
            referencedRelation: "vista_salud_dispositivos"
            referencedColumns: ["id_dispositivo"]
          },
          {
            foreignKeyName: "fk_menus_turno"
            columns: ["id_turno"]
            isOneToOne: false
            referencedRelation: "turnos"
            referencedColumns: ["id_turno"]
          },
          {
            foreignKeyName: "fk_menus_turno"
            columns: ["id_turno"]
            isOneToOne: false
            referencedRelation: "vista_convocatoria_completa"
            referencedColumns: ["id_turno"]
          },
          {
            foreignKeyName: "fk_menus_turno"
            columns: ["id_turno"]
            isOneToOne: false
            referencedRelation: "vista_convocatoria_mes_activo"
            referencedColumns: ["id_turno"]
          },
          {
            foreignKeyName: "fk_menus_turno"
            columns: ["id_turno"]
            isOneToOne: false
            referencedRelation: "vista_disponibilidad_visitas"
            referencedColumns: ["id_turno"]
          },
        ]
      }
      planificacion: {
        Row: {
          cant_horas: number | null
          cant_residentes_plan: number
          cant_visit: number | null
          fecha_creacion: string | null
          grupo: string | null
          hora_fin: string | null
          hora_inicio: string | null
          id_dia: number
          id_plani: number
          id_turno: number
          lugar: string | null
          motivo_horario_custom: string | null
          plani_notas: string | null
          usa_horario_custom: boolean | null
        }
        Insert: {
          cant_horas?: number | null
          cant_residentes_plan: number
          cant_visit?: number | null
          fecha_creacion?: string | null
          grupo?: string | null
          hora_fin?: string | null
          hora_inicio?: string | null
          id_dia: number
          id_plani?: number
          id_turno: number
          lugar?: string | null
          motivo_horario_custom?: string | null
          plani_notas?: string | null
          usa_horario_custom?: boolean | null
        }
        Update: {
          cant_horas?: number | null
          cant_residentes_plan?: number
          cant_visit?: number | null
          fecha_creacion?: string | null
          grupo?: string | null
          hora_fin?: string | null
          hora_inicio?: string | null
          id_dia?: number
          id_plani?: number
          id_turno?: number
          lugar?: string | null
          motivo_horario_custom?: string | null
          plani_notas?: string | null
          usa_horario_custom?: boolean | null
        }
        Relationships: []
      }
      saldos: {
        Row: {
          anio: number
          fecha_actualizacion: string | null
          horas_anuales: number | null
          horas_mes: number | null
          id_agente: number
          id_saldo: number
          mes: number
        }
        Insert: {
          anio: number
          fecha_actualizacion?: string | null
          horas_anuales?: number | null
          horas_mes?: number | null
          id_agente: number
          id_saldo?: number
          mes: number
        }
        Update: {
          anio?: number
          fecha_actualizacion?: string | null
          horas_anuales?: number | null
          horas_mes?: number | null
          id_agente?: number
          id_saldo?: number
          mes?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_saldo_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "datos_personales"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_saldo_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_agentes_capacitados"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_saldo_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_historial_capacitaciones"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_saldo_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_inasistencias_mes"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_saldo_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_planificacion_escuelas"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_saldo_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_saldo_horas_live"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_saldo_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_saldos_resumen"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_saldo_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_seguimiento_residentes"
            referencedColumns: ["id_agente"]
          },
        ]
      }
      seguimiento_llamados_visita: {
        Row: {
          agente: string | null
          atendio: boolean | null
          created_at: string | null
          fecha_hora: string | null
          id_asignacion: number | null
          id_llamado: number
          observaciones: string | null
        }
        Insert: {
          agente?: string | null
          atendio?: boolean | null
          created_at?: string | null
          fecha_hora?: string | null
          id_asignacion?: number | null
          id_llamado?: number
          observaciones?: string | null
        }
        Update: {
          agente?: string | null
          atendio?: boolean | null
          created_at?: string | null
          fecha_hora?: string | null
          id_asignacion?: number | null
          id_llamado?: number
          observaciones?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seguimiento_llamados_visita_id_asignacion_fkey"
            columns: ["id_asignacion"]
            isOneToOne: false
            referencedRelation: "asignaciones_visita"
            referencedColumns: ["id_asignacion"]
          },
        ]
      }
      solicitudes: {
        Row: {
          agenda_amplia: string | null
          cantidad_visitantes: number | null
          cargo_institucion: string | null
          coeficiente_calculado: number | null
          comentarios_observaciones: string | null
          created_at: string | null
          departamento: string | null
          dias_turnos_preferencia: string | null
          direccion_email: string | null
          disponibilidad_llamados: string | null
          email_contacto_coordinador: string | null
          email_referente: string | null
          estado_actual: string | null
          id: string
          marca_temporal: string | null
          mes_visita_preferido: string | null
          nombre_coordinador_viaje: string | null
          nombre_empresa_organizacion: string | null
          nombre_institucion: string | null
          nombre_referente: string | null
          provincia: string | null
          quien_coordina: string | null
          rango_etario: string | null
          requerimientos_accesibilidad: string | null
          telefono_contacto_coordinador: string | null
          telefono_institucion: string | null
          telefono_referente: string | null
          tipo_institucion: string | null
        }
        Insert: {
          agenda_amplia?: string | null
          cantidad_visitantes?: number | null
          cargo_institucion?: string | null
          coeficiente_calculado?: number | null
          comentarios_observaciones?: string | null
          created_at?: string | null
          departamento?: string | null
          dias_turnos_preferencia?: string | null
          direccion_email?: string | null
          disponibilidad_llamados?: string | null
          email_contacto_coordinador?: string | null
          email_referente?: string | null
          estado_actual?: string | null
          id?: string
          marca_temporal?: string | null
          mes_visita_preferido?: string | null
          nombre_coordinador_viaje?: string | null
          nombre_empresa_organizacion?: string | null
          nombre_institucion?: string | null
          nombre_referente?: string | null
          provincia?: string | null
          quien_coordina?: string | null
          rango_etario?: string | null
          requerimientos_accesibilidad?: string | null
          telefono_contacto_coordinador?: string | null
          telefono_institucion?: string | null
          telefono_referente?: string | null
          tipo_institucion?: string | null
        }
        Update: {
          agenda_amplia?: string | null
          cantidad_visitantes?: number | null
          cargo_institucion?: string | null
          coeficiente_calculado?: number | null
          comentarios_observaciones?: string | null
          created_at?: string | null
          departamento?: string | null
          dias_turnos_preferencia?: string | null
          direccion_email?: string | null
          disponibilidad_llamados?: string | null
          email_contacto_coordinador?: string | null
          email_referente?: string | null
          estado_actual?: string | null
          id?: string
          marca_temporal?: string | null
          mes_visita_preferido?: string | null
          nombre_coordinador_viaje?: string | null
          nombre_empresa_organizacion?: string | null
          nombre_institucion?: string | null
          nombre_referente?: string | null
          provincia?: string | null
          quien_coordina?: string | null
          rango_etario?: string | null
          requerimientos_accesibilidad?: string | null
          telefono_contacto_coordinador?: string | null
          telefono_institucion?: string | null
          telefono_referente?: string | null
          tipo_institucion?: string | null
        }
        Relationships: []
      }
      stg_calendario_import: {
        Row: {
          config_raw: string
          created_at: string | null
          error: string | null
          fecha: string
          id: number
          id_turno: number
          procesado: boolean | null
          usuario_carga: string | null
        }
        Insert: {
          config_raw: string
          created_at?: string | null
          error?: string | null
          fecha: string
          id?: number
          id_turno: number
          procesado?: boolean | null
          usuario_carga?: string | null
        }
        Update: {
          config_raw?: string
          created_at?: string | null
          error?: string | null
          fecha?: string
          id?: number
          id_turno?: number
          procesado?: boolean | null
          usuario_carga?: string | null
        }
        Relationships: []
      }
      system_errors: {
        Row: {
          additional_context: string | null
          component: string
          error_details: string | null
          error_message: string
          error_type: string
          id_agente: number | null
          id_convocatoria: number | null
          id_error: number
          id_transaccion: number | null
          is_recurring: boolean | null
          related_error_id: number | null
          resolution_date: string | null
          resolution_notes: string | null
          resolved: boolean | null
          resolved_by: string | null
          severity: string | null
          timestamp: string | null
          user_action: string | null
        }
        Insert: {
          additional_context?: string | null
          component: string
          error_details?: string | null
          error_message: string
          error_type: string
          id_agente?: number | null
          id_convocatoria?: number | null
          id_error?: number
          id_transaccion?: number | null
          is_recurring?: boolean | null
          related_error_id?: number | null
          resolution_date?: string | null
          resolution_notes?: string | null
          resolved?: boolean | null
          resolved_by?: string | null
          severity?: string | null
          timestamp?: string | null
          user_action?: string | null
        }
        Update: {
          additional_context?: string | null
          component?: string
          error_details?: string | null
          error_message?: string
          error_type?: string
          id_agente?: number | null
          id_convocatoria?: number | null
          id_error?: number
          id_transaccion?: number | null
          is_recurring?: boolean | null
          related_error_id?: number | null
          resolution_date?: string | null
          resolution_notes?: string | null
          resolved?: boolean | null
          resolved_by?: string | null
          severity?: string | null
          timestamp?: string | null
          user_action?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_error_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "datos_personales"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_error_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_agentes_capacitados"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_error_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_historial_capacitaciones"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_error_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_inasistencias_mes"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_error_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_planificacion_escuelas"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_error_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_saldo_horas_live"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_error_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_saldos_resumen"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_error_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_seguimiento_residentes"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_error_conv"
            columns: ["id_convocatoria"]
            isOneToOne: false
            referencedRelation: "convocatoria"
            referencedColumns: ["id_convocatoria"]
          },
          {
            foreignKeyName: "fk_error_conv"
            columns: ["id_convocatoria"]
            isOneToOne: false
            referencedRelation: "vista_cambios_turno"
            referencedColumns: ["id_nuevo"]
          },
          {
            foreignKeyName: "fk_error_conv"
            columns: ["id_convocatoria"]
            isOneToOne: false
            referencedRelation: "vista_convocatoria_completa"
            referencedColumns: ["id_convocatoria"]
          },
          {
            foreignKeyName: "fk_error_conv"
            columns: ["id_convocatoria"]
            isOneToOne: false
            referencedRelation: "vista_convocatoria_mes_activo"
            referencedColumns: ["id_convocatoria"]
          },
          {
            foreignKeyName: "fk_error_conv"
            columns: ["id_convocatoria"]
            isOneToOne: false
            referencedRelation: "vista_planificacion_escuelas"
            referencedColumns: ["id_convocatoria"]
          },
          {
            foreignKeyName: "fk_error_trans"
            columns: ["id_transaccion"]
            isOneToOne: false
            referencedRelation: "cambio_transaccion"
            referencedColumns: ["id_transaccion"]
          },
          {
            foreignKeyName: "fk_error_trans"
            columns: ["id_transaccion"]
            isOneToOne: false
            referencedRelation: "vista_cambios_pendientes"
            referencedColumns: ["id_transaccion"]
          },
        ]
      }
      tardanzas: {
        Row: {
          accion_aplicada: string | null
          ciclo_numero: number | null
          created_at: string | null
          fecha: string
          id_agente: number
          id_convocatoria: number | null
          id_tardanza: number
          minutos_atraso: number | null
          observaciones: string | null
          posicion_en_ciclo: number | null
        }
        Insert: {
          accion_aplicada?: string | null
          ciclo_numero?: number | null
          created_at?: string | null
          fecha: string
          id_agente: number
          id_convocatoria?: number | null
          id_tardanza?: number
          minutos_atraso?: number | null
          observaciones?: string | null
          posicion_en_ciclo?: number | null
        }
        Update: {
          accion_aplicada?: string | null
          ciclo_numero?: number | null
          created_at?: string | null
          fecha?: string
          id_agente?: number
          id_convocatoria?: number | null
          id_tardanza?: number
          minutos_atraso?: number | null
          observaciones?: string | null
          posicion_en_ciclo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tardanzas_id_agente_fkey"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "datos_personales"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "tardanzas_id_agente_fkey"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_agentes_capacitados"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "tardanzas_id_agente_fkey"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_historial_capacitaciones"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "tardanzas_id_agente_fkey"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_inasistencias_mes"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "tardanzas_id_agente_fkey"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_planificacion_escuelas"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "tardanzas_id_agente_fkey"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_saldo_horas_live"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "tardanzas_id_agente_fkey"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_saldos_resumen"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "tardanzas_id_agente_fkey"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_seguimiento_residentes"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "tardanzas_id_convocatoria_fkey"
            columns: ["id_convocatoria"]
            isOneToOne: false
            referencedRelation: "convocatoria"
            referencedColumns: ["id_convocatoria"]
          },
          {
            foreignKeyName: "tardanzas_id_convocatoria_fkey"
            columns: ["id_convocatoria"]
            isOneToOne: false
            referencedRelation: "vista_cambios_turno"
            referencedColumns: ["id_nuevo"]
          },
          {
            foreignKeyName: "tardanzas_id_convocatoria_fkey"
            columns: ["id_convocatoria"]
            isOneToOne: false
            referencedRelation: "vista_convocatoria_completa"
            referencedColumns: ["id_convocatoria"]
          },
          {
            foreignKeyName: "tardanzas_id_convocatoria_fkey"
            columns: ["id_convocatoria"]
            isOneToOne: false
            referencedRelation: "vista_convocatoria_mes_activo"
            referencedColumns: ["id_convocatoria"]
          },
          {
            foreignKeyName: "tardanzas_id_convocatoria_fkey"
            columns: ["id_convocatoria"]
            isOneToOne: false
            referencedRelation: "vista_planificacion_escuelas"
            referencedColumns: ["id_convocatoria"]
          },
        ]
      }
      turnos: {
        Row: {
          activo: boolean | null
          cant_horas: number | null
          descripcion: string | null
          hora_fin: string | null
          hora_inicio: string | null
          id_turno: number
          solo_semana: boolean | null
          tipo_turno: string
        }
        Insert: {
          activo?: boolean | null
          cant_horas?: number | null
          descripcion?: string | null
          hora_fin?: string | null
          hora_inicio?: string | null
          id_turno?: number
          solo_semana?: boolean | null
          tipo_turno: string
        }
        Update: {
          activo?: boolean | null
          cant_horas?: number | null
          descripcion?: string | null
          hora_fin?: string | null
          hora_inicio?: string | null
          id_turno?: number
          solo_semana?: boolean | null
          tipo_turno?: string
        }
        Relationships: []
      }
      visitas_grupales: {
        Row: {
          cantidad_personas: number
          created_at: string | null
          email_confirmacion_enviado: boolean | null
          email_referente: string | null
          estado: string | null
          id_coeficiente: number | null
          id_plani_asignado: number | null
          id_visita: number
          nombre_institucion: string
          nombre_referente: string | null
          observaciones_grupo: string | null
          requiere_accesibilidad: boolean | null
          telefono_referente: string | null
        }
        Insert: {
          cantidad_personas: number
          created_at?: string | null
          email_confirmacion_enviado?: boolean | null
          email_referente?: string | null
          estado?: string | null
          id_coeficiente?: number | null
          id_plani_asignado?: number | null
          id_visita?: number
          nombre_institucion: string
          nombre_referente?: string | null
          observaciones_grupo?: string | null
          requiere_accesibilidad?: boolean | null
          telefono_referente?: string | null
        }
        Update: {
          cantidad_personas?: number
          created_at?: string | null
          email_confirmacion_enviado?: boolean | null
          email_referente?: string | null
          estado?: string | null
          id_coeficiente?: number | null
          id_plani_asignado?: number | null
          id_visita?: number
          nombre_institucion?: string
          nombre_referente?: string | null
          observaciones_grupo?: string | null
          requiere_accesibilidad?: boolean | null
          telefono_referente?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visitas_grupales_id_coeficiente_fkey"
            columns: ["id_coeficiente"]
            isOneToOne: false
            referencedRelation: "config_visitas_coeficientes"
            referencedColumns: ["id_coeficiente"]
          },
          {
            foreignKeyName: "visitas_grupales_id_plani_asignado_fkey"
            columns: ["id_plani_asignado"]
            isOneToOne: false
            referencedRelation: "planificacion"
            referencedColumns: ["id_plani"]
          },
          {
            foreignKeyName: "visitas_grupales_id_plani_asignado_fkey"
            columns: ["id_plani_asignado"]
            isOneToOne: false
            referencedRelation: "vista_disponibilidad_visitas"
            referencedColumns: ["id_plani"]
          },
          {
            foreignKeyName: "visitas_grupales_id_plani_asignado_fkey"
            columns: ["id_plani_asignado"]
            isOneToOne: false
            referencedRelation: "vista_estado_cobertura"
            referencedColumns: ["id_plani"]
          },
          {
            foreignKeyName: "visitas_grupales_id_plani_asignado_fkey"
            columns: ["id_plani_asignado"]
            isOneToOne: false
            referencedRelation: "vista_ocupacion"
            referencedColumns: ["id_plani"]
          },
          {
            foreignKeyName: "visitas_grupales_id_plani_asignado_fkey"
            columns: ["id_plani_asignado"]
            isOneToOne: false
            referencedRelation: "vista_planificacion_anio"
            referencedColumns: ["id_plani"]
          },
        ]
      }
    }
    Views: {
      vista_agentes_capacitados: {
        Row: {
          asistio: boolean | null
          capacitacion: string | null
          estado_capacitacion: string | null
          fecha_capacitacion: string | null
          id_agente: number | null
          id_dispositivo: number | null
          nombre_completo: string | null
          nombre_dispositivo: string | null
        }
        Relationships: []
      }
      vista_cambios_pendientes: {
        Row: {
          agente_iniciador: string | null
          cantidad_cambios: number | null
          estado: string | null
          fecha_solicitud: string | null
          id_transaccion: number | null
          observaciones: string | null
          tipo_transaccion: string | null
        }
        Relationships: []
      }
      vista_cambios_turno: {
        Row: {
          agente: string | null
          dni: string | null
          estado_nuevo: string | null
          estado_original: string | null
          fecha_nueva: string | null
          fecha_original: string | null
          fecha_registro: string | null
          id_nuevo: number | null
          id_original: number | null
          motivo_cambio: string | null
          turno_tipo_nuevo: string | null
          turno_tipo_original: string | null
          usuario_modificacion: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_conv_origen"
            columns: ["id_original"]
            isOneToOne: false
            referencedRelation: "convocatoria"
            referencedColumns: ["id_convocatoria"]
          },
          {
            foreignKeyName: "fk_conv_origen"
            columns: ["id_original"]
            isOneToOne: false
            referencedRelation: "vista_cambios_turno"
            referencedColumns: ["id_nuevo"]
          },
          {
            foreignKeyName: "fk_conv_origen"
            columns: ["id_original"]
            isOneToOne: false
            referencedRelation: "vista_convocatoria_completa"
            referencedColumns: ["id_convocatoria"]
          },
          {
            foreignKeyName: "fk_conv_origen"
            columns: ["id_original"]
            isOneToOne: false
            referencedRelation: "vista_convocatoria_mes_activo"
            referencedColumns: ["id_convocatoria"]
          },
          {
            foreignKeyName: "fk_conv_origen"
            columns: ["id_original"]
            isOneToOne: false
            referencedRelation: "vista_planificacion_escuelas"
            referencedColumns: ["id_convocatoria"]
          },
        ]
      }
      vista_certificados_completa: {
        Row: {
          agente: string | null
          dni: string | null
          estado_certificado: string | null
          fecha_entrega_certificado: string | null
          fecha_inasistencia_justifica: string | null
          id_agente: number | null
          id_certificado: number | null
          id_inasistencia: number | null
          observaciones: string | null
          tipo_certificado: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_cert_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "datos_personales"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_cert_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_agentes_capacitados"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_cert_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_historial_capacitaciones"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_cert_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_inasistencias_mes"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_cert_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_planificacion_escuelas"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_cert_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_saldo_horas_live"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_cert_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_saldos_resumen"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_cert_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_seguimiento_residentes"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_cert_inasis"
            columns: ["id_inasistencia"]
            isOneToOne: false
            referencedRelation: "inasistencias"
            referencedColumns: ["id_inasistencia"]
          },
          {
            foreignKeyName: "fk_cert_inasis"
            columns: ["id_inasistencia"]
            isOneToOne: false
            referencedRelation: "vista_inasistencias_completa"
            referencedColumns: ["id_inasistencia"]
          },
          {
            foreignKeyName: "fk_cert_inasis"
            columns: ["id_inasistencia"]
            isOneToOne: false
            referencedRelation: "vista_inasistencias_mes"
            referencedColumns: ["id_inasistencia"]
          },
        ]
      }
      vista_convocatoria_completa: {
        Row: {
          agente: string | null
          anio: number | null
          cant_horas: number | null
          dni: string | null
          estado: string | null
          fecha_turno: string | null
          id_agente: number | null
          id_convocatoria: number | null
          id_plani: number | null
          id_turno: number | null
          mes: number | null
          motivo_cambio: string | null
          tipo_turno: string | null
          turno_cancelado: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_conv_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "datos_personales"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_conv_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_agentes_capacitados"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_conv_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_historial_capacitaciones"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_conv_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_inasistencias_mes"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_conv_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_planificacion_escuelas"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_conv_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_saldo_horas_live"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_conv_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_saldos_resumen"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_conv_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_seguimiento_residentes"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_conv_plani"
            columns: ["id_plani"]
            isOneToOne: false
            referencedRelation: "planificacion"
            referencedColumns: ["id_plani"]
          },
          {
            foreignKeyName: "fk_conv_plani"
            columns: ["id_plani"]
            isOneToOne: false
            referencedRelation: "vista_disponibilidad_visitas"
            referencedColumns: ["id_plani"]
          },
          {
            foreignKeyName: "fk_conv_plani"
            columns: ["id_plani"]
            isOneToOne: false
            referencedRelation: "vista_estado_cobertura"
            referencedColumns: ["id_plani"]
          },
          {
            foreignKeyName: "fk_conv_plani"
            columns: ["id_plani"]
            isOneToOne: false
            referencedRelation: "vista_ocupacion"
            referencedColumns: ["id_plani"]
          },
          {
            foreignKeyName: "fk_conv_plani"
            columns: ["id_plani"]
            isOneToOne: false
            referencedRelation: "vista_planificacion_anio"
            referencedColumns: ["id_plani"]
          },
        ]
      }
      vista_convocatoria_mes_activo: {
        Row: {
          agente: string | null
          anio: number | null
          cant_horas: number | null
          dni: string | null
          estado: string | null
          fecha_turno: string | null
          id_agente: number | null
          id_convocatoria: number | null
          id_plani: number | null
          id_turno: number | null
          mes: number | null
          motivo_cambio: string | null
          tipo_turno: string | null
          turno_cancelado: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_conv_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "datos_personales"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_conv_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_agentes_capacitados"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_conv_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_historial_capacitaciones"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_conv_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_inasistencias_mes"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_conv_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_planificacion_escuelas"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_conv_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_saldo_horas_live"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_conv_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_saldos_resumen"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_conv_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_seguimiento_residentes"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_conv_plani"
            columns: ["id_plani"]
            isOneToOne: false
            referencedRelation: "planificacion"
            referencedColumns: ["id_plani"]
          },
          {
            foreignKeyName: "fk_conv_plani"
            columns: ["id_plani"]
            isOneToOne: false
            referencedRelation: "vista_disponibilidad_visitas"
            referencedColumns: ["id_plani"]
          },
          {
            foreignKeyName: "fk_conv_plani"
            columns: ["id_plani"]
            isOneToOne: false
            referencedRelation: "vista_estado_cobertura"
            referencedColumns: ["id_plani"]
          },
          {
            foreignKeyName: "fk_conv_plani"
            columns: ["id_plani"]
            isOneToOne: false
            referencedRelation: "vista_ocupacion"
            referencedColumns: ["id_plani"]
          },
          {
            foreignKeyName: "fk_conv_plani"
            columns: ["id_plani"]
            isOneToOne: false
            referencedRelation: "vista_planificacion_anio"
            referencedColumns: ["id_plani"]
          },
        ]
      }
      vista_dashboard_inasistencias: {
        Row: {
          anio: number | null
          estado: string | null
          mes: number | null
          motivo: string | null
          total: number | null
        }
        Relationships: []
      }
      vista_demanda_planificada: {
        Row: {
          cantidad_personas: number | null
          fecha: string | null
          id_turno: number | null
          nombre_turno: string | null
          notas: string | null
        }
        Relationships: []
      }
      vista_disponibilidad_visitas: {
        Row: {
          anio: number | null
          cupo_disponible: number | null
          cupo_en_espera: number | null
          cupo_ocupado_firme: number | null
          cupo_total: number | null
          fecha: string | null
          hora_fin: string | null
          hora_inicio: string | null
          id_plani: number | null
          id_turno: number | null
          mes: number | null
          numero_dia_semana: number | null
          residentes_convocados: number | null
          semaforo: string | null
          tipo_turno: string | null
        }
        Relationships: []
      }
      vista_dispositivos_ocupacion: {
        Row: {
          agentes_distintos: number | null
          frecuencia_uso: string | null
          id_dispositivo: number | null
          nombre_dispositivo: string | null
          piso_dispositivo: number | null
          ultima_asignacion: string | null
          veces_asignado: number | null
        }
        Relationships: []
      }
      vista_errores_por_componente: {
        Row: {
          altos: number | null
          component: string | null
          criticos: number | null
          error_type: string | null
          resueltos: number | null
          tasa_resolucion: number | null
          total_errores: number | null
          ultimo_error: string | null
        }
        Relationships: []
      }
      vista_errores_recientes: {
        Row: {
          afectado: string | null
          alerta: string | null
          component: string | null
          error_message: string | null
          error_type: string | null
          id_error: number | null
          resolved: boolean | null
          severity: string | null
          timestamp: string | null
          user_action: string | null
        }
        Relationships: []
      }
      vista_errores_timeline: {
        Row: {
          cantidad: number | null
          error_type: string | null
          fecha: string | null
          severity: string | null
        }
        Relationships: []
      }
      vista_estado_calendario: {
        Row: {
          dispositivos_configurados: number | null
          estado: string | null
          fecha: string | null
          id_turno: number | null
          nombre_turno: string | null
          personas_asignadas: number | null
        }
        Relationships: []
      }
      vista_estado_cobertura: {
        Row: {
          anio: number | null
          cubiertos: number | null
          estado: string | null
          faltantes: number | null
          fecha: string | null
          id_plani: number | null
          solicitados: number | null
          tipo_turno: string | null
        }
        Relationships: []
      }
      vista_historial_capacitaciones: {
        Row: {
          dispositivo_capacitado: string | null
          estado_asistencia: string | null
          fecha_capacitacion: string | null
          id_agente: number | null
          id_dispositivo: number | null
          residente_capacitado: string | null
        }
        Relationships: []
      }
      vista_inasistencias_completa: {
        Row: {
          agente: string | null
          anio: number | null
          dni: string | null
          estado: string | null
          fecha_aviso: string | null
          fecha_inasistencia: string | null
          id_agente: number | null
          id_inasistencia: number | null
          mes: number | null
          motivo: string | null
          observaciones: string | null
          requiere_certificado: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_inasis_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "datos_personales"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_inasis_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_agentes_capacitados"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_inasis_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_historial_capacitaciones"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_inasis_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_inasistencias_mes"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_inasis_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_planificacion_escuelas"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_inasis_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_saldo_horas_live"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_inasis_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_saldos_resumen"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_inasis_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_seguimiento_residentes"
            referencedColumns: ["id_agente"]
          },
        ]
      }
      vista_inasistencias_mes: {
        Row: {
          certificados_presentados: number | null
          estado: string | null
          fecha_inasistencia: string | null
          id_agente: number | null
          id_inasistencia: number | null
          motivo: string | null
          nombre_completo: string | null
          observaciones: string | null
          requiere_certificado: boolean | null
        }
        Relationships: []
      }
      vista_ocupacion: {
        Row: {
          anio: number | null
          fecha: string | null
          id_agente: number | null
          id_plani: number | null
          id_turno: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_conv_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "datos_personales"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_conv_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_agentes_capacitados"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_conv_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_historial_capacitaciones"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_conv_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_inasistencias_mes"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_conv_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_planificacion_escuelas"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_conv_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_saldo_horas_live"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_conv_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_saldos_resumen"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_conv_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_seguimiento_residentes"
            referencedColumns: ["id_agente"]
          },
        ]
      }
      vista_patrones_errores: {
        Row: {
          component: string | null
          dias_activo: number | null
          error_type: string | null
          estado: string | null
          id_pattern: number | null
          nivel_urgencia: string | null
          primera_vez: string | null
          resolution_description: string | null
          severidad_maxima: string | null
          ultima_vez: string | null
          veces_ocurrido: number | null
        }
        Insert: {
          component?: string | null
          dias_activo?: never
          error_type?: string | null
          estado?: string | null
          id_pattern?: number | null
          nivel_urgencia?: never
          primera_vez?: string | null
          resolution_description?: string | null
          severidad_maxima?: string | null
          ultima_vez?: string | null
          veces_ocurrido?: number | null
        }
        Update: {
          component?: string | null
          dias_activo?: never
          error_type?: string | null
          estado?: string | null
          id_pattern?: number | null
          nivel_urgencia?: never
          primera_vez?: string | null
          resolution_description?: string | null
          severidad_maxima?: string | null
          ultima_vez?: string | null
          veces_ocurrido?: number | null
        }
        Relationships: []
      }
      vista_planificacion_anio: {
        Row: {
          anio: number | null
          cant_horas: number | null
          cant_residentes_plan: number | null
          cant_visit: number | null
          descripcion_feriado: string | null
          es_feriado: boolean | null
          fecha: string | null
          hora_fin: string | null
          hora_inicio: string | null
          id_dia: number | null
          id_plani: number | null
          id_turno: number | null
          mes: number | null
          tipo_turno: string | null
        }
        Relationships: []
      }
      vista_planificacion_escuelas: {
        Row: {
          apellido: string | null
          descripcion_turno: string | null
          dia_semana: number | null
          estado_coherencia: string | null
          fecha_convocatoria: string | null
          grupo_escuela: string | null
          id_agente: number | null
          id_convocatoria: number | null
          nombre: string | null
          tipo_turno: string | null
        }
        Relationships: []
      }
      vista_saldo_horas_live: {
        Row: {
          cohorte: number | null
          horas_reales: number | null
          id_agente: number | null
          meta_teorica: number | null
          nombre_completo: string | null
          saldo_neto: number | null
        }
        Relationships: []
      }
      vista_saldo_horas_resumen: {
        Row: {
          agente: string | null
          anio: number | null
          cohorte: number | null
          horas_mes: number | null
          id_agente: number | null
          mes: number | null
          turnos_cumplidos: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_conv_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "datos_personales"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_conv_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_agentes_capacitados"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_conv_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_historial_capacitaciones"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_conv_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_inasistencias_mes"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_conv_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_planificacion_escuelas"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_conv_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_saldo_horas_live"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_conv_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_saldos_resumen"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_conv_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_seguimiento_residentes"
            referencedColumns: ["id_agente"]
          },
        ]
      }
      vista_saldos_actuales: {
        Row: {
          anio: number | null
          email: string | null
          fecha_actualizacion: string | null
          horas_anuales: number | null
          horas_mes: number | null
          id_agente: number | null
          mes: number | null
          nivel_horas: string | null
          nombre_completo: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_saldo_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "datos_personales"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_saldo_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_agentes_capacitados"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_saldo_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_historial_capacitaciones"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_saldo_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_inasistencias_mes"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_saldo_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_planificacion_escuelas"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_saldo_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_saldo_horas_live"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_saldo_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_saldos_resumen"
            referencedColumns: ["id_agente"]
          },
          {
            foreignKeyName: "fk_saldo_agente"
            columns: ["id_agente"]
            isOneToOne: false
            referencedRelation: "vista_seguimiento_residentes"
            referencedColumns: ["id_agente"]
          },
        ]
      }
      vista_saldos_resumen: {
        Row: {
          agente: string | null
          anio: number | null
          horas_cumplidas: number | null
          horas_cumplidas_acumuladas: number | null
          horas_objetivo_acumuladas: number | null
          horas_objetivo_mes: number | null
          id_agente: number | null
          inasistencias_mes: number | null
          mes: number | null
          saldo_acumulado: number | null
          saldo_mensual: number | null
          turnos_cancelados: number | null
        }
        Relationships: []
      }
      vista_salud_dispositivos: {
        Row: {
          coeficiente_robustez: number | null
          cupo_minimo: number | null
          id_dispositivo: number | null
          nombre: string | null
          piso: string | null
          total_capacitados: number | null
        }
        Relationships: []
      }
      vista_salud_sistema: {
        Row: {
          componente_problematico: string | null
          criticos_pendientes: number | null
          errores_24h: number | null
          errores_semana: number | null
          estado_sistema: string | null
          fecha_reporte: string | null
          patrones_activos: number | null
          tasa_resolucion_porcentaje: number | null
        }
        Relationships: []
      }
      vista_seguimiento_residentes: {
        Row: {
          agente: string | null
          anio: number | null
          dni: string | null
          horas_totales: number | null
          id_agente: number | null
          inasistencias_estudio: number | null
          inasistencias_imprevisto: number | null
          inasistencias_salud: number | null
          mes: number | null
          tardanzas: number | null
          tipos_turno_json: Json | null
          total_inasistencias: number | null
          turnos_totales: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      rpc_guardar_matriz_dispositivos: {
        Args: { payload: Json }
        Returns: Json
      }
      rpc_guardar_participantes_grupo: {
        Args: { payload: Json }
        Returns: Json
      }
      rpc_importar_calendario: { Args: { payload: Json }; Returns: Json }
      rpc_obtener_convocados_matriz: {
        Args: { anio_filtro: number }
        Returns: {
          id_agente: number
          id_cap: number
        }[]
      }
      rpc_obtener_matriz_certificaciones: {
        Args: { anio_filtro?: number }
        Returns: {
          fecha_mas_reciente: string
          id_agente: number
          id_dispositivo: number
          nombre_completo: string
          nombre_dispositivo: string
          total_capacitaciones: number
        }[]
      }
      rpc_obtener_matriz_habilidades_hoy: {
        Args: { anio_filtro?: number }
        Returns: {
          fecha_mas_reciente: string
          id_agente: number
          id_dispositivo: number
          nombre_completo: string
          nombre_dispositivo: string
        }[]
      }
      rpc_obtener_vista_capacitados: {
        Args: never
        Returns: {
          asistio: boolean | null
          capacitacion: string | null
          estado_capacitacion: string | null
          fecha_capacitacion: string | null
          id_agente: number | null
          id_dispositivo: number | null
          nombre_completo: string | null
          nombre_dispositivo: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "vista_agentes_capacitados"
          isOneToOne: false
          isSetofReturn: true
        }
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
