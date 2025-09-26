import React from 'react'
import EyeFromQuaternion from './EyeFromQuaternion'
import { useDecorStore } from '../../../../app/stores/decorStore'

const EyesList = ({ eyes, hoverPreview, settings, yarnRadiusFromLevel, eyeScale, center }) => {
  const { hiddenItems, selectedEyeId, selectEye, removeEye, clearAllSelections } = useDecorStore()
  return (
    <>
      {eyes.filter(e => !hiddenItems?.has?.(`eye:${e.id}`)).map(e => (
        <EyeFromQuaternion
          key={`eye-${e.id}`}
          id={e.id}
          position={e.position}
          quaternion={e.quaternion}
          radius={e.radius}
          center={center}
          selected={selectedEyeId === e.id}
          onSelect={selectEye}
          onDelete={removeEye}
          onClearOthers={clearAllSelections}
        />
      ))}

      {hoverPreview && (() => {
        const level = Number(settings?.yarnSizeLevel) || 4
        const previewRadius = yarnRadiusFromLevel(level) * eyeScale
        return (
          <EyeFromQuaternion
            key="hover-eye"
            position={hoverPreview.position}
            quaternion={hoverPreview.quaternion}
            radius={previewRadius}
            center={center}
            preview
          />
        )
      })()}
    </>
  )
}

export default EyesList
