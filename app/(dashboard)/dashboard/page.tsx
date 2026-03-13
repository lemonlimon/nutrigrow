export default function DashboardPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h2>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { label: 'Total Patients', value: '0', color: 'teal' },
          { label: 'Assessments This Month', value: '0', color: 'blue' },
          { label: 'Reports Generated', value: '0', color: 'purple' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="text-4xl font-bold text-gray-800 mt-2">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="font-semibold text-gray-700 mb-4">Quick Actions</h3>
        <div className="flex gap-4">
          <a
            href="/patients"
            className="bg-teal-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 transition"
          >
            + Add Patient
          </a>
          <a
            href="/assessments/new"
            className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            + New Assessment
          </a>
        </div>
      </div>
    </div>
  )
}
