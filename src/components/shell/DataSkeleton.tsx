import React from 'react'

interface DataSkeletonProps {
  width?: string | number
  height?: string | number
  className?: string
  count?: number
}

export const DataSkeleton: React.FC<DataSkeletonProps> = ({
  width = '100%',
  height = '14px',
  className = '',
  count = 1,
}) => {
  return (
    <div className={`data-skeleton-wrap ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="data-skeleton"
          style={{
            width: typeof width === 'number' ? `${width}px` : width,
            height: typeof height === 'number' ? `${height}px` : height,
          }}
        />
      ))}
    </div>
  )
}

export default DataSkeleton
