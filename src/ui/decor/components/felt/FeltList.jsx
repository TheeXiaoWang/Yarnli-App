import React from 'react'
import FeltPiece from './FeltPiece'

const FeltList = ({ feltPieces, selectedFeltId, onSelectFelt, onDeleteFelt, sourceObject, orbitalDistance }) => {
  return (
    <>
      {feltPieces.map(felt => (
        <FeltPiece
          key={`felt-${felt.id}`}
          id={felt.id}
          shape={felt.shape}
          color={felt.color}
          position={felt.position}
          normal={felt.normal}
          scale={felt.scale}
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
