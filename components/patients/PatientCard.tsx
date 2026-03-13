import Link from 'next/link'
import type { Patient } from '@/types'

interface PatientCardProps {
  patient: Patient
}

export default function PatientCard({ patient }: PatientCardProps) {
  const age = calculateAge(patient.date_of_birth)

  return (
    <Link href={`/patients/${patient.id}`}>
      <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition cursor-pointer">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center text-xl">
            👶
          </div>
          <div>
            <p className="font-semibold text-gray-800">
              {patient.first_name} {patient.last_name}
            </p>
            <p className="text-sm text-gray-500">
              {age} • {patient.gender} • {patient.country}
            </p>
          </div>
        </div>
      </div>
    </Link>
  )
}

function calculateAge(dob: string): string {
  const birth = new Date(dob)
  const now = new Date()
  const months =
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth())
  if (months < 24) return `${months}m`
  return `${Math.floor(months / 12)}y`
}
