export const CASE_VISIBILITIES = ['private', 'public'] as const;

export type CaseVisibility = (typeof CASE_VISIBILITIES)[number];

export interface EditorStateMarker {
  id: string;
  label: string;
  position: { x: number; y: number; z: number };
}

export interface EditorStateMeasurement {
  id: string;
  distanceMm: number;
  pointA: { x: number; y: number; z: number };
  pointB: { x: number; y: number; z: number };
}

export type SpatialSourceUnit = 'mm' | 'cm' | 'm';

export interface EditorStateSpatialCalibration {
  sourceUnit: SpatialSourceUnit;
  unitScaleToMm: number;
  status: 'inferred' | 'confirmed';
}

export type OrientationDirection =
  | 'right'
  | 'left'
  | 'anterior'
  | 'posterior'
  | 'superior'
  | 'inferior';

export interface EditorStateSpatialOrientation {
  positiveX: OrientationDirection;
  positiveY: OrientationDirection;
  positiveZ: OrientationDirection;
  status: 'unconfirmed' | 'confirmed';
}

export interface EditorState {
  markers: EditorStateMarker[];
  measurements: EditorStateMeasurement[];
  camera: { position: { x: number; y: number; z: number }; target: { x: number; y: number; z: number } } | null;
  segmentColors?: string | null;
  spatialCalibration?: EditorStateSpatialCalibration | null;
  spatialOrientation?: EditorStateSpatialOrientation | null;
}

export interface ClinicalCase {
  id: string;
  title: string;
  description: string | null;
  model_url: string | null;
  optimized_model_url: string | null;
  created_by: string;
  created_at: string;
  visibility: CaseVisibility;
  share_token?: string | null;
  editor_state?: EditorState | null;
}

export interface CreateCaseInput {
  title: string;
  description?: string | null;
  model_url?: string | null;
  optimized_model_url?: string | null;
  visibility?: CaseVisibility;
}

export interface UpdateCaseDetailsInput {
  title: string;
  description?: string | null;
  visibility?: CaseVisibility;
}

export interface ListCasesForUserOptions {
  visibility?: CaseVisibility;
  limit?: number;
}

export interface ClinicalCaseInsert {
  id?: string;
  title: string;
  description?: string | null;
  model_url?: string | null;
  optimized_model_url?: string | null;
  created_by: string;
  created_at?: string;
  visibility?: CaseVisibility;
}

export interface ClinicalCaseUpdate {
  id?: string;
  title?: string;
  description?: string | null;
  model_url?: string | null;
  optimized_model_url?: string | null;
  created_by?: string;
  created_at?: string;
  visibility?: CaseVisibility;
}

export interface Database {
  public: {
    Tables: {
      cases: {
        Row: ClinicalCase;
        Insert: ClinicalCaseInsert;
        Update: ClinicalCaseUpdate;
        Relationships: [];
      };
    };
    Views: {};
    Functions: {};
    Enums: {
      case_visibility: CaseVisibility;
    };
    CompositeTypes: {};
  };
}
