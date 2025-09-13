// Minimal shared type hints for readability and future TS migration
export interface LayerLine {
  y?: number
  polylines: number[][][]
  objectId?: number | string
  objectType?: string
  _lid?: number
  _keyAlongAxis?: number
}

export interface GeneratorResult {
  layers: LayerLine[]
  markers?: { poles?: number[][]; ring0?: number[][] }
}


