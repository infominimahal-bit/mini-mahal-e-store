# Admin Mobile Responsive UI Pattern (Table vs Cards)

**Goal:** Ensure that all `/admin` pages (like Abandoned Carts, Orders, Products, Customers) are fully responsive and do not suffer from horizontal overflow or cut-offs on mobile devices.

**Rule:** 
Instead of forcing a single `<table>` to be horizontally scrollable on mobile (which degrades user experience), we implement a dual-layout strategy:
1. **Desktop View (`hidden md:block`)**: Renders a standard HTML table.
2. **Mobile View (`md:hidden`)**: Renders stacked, touch-friendly rounded cards.

Both layouts iterate over the exact same data (`paginatedItems`) but render it differently according to the viewport size.

## Implementation Template

```tsx
<div className="bg-white dark:bg-[#16162a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden transition-colors">
  
  {/* ---------------------------------------------------- */}
  {/* 1. Desktop Table View (Hidden on Mobile)               */}
  {/* ---------------------------------------------------- */}
  <div className="hidden md:block">
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-gray-700 dark:text-gray-300">
        <thead className="text-xs font-bold text-gray-400 uppercase bg-gray-50/50 dark:bg-white/5 border-b border-gray-100 dark:border-gray-800">
          <tr>
            <th className="py-4 px-6">ID / Name</th>
            <th className="py-4 px-6">Status</th>
            <th className="py-4 px-6 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800/80">
          {items.map(item => (
            <tr 
              key={item.id} 
              className="hover:bg-gray-50/50 dark:hover:bg-white/3 transition-all align-top cursor-pointer"
            >
              <td className="py-4 px-6 font-bold text-[#1a1a2e] dark:text-white">
                {item.name}
              </td>
              <td className="py-4 px-6">
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  {item.status}
                </span>
              </td>
              <td className="py-4 px-6 text-right">
                <button className="text-red-500 hover:underline">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    
    {/* Optional Desktop Pagination Footer */}
    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-800/80">
      {/* Pagination Controls */}
    </div>
  </div>

  {/* ---------------------------------------------------- */}
  {/* 2. Mobile Card View (Hidden on Desktop)                */}
  {/* ---------------------------------------------------- */}
  <div className="md:hidden space-y-3 p-4">
    {items.map(item => (
      <div
        key={item.id}
        className="bg-white dark:bg-[#16162a] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-2.5 transition-colors active:scale-[0.99]"
      >
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-[#1a1a2e] dark:text-white truncate">{item.name}</p>
          </div>
          <div className="text-right flex-shrink-0 ml-2">
             <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              {item.status}
            </span>
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800/60 mt-2">
          <div className="text-[10px] text-gray-500 font-medium">Extra Info</div>
          <button className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 transition-all">
            Delete
          </button>
        </div>
      </div>
    ))}
    
    {/* Optional Mobile Pagination Footer */}
    <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800/60 mt-4">
      {/* Pagination Controls */}
    </div>
  </div>

</div>
```

## Key Styling Principles applied:
- **Mobile Cards Wrapper**: Uses `space-y-3 p-4` for vertical rhythm between cards.
- **Mobile Card Internal**: Uses `p-4 rounded-2xl border` with `space-y-2.5` to separate header from details.
- **Dividers**: Always use `border-t border-gray-100 dark:border-gray-800/60` between distinct info groups inside mobile cards.
- **Interactions**: Mobile cards use `active:scale-[0.99]` to provide immediate touch feedback.
- **Font Sizing**: Use `text-[10px]` or `text-xs` for labels on mobile cards, preserving `text-sm font-black` for primary values.
