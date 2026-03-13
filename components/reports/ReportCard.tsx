import type { Report } from '@/types'

interface ReportCardProps {
  report: Report
}

export default function ReportCard({ report }: ReportCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-600">
          {new Date(report.created_at).toLocaleDateString()}
        </span>
        <span className="text-xs bg-teal-100 text-teal-700 px-3 py-1 rounded-full font-medium">
          {report.language === 'ar' ? 'Arabic' : 'English'}
        </span>
      </div>
      <p className="text-sm text-gray-700 line-clamp-3">{report.content}</p>
      <button className="mt-3 text-sm text-teal-600 font-medium hover:underline">
        View Full Report →
      </button>
    </div>
  )
}
