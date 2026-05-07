export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { syncPublicCalendarDays } = await import('./lib/public-calendar')

    async function runDailySync() {
      const today = new Date()
      const startDate = today.toISOString().split('T')[0]
      const endDate = new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      await syncPublicCalendarDays(startDate, endDate)
      console.log(`[public-calendar] Daily sync complete (${startDate} → ${endDate})`)
    }

    // Run once on startup, then every 24 hours
    runDailySync().catch(e => console.error('[public-calendar] Daily sync error:', e))
    setInterval(
      () => runDailySync().catch(e => console.error('[public-calendar] Daily sync error:', e)),
      24 * 60 * 60 * 1000
    )
  }
}
