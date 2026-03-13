export default function ReportsPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Reports</h2>

      {/* Empty state */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-16 text-center">
        <p className="text-4xl mb-4">📄</p>
        <p className="text-gray-500 text-lg">No reports yet</p>
        <p className="text-gray-400 text-sm mt-1">
          Reports are generated automatically after completing an assessment
        </p>
      </div>
    </div>
  )
}
