import { Clock3, HeartPulse, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { UtilitySection } from '../components/PageLayout'

export function MaintenancePage() {
  return (
    <UtilitySection
      action={{ href: '/dashboard', label: 'Try Home' }}
      className="maintenance-section"
      description="A careful update is happening right now. Couple Book is staying private while the app is refreshed."
      eyebrow="App update"
      title="Couple Book is getting a little work done."
    >
      <div className="rounded-[24px] border border-[#ead7df] bg-[#fffdfd] p-6 shadow-[0_20px_70px_rgba(98,58,78,0.12)]">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[20px] border border-[#f0dce5] bg-[#fff7fa] p-5">
            <HeartPulse className="size-6 text-[#9f4968]" />
            <h3 className="mt-4 font-serif text-2xl text-[#412732]">Update in progress</h3>
            <p className="mt-2 text-sm leading-6 text-[#6f5462]">Some pages may move or refresh while the latest fixes are being reviewed.</p>
          </div>
          <div className="rounded-[20px] border border-[#f0dce5] bg-[#fffaf4] p-5">
            <ShieldCheck className="size-6 text-[#8f5168]" />
            <h3 className="mt-4 font-serif text-2xl text-[#412732]">Private by default</h3>
            <p className="mt-2 text-sm leading-6 text-[#6f5462]">Authentication, media access, and relationship data stay protected during the update.</p>
          </div>
          <div className="rounded-[20px] border border-[#f0dce5] bg-[#fdf5f8] p-5">
            <Clock3 className="size-6 text-[#9f4968]" />
            <h3 className="mt-4 font-serif text-2xl text-[#412732]">Check back soon</h3>
            <p className="mt-2 text-sm leading-6 text-[#6f5462]">If a page feels unavailable, wait a moment and return to Home or Album.</p>
          </div>
        </div>
        <nav aria-label="Available routes during update" className="mt-6 flex flex-wrap justify-center gap-3">
          <Link className="inline-flex min-h-10 items-center rounded-xl border border-[#dcc2cd] px-4 text-xs font-bold text-[#6f5462] hover:bg-[#fff5f8]" to="/dashboard">Home</Link>
          <Link className="inline-flex min-h-10 items-center rounded-xl border border-[#dcc2cd] px-4 text-xs font-bold text-[#6f5462] hover:bg-[#fff5f8]" to="/gallery">Album</Link>
          <Link className="inline-flex min-h-10 items-center rounded-xl border border-[#dcc2cd] px-4 text-xs font-bold text-[#6f5462] hover:bg-[#fff5f8]" to="/settings">Settings</Link>
        </nav>
      </div>
    </UtilitySection>
  )
}
