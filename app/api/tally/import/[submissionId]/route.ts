import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Exact questionId → field mapping derived from live Tally API response
const Q = {
  dogName: 'kGe6Md',
  dogAge: 'vDeyoX',       // legacy — kept for old submissions
  dogBirthdate: '0MVdB0',
  dogSex: 'Kx5ldz',
  dogNeutered: 'LK7WRz',
  dogMicrochip: 'poyB8y',
  dogBreed: '14d7q4',
  ownerName: 'gqdMKM',
  ownerPhone: 'y429V6',
  ownerEmergencyPhone: 'XoJWZe',
  ownerAddress: '8LaQ7k',
  ownerEmail: '08B6NP',
  vetName: 'zMyDPZ',
  vetPhone: '59j1Wv',
  vetEmergencyPhone: 'd0axBD',
  vetAddress: 'YG0WNz',
  vetEmail: 'DpkdgX',
  buddy1Name: 'lOedJV',
  buddy1Phone: 'RoM5Ev',
  buddy1EmergencyPhone: 'oReMX5',
  buddy1Address: 'Gp9d8Q',
  buddy1Email: 'OX45Ok',
  buddy2Name: 'VPQ52N',
  buddy2Phone: 'P915VP',
  buddy2EmergencyPhone: 'EldQyA',
  buddy2Address: 'rOaAzp',
  buddy2Email: '47Jxed',
  consentCommunication: '2AaNQg',
  consentSocialMedia: 'xDMaOE',
  vaccinationDate: 'eaDvBk',
  fleaWormDate: 'W8r1Av',
  medicalRequirements: 'NXlWGN',
  consentDailyActivities: 'QRe5Pl',
  concernsDailyActivities: '9Z9DbK',
  equipmentProvided: 'erQekJ',
  equipmentWdc: 'WRE5xL',
  foodAndTreats: 'a45Y7W',
  dietaryRequirements: '6Kj2ao',
  anythingElse: 'BXQg7N',
}

type TallyResponse = { questionId: string; answer: unknown }

function getAnswer(responses: TallyResponse[], questionId: string): string {
  const r = responses.find((r) => r.questionId === questionId)
  if (!r || r.answer === null || r.answer === undefined) return ''
  if (Array.isArray(r.answer)) {
    // Filter out consent-only values for display
    const vals = r.answer.filter((v) => typeof v === 'string' || typeof v === 'number')
    return vals.join(', ')
  }
  if (typeof r.answer === 'object') return ''
  return String(r.answer)
}

