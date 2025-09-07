import React from 'react'
import { useSceneStore } from '../../stores/sceneStore'
import { useTransformMode } from '../../contexts/TransformContext'

const StatusBar = () => {
  const { objects, selectedObject } = useSceneStore()
  const { transformMode, isTransforming } = useTransformMode()

  return (
    <div className="status-bar">
      <div className="status-item">
        <span>Objects: {objects.length}</span>
        {selectedObject && (
          <span>• Selected: {selectedObject.type} #{selectedObject.id}</span>
        )}
      </div>
      
      <div className="status-item">
        <span>Mode: {transformMode}</span>
        {isTransforming && <span>• Transforming</span>}
      </div>
      
      <div className="status-item">
        <span>Ready</span>
      </div>
    </div>
  )
}

export default StatusBar
