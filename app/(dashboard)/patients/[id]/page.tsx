export default function PatientDetailPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Patient Details</h2>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <p className="text-gray-500">Loading patient {params.id}...</p>
      </div>
    </div>
  )
}
