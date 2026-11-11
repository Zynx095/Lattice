import { useMemo, useState } from 'react'
import { BarChart3 } from 'lucide-react'
import { appConfig, cap, modules } from '@/config'
import { amountLabel, statusMeta } from '@/data/models'
import { countBetween, countPerDay, groupCount, groupSum, lastDays, percentChange } from '@/lib/metrics'
import { DAY_MS, formatNumber } from '@/lib/utils'
import { recordsStore } from '@/store'
import { BarChart, BarList, ChartPanel, LineChart } from '@/components/charts/Charts'
import { Kpi } from '@/components/dashboard/Dashboard'
import { PageHeader } from '@/components/shell/PageHeader'
import { EmptyState, Panel, Tabs } from '@/components/ui'

type Range = '7' | '14' | '30'
const ranges: { value: Range; label: string }[] = [
  { value: '7', label: '7 days' },
  { value: '14', label: '14 days' },
  { value: '30', label: '30 days' },
]

export default function Analytics() {
  const records = recordsStore.use()
  const [range, setRange] = useState<Range>('14')
  const days = Number(range)
  const noun = appConfig.entity

  const data = useMemo(() => {
    const since = Date.now() - days * DAY_MS
    const inRange = records.filter((r) => new Date(r.createdAt).getTime() > since)
    const doneInRange = records.filter((r) => r.completedAt && new Date(r.completedAt).getTime() > since)

    const added = inRange.length
    const addedBefore = countBetween(records, days * 2, days, (r) => r.createdAt)
    const completed = doneInRange.length
    const completedBefore = countBetween(records, days * 2, days, (r) => r.completedAt)
    const cycle = doneInRange.length
      ? doneInRange.reduce((sum, r) => sum + (new Date(r.completedAt!).getTime() - new Date(r.createdAt).getTime()) / DAY_MS, 0) / doneInRange.length
      : null

    return {
      labels: lastDays(days).map((d) => d.label),
      addedSeries: countPerDay(records, days, (r) => r.createdAt),
      completedSeries: countPerDay(records, days, (r) => r.completedAt),
      added,
      addedBefore,
      completed,
      completedBefore,
      cycle,
      openEffort: records.filter((r) => r.status !== 'done').reduce((s, r) => s + r.amount, 0),
      effortByCategory: groupSum(inRange, (r) => r.category, (r) => r.amount),
      openByOwner: groupCount(records.filter((r) => r.status !== 'done'), (r) => r.owner),
      summary: groupCount(records, (r) => r.category).map(({ label }) => {
        const rows = records.filter((r) => r.category === label)
        return {
          label,
          total: rows.length,
          open: rows.filter((r) => r.status !== 'done').length,
          blocked: rows.filter((r) => r.status === 'blocked').length,
          effort: rows.reduce((s, r) => s + r.amount, 0),
        }
      }),
    }
  }, [records, days])

  if (records.length === 0) {
    return (
      <>
        <PageHeader title={modules.analytics.title} description={modules.analytics.description} />
        <Panel>
          <EmptyState icon={BarChart3} title="Nothing to analyse yet" description={`Charts appear once there is at least one ${noun.singular}.`} />
        </Panel>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title={modules.analytics.title}
        description={modules.analytics.description}
        actions={<Tabs label="Period" value={range} onChange={setRange} options={ranges} />}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Added" value={String(data.added)} change={{ percent: percentChange(data.added, data.addedBefore), goodWhen: 'up' }} hint={`vs previous ${days} days`} />
        <Kpi label="Completed" value={String(data.completed)} change={{ percent: percentChange(data.completed, data.completedBefore), goodWhen: 'up' }} hint={`vs previous ${days} days`} />
        <Kpi label="Average days to complete" value={data.cycle === null ? 'No data' : formatNumber(data.cycle)} hint={data.cycle === null ? 'Nothing completed in this period' : `across ${data.completed} completed`} />
        <Kpi label={`Open ${amountLabel.toLowerCase()}`} value={formatNumber(data.openEffort)} hint={`${statusMeta.open.label}, in progress and blocked`} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <ChartPanel
          className="lg:col-span-2"
          title="Throughput"
          description={`${cap(noun.plural)} added and completed per day`}
          table={{ columns: ['Day', 'Added', 'Completed'], rows: data.labels.map((l, i) => [l, data.addedSeries[i], data.completedSeries[i]]) }}
        >
          <LineChart
            labels={data.labels}
            series={[
              { label: 'Added', values: data.addedSeries },
              { label: 'Completed', values: data.completedSeries },
            ]}
            height={260}
          />
        </ChartPanel>

        <Panel title="Open work by owner" description={`${cap(noun.plural)} not yet done`}>
          {data.openByOwner.length ? <BarList data={data.openByOwner} /> : <p className="text-muted-foreground">Everything is done.</p>}
        </Panel>

        <ChartPanel
          title={`${amountLabel} by category`}
          description={`${cap(noun.plural)} added in the last ${days} days`}
          table={{ columns: ['Category', amountLabel], rows: data.effortByCategory.map((d) => [d.label, d.value]) }}
        >
          {data.effortByCategory.length ? (
            <BarChart data={data.effortByCategory} measure={amountLabel} />
          ) : (
            <p className="py-10 text-center text-muted-foreground">Nothing was added in this period.</p>
          )}
        </ChartPanel>

        <Panel className="lg:col-span-2" title="Summary by category" description="All time" flush>
          <div className="overflow-x-auto">
            <table className="w-full text-base">
              <thead>
                <tr className="border-b border-border text-sm text-subtle">
                  <th className="h-9 pl-5 text-left font-medium">Category</th>
                  <th className="px-3 text-right font-medium">Total</th>
                  <th className="px-3 text-right font-medium">Open</th>
                  <th className="px-3 text-right font-medium">Blocked</th>
                  <th className="pr-5 text-right font-medium">{amountLabel}</th>
                </tr>
              </thead>
              <tbody>
                {data.summary.map((row) => (
                  <tr key={row.label} className="border-b border-border/70 last:border-0">
                    <td className="h-11 pl-5 font-medium">{row.label}</td>
                    <td className="num px-3 text-right">{row.total}</td>
                    <td className="num px-3 text-right">{row.open}</td>
                    <td className={`num px-3 text-right ${row.blocked ? 'text-danger' : 'text-subtle'}`}>{row.blocked}</td>
                    <td className="num pr-5 text-right">{formatNumber(row.effort)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </>
  )
}
