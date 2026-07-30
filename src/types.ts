/** Domain types for PzMap. Values are stored in SI base units (N, Nm); the UI
 *  applies a unit factor (`uf`) at display time. */

export const COMPS = ['Px', 'Py', 'Pz', 'Mx', 'My', 'Mz'] as const;
export type Comp = (typeof COMPS)[number];

/** Tag keys used inside the RFEM JSON reaction blocks. */
export const TAGKEY: Record<Comp, string> = {
  Px: 'p_x',
  Py: 'p_y',
  Pz: 'p_z',
  Mx: 'm_x',
  My: 'm_y',
  Mz: 'm_z',
};

/** Per-component envelope stored on every node: max/min value (SI) and the
 *  governing load-combination label. */
export type CompEnvelope = {
  [K in Comp as `${K}_max`]: number;
} & {
  [K in Comp as `${K}_maxc`]: string;
} & {
  [K in Comp as `${K}_min`]: number;
} & {
  [K in Comp as `${K}_minc`]: string;
};

export interface NodeRecord extends CompEnvelope {
  no: number;
  x: number;
  y: number;
  z: number;
}

export interface Meta {
  model: string;
  pool?: number;
  savedAt?: string;
  ids?: string;
}

export interface BuildResult {
  nodes?: NodeRecord[];
  pool?: number;
  warn?: string[];
  error?: string;
}

/** A parsed RFEM table (JSON export shape) reduced to what we consume. */
export interface RfemTable {
  model?: string;
  data: RfemRow[];
}

export type RfemRow = Record<string, unknown> & {
  no?: number | string | null;
  tag?: unknown;
  node?: number | string | null;
  specification?: string;
};
