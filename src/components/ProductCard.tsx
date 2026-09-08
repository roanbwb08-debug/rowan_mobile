import type { Product } from '../types'

interface ProductCardProps {
  product: Product
}

export default function ProductCard({ product }: ProductCardProps) {
  // Gracefully handle undefined product data or incomplete attributes
  if (!product || !product.name) return null

  // Format currency dynamically if available
  const formattedPrice =
    product.price !== undefined && product.price !== null
      ? new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: product.currency || 'USD',
        }).format(product.price)
      : null

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-all shadow-md flex flex-col justify-between" id={`product-${product.id}`}>
      {product.imageUrl && (
        <div className="relative w-full aspect-video bg-zinc-950 overflow-hidden border-b border-zinc-800">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
          {product.available !== undefined && (
            <span className={`absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
              product.available 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15' 
                : 'bg-rose-500/10 text-rose-400 border-rose-500/15'
            }`}>
              {product.available ? 'In Stock' : 'Out of Stock'}
            </span>
          )}
        </div>
      )}

      <div className="p-4 space-y-3 flex flex-col flex-grow">
        <div className="space-y-1">
          {product.category && (
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-blue-400 block leading-none">{product.category}</span>
          )}
          <h3 className="text-xs font-bold text-white leading-snug my-0 line-clamp-1">{product.name}</h3>
        </div>
        
        {formattedPrice && (
          <p className="text-sm font-extrabold text-blue-400 my-0 leading-none">{formattedPrice}</p>
        )}

        {product.description && (
          <p className="text-[11px] text-zinc-400 leading-normal line-clamp-2 my-0">{product.description}</p>
        )}

        {product.productUrl && (
          <div className="pt-2 mt-auto">
            <a
              href={product.productUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center py-2 bg-zinc-850 hover:bg-zinc-800 text-white rounded-lg text-xs font-bold border border-zinc-800 hover:border-zinc-750 transition-all cursor-pointer"
            >
              View Product
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
