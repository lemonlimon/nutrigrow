import Link from 'next/link'

export default function AssessmentsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Assessments</h2>
        <Link
          href="/assessments/new"
          className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
        >
          + New Assessment
        </Link>
      </div>

      {/* Empty state */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-16 text-center">
        <p className="text-4xl mb-4">📋</p>
        <p className="text-gray-500 text-lg">No assessments yet</p>
        <p className="text-gray-400 text-sm mt-1">Start a new assessment to evaluate a patient</p>
      </div>
    </div>
  )
}
