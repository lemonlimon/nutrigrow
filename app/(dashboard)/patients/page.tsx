import Link from 'next/link'

export default function PatientsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Patients</h2>
        <button className="bg-teal-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 transition">
          + Add Patient
        </button>
      </div>

      {/* Empty state */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-16 text-center">
        <p className="text-4xl mb-4">👶</p>
        <p className="text-gray-500 text-lg">No patients yet</p>
        <p className="text-gray-400 text-sm mt-1">Add your first patient to get started</p>
      </div>
    </div>
  )
}
