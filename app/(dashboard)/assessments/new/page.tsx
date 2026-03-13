import AssessmentForm from '@/components/assessments/AssessmentForm'

export default function NewAssessmentPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">New Assessment</h2>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 max-w-2xl">
        <AssessmentForm />
      </div>
    </div>
  )
}
