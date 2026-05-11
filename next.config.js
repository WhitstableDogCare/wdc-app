/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@prisma/client', 'prisma', 'node-ical', 'googleapis', 'rrule', 'node-cron', 'node-notifier'],
  devIndicators: false,
}

module.exports = nextConfig
