// Utility to detect the primary axis of an object's bounding box
export function detectPrimaryAxis(bbox) {
  if (!bbox) return 'y'
  
  const { min, max } = bbox
  const width = max.x - min.x
  const height = max.y - min.y
  const depth = max.z - min.z
  
  // Return the axis with the largest dimension
  if (height >= width && height >= depth) return 'y'
  if (width >= depth) return 'x'
  return 'z'
}
