/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@prisma/client', 'prisma', 'node-ical', 'googleapis', 'rrule'],
}

module.exports = nextConfig
