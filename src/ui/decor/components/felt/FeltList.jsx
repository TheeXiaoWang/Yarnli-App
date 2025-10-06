import React from 'react'
import FeltPiece from './FeltPiece'
import { useDecorStore } from '../../../../app/stores/decorStore'

const FeltList = ({ feltPieces, selectedFeltId, onSelectFelt, onDeleteFelt, sourceObject, orbitalDistance }) => {
  const { hiddenItems } = useDecorStore()
  return (
    <>
      {feltPieces.filter(felt => !hiddenItems?.has?.(`felt:${felt.id}`)).map(felt => (
        <FeltPiece
          key={`felt-${felt.id}`}
          id={felt.id}
          shape={felt.shape}
          color={felt.color}
          position={felt.position}
          normal={felt.normal}
          scale={felt.scale}
          rotation={felt.rotation || 0}
          sourceObject={sourceObject}
          orbitalDistance={orbitalDistance}
          selected={selectedFeltId === felt.id}
          onSelect={onSelectFelt}
          onDelete={onDeleteFelt}
        />
      ))}
    </>
  )
}

export default FeltList