function getAnswerArray(responses: TallyResponse[], questionId: string): string {
  const r = responses.find((r) => r.questionId === questionId)
  if (!r || !Array.isArray(r.answer)) return '[]'
  return JSON.stringify(r.answer)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  try {
    const { submissionId } = await params
    const body = await request.json()
    const { dogId, action } = body

    const submission = await prisma.tallySubmission.findUnique({
      where: { id: parseInt(submissionId) },
    })

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    if (action === 'skip') {
      return NextResponse.json({ success: true, action: 'skipped' })
    }

    const raw = JSON.parse(submission.raw_data)
    const responses: TallyResponse[] = raw.responses || []

    // Extract all fields
    const dogName = getAnswer(responses, Q.dogName)
    // Try new birthdate field first, fall back to legacy age field
    const birthdateRaw = getAnswer(responses, Q.dogBirthdate)
    const birth_date = birthdateRaw ? birthdateRaw.split('T')[0] : undefined // store as YYYY-MM-DD
    const ageStr = getAnswer(responses, Q.dogAge)
    const age = ageStr ? parseFloat(ageStr) : undefined
    const sex = getAnswer(responses, Q.dogSex)
    const neuteredStr = getAnswer(responses, Q.dogNeutered)
    const neutered = neuteredStr === 'Yes' ? true : neuteredStr === 'No' ? false : undefined
    const microchip = getAnswer(responses, Q.dogMicrochip)
    const breed = getAnswer(responses, Q.dogBreed)

    const ownerName = getAnswer(responses, Q.ownerName)
    const ownerPhone = getAnswer(responses, Q.ownerPhone)
    const ownerEmergencyPhone = getAnswer(responses, Q.ownerEmergencyPhone)
    const ownerAddress = getAnswer(responses, Q.ownerAddress)
    const ownerEmail = getAnswer(responses, Q.ownerEmail)

    const vetName = getAnswer(responses, Q.vetName)
    const vetPhone = getAnswer(responses, Q.vetPhone)
    const vetEmergencyPhone = getAnswer(responses, Q.vetEmergencyPhone)
    const vetAddress = getAnswer(responses, Q.vetAddress)
    const vetEmail = getAnswer(responses, Q.vetEmail)

    const buddy1Name = getAnswer(responses, Q.buddy1Name)
    const buddy1Phone = getAnswer(responses, Q.buddy1Phone)
    const buddy1EmergencyPhone = getAnswer(responses, Q.buddy1EmergencyPhone)
    const buddy1Address = getAnswer(responses, Q.buddy1Address)
    const buddy1Email = getAnswer(responses, Q.buddy1Email)

    const buddy2Name = getAnswer(responses, Q.buddy2Name)
    const buddy2Phone = getAnswer(responses, Q.buddy2Phone)
    const buddy2EmergencyPhone = getAnswer(responses, Q.buddy2EmergencyPhone)
    const buddy2Address = getAnswer(responses, Q.buddy2Address)
    const buddy2Email = getAnswer(responses, Q.buddy2Email)

    const vaccinationDate = getAnswer(responses, Q.vaccinationDate)
    const fleaWormDate = getAnswer(responses, Q.fleaWormDate)
    const medicalRequirements = getAnswer(responses, Q.medicalRequirements)
    const consentDailyActivities = getAnswerArray(responses, Q.consentDailyActivities)
    const concernsDailyActivities = getAnswer(responses, Q.concernsDailyActivities)
    const equipmentProvided = getAnswerArray(responses, Q.equipmentProvided)
    const equipmentWdc = getAnswerArray(responses, Q.equipmentWdc)
    const foodAndTreats = getAnswer(responses, Q.foodAndTreats)
    const dietaryRequirements = getAnswer(responses, Q.dietaryRequirements)
    const anythingElse = getAnswer(responses, Q.anythingElse)
    const consentCommunication = getAnswer(responses, Q.consentCommunication)
    const consentSocialMedia = getAnswer(responses, Q.consentSocialMedia)

    // Match or create dog
    let targetDogId = dogId
    if (!targetDogId && dogName) {
      const allDogs = await prisma.dog.findMany({ select: { id: true, name: true } })
      const match = allDogs.find((d) => d.name.trim().toLowerCase() === dogName.trim().toLowerCase())
      if (match) targetDogId = match.id
    }

    const dogData = {
      name: dogName || 'Unknown',
      ...(breed && { breed }),
      ...(birth_date && { birth_date }),
      ...(age !== undefined && !isNaN(age) && { age }),
      ...(sex && { sex }),
      ...(neutered !== undefined && { neutered }),
      ...(microchip && microchip !== '0' && { microchip_number: microchip }),
      ...(vaccinationDate && { vaccination_date: vaccinationDate }),
      ...(fleaWormDate && { flea_worm_date: fleaWormDate }),
      ...(medicalRequirements && { medical_requirements: medicalRequirements }),
      ...(consentDailyActivities !== '[]' && { consent_daily_activities: consentDailyActivities }),
      ...(concernsDailyActivities && { concerns_daily_activities: concernsDailyActivities }),
      ...(equipmentProvided !== '[]' && { equipment_provided: equipmentProvided }),
      ...(equipmentWdc !== '[]' && { equipment_wdc: equipmentWdc }),
      ...(foodAndTreats && foodAndTreats !== 'None' && { food_and_treats: foodAndTreats }),
      ...(dietaryRequirements && dietaryRequirements !== 'None' && { dietary_requirements: dietaryRequirements }),
      ...(anythingElse && anythingElse !== 'No' && { notes: anythingElse }),
      ...(consentCommunication && { consent_communication: consentCommunication }),
      ...(consentSocialMedia && { consent_social_media: consentSocialMedia }),
    }

    let dog
    if (targetDogId) {
      dog = await prisma.dog.update({ where: { id: targetDogId }, data: dogData })
    } else {
      dog = await prisma.dog.create({ data: dogData })
      targetDogId = dog.id
    }

    // Upsert owner
    if (ownerName || ownerPhone || ownerEmail) {
      const existingOwner = await prisma.owner.findFirst({ where: { dog_id: targetDogId } })
      const ownerData = {
        name: ownerName,
        phone: ownerPhone,
        emergency_phone: ownerEmergencyPhone,
        address: ownerAddress,
        email: ownerEmail,
      }
      if (existingOwner) {
        await prisma.owner.update({ where: { id: existingOwner.id }, data: ownerData })
      } else {
        await prisma.owner.create({ data: { dog_id: targetDogId, ...ownerData } })
      }
    }

    // Upsert vet
    if (vetName || vetPhone || vetEmail) {
      const existingVet = await prisma.vet.findFirst({ where: { dog_id: targetDogId } })
      const vetData = {
        name: vetName,
        phone: vetPhone,
        emergency_phone: vetEmergencyPhone,
        address: vetAddress,
        email: vetEmail,
      }
      if (existingVet) {
        await prisma.vet.update({ where: { id: existingVet.id }, data: vetData })
      } else {
        await prisma.vet.create({ data: { dog_id: targetDogId, ...vetData } })
      }
    }

    // Upsert buddy 1
    if (buddy1Name || buddy1Phone) {
      const existingBuddy = await prisma.buddy.findFirst({ where: { dog_id: targetDogId, is_primary: true } })
      const buddyData = {
        name: buddy1Name,
        phone: buddy1Phone,
        emergency_phone: buddy1EmergencyPhone,
        address: buddy1Address,
        email: buddy1Email,
        is_primary: true,
      }
      if (existingBuddy) {
        await prisma.buddy.update({ where: { id: existingBuddy.id }, data: buddyData })
      } else {
        await prisma.buddy.create({ data: { dog_id: targetDogId, ...buddyData } })
      }
    }

    // Upsert buddy 2
    if (buddy2Name || buddy2Phone) {
      const existingBuddy2 = await prisma.buddy.findFirst({ where: { dog_id: targetDogId, is_primary: false } })
      const buddy2Data = {
        name: buddy2Name,
        phone: buddy2Phone,
        emergency_phone: buddy2EmergencyPhone,
        address: buddy2Address,
        email: buddy2Email,
        is_primary: false,
      }
      if (existingBuddy2) {
        await prisma.buddy.update({ where: { id: existingBuddy2.id }, data: buddy2Data })
      } else {
        await prisma.buddy.create({ data: { dog_id: targetDogId, ...buddy2Data } })
      }
    }

    // Link submission to dog
    await prisma.tallySubmission.update({
      where: { id: parseInt(submissionId) },
      data: { dog_id: targetDogId },
    })

    return NextResponse.json({ success: true, dogId: targetDogId, dogName: dog.name })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
