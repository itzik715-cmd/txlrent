export default function DataTable({ columns, data, onRowClick, emptyMessage = 'אין נתונים להצגה' }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-surface rounded-lg border border-border shadow-sm p-8 text-center">
        <p className="text-text-tertiary text-sm">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="bg-surface rounded-lg border border-border shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-bg">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-tertiary text-right"
                  style={col.width ? { width: col.width } : {}}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr
                key={row._id || row.id || idx}
                onClick={() => onRowClick?.(row)}
                className={`border-b border-border hover:bg-bg transition-all duration-150 ${
                  onRowClick ? 'cursor-pointer' : ''
                }`}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-sm text-text-primary">
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
