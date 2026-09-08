import React from 'react'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  subtitle?: string
  extra?: React.ReactNode
  hoverable?: boolean
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  extra,
  hoverable = false,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all duration-200 ${
        hoverable ? 'hover:border-zinc-300 hover:shadow-md' : ''
      } ${className}`}
      {...props}
    >
      {(title || subtitle || extra) && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <div>
            {title && (
              <h3 className="text-sm font-bold text-zinc-900">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-zinc-500 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {extra && <div className="flex-shrink-0">{extra}</div>}
        </div>
      )}
      <div className="px-6 py-5">
        {children}
      </div>
    </div>
  )
}
