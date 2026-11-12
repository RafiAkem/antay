import { Card, CardHead } from '@/components/ui/card'
import { Empty } from '@/components/ui/pill'
import type { AnalyticsSummary } from '@/types/api'
import { SlotChart, SlotChartLegend } from './slot-chart'

// SVG-nya digambar selebar 680. Di ponsel kalau dipaksa muat, label jamnya
// tinggal 5px, jadi grafiknya diberi lebar minimum dan boleh digeser di dalam
// kartu. Halamannya sendiri tetap tidak bergeser mendatar.
export function SlotChartCard({ summary }: { summary: AnalyticsSummary }) {
  return (
    <Card>
      <CardHead title="Kuota per slot" meta={<SlotChartLegend />} />
      {summary.slots.length === 0 ? (
        <Empty title="Belum ada slot" hint="Event ini belum punya jadwal slot." />
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <div className="min-w-[520px]">
            <SlotChart summary={summary} />
          </div>
        </div>
      )}
    </Card>
  )
}
