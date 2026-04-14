import { PrismaClient } from '@prisma/client'

// Use DATABASE_URL from environment or fall back to default path
const DATABASE_URL = process.env.DATABASE_URL || 'file:///Users/jack/Library/Application Support/wdc-app/wdc.db'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL,
    },
  },
})

// CSV data hardcoded from the existing records
const CSV_DATA = [
  {
    name: 'Vinny',
    gets_along_with_cats: 'Yes',
    good_with_children: 'Yes (he has to make a bond)',
    energy_level: 'Medium',
    special_behaviours: 'None',
    feeding_schedule: 'Morning and evening',
    food_type: 'Cooked dog food provided by owner',
    portion_size: 'Half a carton each meal',
    treats_allowed: 'Yes',
    exercise_needs: '2 walks a day',
    off_lead: 'Yes',
    favourite_activities: 'Being with Jack',
    sleeping_arrangements: 'Sleeps downstairs in dog area. No issues.',
  },
  {
    name: 'Amber',
    gets_along_with_cats: 'No (fearful not aggressive)',
    good_with_children: 'Yes',
    energy_level: 'Low',
    special_behaviours: '',
    feeding_schedule: 'Twice a day',
    food_type: '',
    portion_size: '',
    treats_allowed: 'Yes',
    exercise_needs: 'One walk a day',
    off_lead: '',
    favourite_activities: 'Sleeping',
    sleeping_arrangements: 'Sleep living room with human',
  },
  {
    name: 'Toby',
    gets_along_with_cats: "Doesn't react but is watchful",
    good_with_children: 'Yes',
    energy_level: 'Medium',
    special_behaviours: 'Unknown',
    feeding_schedule: 'Twice a day',
    food_type: 'Hypoallergenic grain free diet',
    portion_size: 'Half dry and half wet food',
    treats_allowed: 'Yes but only natural',
    exercise_needs: '2 walks and playtime',
    off_lead: 'Yes (in training)',
    favourite_activities: 'Balls',
    sleeping_arrangements: 'Unknown',
  },
  {
    name: 'Ernie',
    gets_along_with_cats: 'Yes',
    good_with_children: 'Yes',
    energy_level: 'High',
    special_behaviours: 'Loves to play with Ivy',
    feeding_schedule: '3 times a day',
    food_type: 'Butchers puppy food',
    portion_size: '1 tin over 3 meals a day',
    treats_allowed: 'Yes',
    exercise_needs: '1 short walk a day',
    off_lead: '',
    favourite_activities: 'Ivy',
    sleeping_arrangements: 'Crate in dog area',
  },
  {
    name: 'Piggy',
    gets_along_with_cats: 'Yes',
    good_with_children: 'Yes',
    energy_level: 'Low',
    special_behaviours: '',
    feeding_schedule: 'Unknown',
    food_type: 'Unknown',
    portion_size: 'Unknown',
    treats_allowed: 'No',
    exercise_needs: '2 walks a day',
    off_lead: '',
    favourite_activities: 'Unknown',
    sleeping_arrangements: 'Dog area',
  },
  {
    name: 'Skye',
    gets_along_with_cats: 'Unknown',
    good_with_children: 'Unknown',
    energy_level: 'Unknown',
    special_behaviours: 'Unknown',
    feeding_schedule: 'Twice a day',
    food_type: 'Unknown',
    portion_size: 'Unknown',
    treats_allowed: 'Yes',
    exercise_needs: 'Unknown',
    off_lead: '',
    favourite_activities: '',
    sleeping_arrangements: 'Sleeps in crate',
  },
  {
    name: 'Royski',
    gets_along_with_cats: 'No (barks at any sound or sight)',
    good_with_children: 'Yes',
    energy_level: 'Low',
    special_behaviours: 'Cat',
    feeding_schedule: 'Twice a day',
    food_type: 'Dry food and Pooch and Mutt wet food',
    portion_size: 'Handful of dry food and half carton of wet food',
    treats_allowed: 'Yes',
    exercise_needs: '2 walks a day',
    off_lead: 'No',
    favourite_activities: 'Chews',
    sleeping_arrangements: 'Living room with human',
  },
  {
    name: 'Rolf',
    gets_along_with_cats: 'Yes (fears cat)',
    good_with_children: 'Yes',
    energy_level: 'Medium',
    special_behaviours: 'Marking in house',
    feeding_schedule: 'Twice a day',
    food_type: 'Tinned wet food with dry biscuits',
    portion_size: '1 can a day (dinner) and 3 cups of biscuit (breakfast)',
    treats_allowed: 'Yes',
    exercise_needs: '2 walks a day',
    off_lead: 'Yes',
    favourite_activities: 'Playing with dogs and balls',
    sleeping_arrangements: 'Dog area but with human in living room',
  },
  {
    name: 'Gino',
    gets_along_with_cats: 'Yes (will bark at cat)',
    good_with_children: 'Yes',
    energy_level: 'High',
    special_behaviours: 'Unknown',
    feeding_schedule: '',
    food_type: '',
    portion_size: '',
    treats_allowed: 'Yes',
    exercise_needs: '2 walks a day',
    off_lead: 'No',
    favourite_activities: 'Hair styling',
    sleeping_arrangements: 'Unknown',
  },
  {
    name: 'Dave',
    gets_along_with_cats: 'Yes',
    good_with_children: 'Unknown',
    energy_level: 'Low',
    special_behaviours: '',
    feeding_schedule: 'Twice a day',
    food_type: 'Wet food and some dry food',
    portion_size: 'Unknown',
    treats_allowed: 'Yes',
    exercise_needs: 'One walk a day',
    off_lead: 'No',
    favourite_activities: 'Sitting in the crate alone',
    sleeping_arrangements: 'Unknown',
  },
  {
    name: 'Button',
    gets_along_with_cats: 'Yes',
    good_with_children: 'Unknown',
    energy_level: 'Low',
    special_behaviours: '',
    feeding_schedule: '3 times a day',
    food_type: 'Kibble',
    portion_size: 'Unknown',
    treats_allowed: 'Yes',
    exercise_needs: '1 short walk',
    off_lead: '',
    favourite_activities: '',
    sleeping_arrangements: 'Unknown',
  },
  {
    name: 'Wilson',
    gets_along_with_cats: 'Unknown',
    good_with_children: 'Unknown',
    energy_level: 'High',
    special_behaviours: 'Doorbell',
    feeding_schedule: 'Fed at home (chicken allergy)',
    food_type: 'Unknown',
    portion_size: 'Unknown',
    treats_allowed: 'Yes but no chicken',
    exercise_needs: '2 walks',
    off_lead: 'No',
    favourite_activities: 'Fetch and rope toys tug of war',
    sleeping_arrangements: 'Crate if with other dogs',
  },
  {
    name: 'Uther',
    gets_along_with_cats: '',
    good_with_children: '',
    energy_level: '',
    special_behaviours: '',
    feeding_schedule: 'Do not feed with other dogs; 8am and 5pm',
    food_type: 'Royal Canin',
    portion_size: '1 full scoop per meal + water. Daquin tablet + breath powder (1 scoop) + 12 pumps salmon oil in breakfast. Dinner is kibble and water.',
    treats_allowed: '',
    exercise_needs: 'Max 1 hour walk a day or 2 x 30min walks',
    off_lead: 'No',
    favourite_activities: '',
    sleeping_arrangements: '',
  },
  {
    name: 'Snoop',
    gets_along_with_cats: '',
    good_with_children: '',
    energy_level: '',
    special_behaviours: '',
    feeding_schedule: '',
    food_type: 'Sensitive food will be provided',
    portion_size: '',
    treats_allowed: 'Hemp calming and digestive treats',
    exercise_needs: '',
    off_lead: 'No',
    favourite_activities: '',
    sleeping_arrangements: 'Crate',
  },
  {
    name: 'Clive',
    gets_along_with_cats: 'No',
    good_with_children: 'Yes',
    energy_level: 'Medium',
    special_behaviours: 'Cat',
    feeding_schedule: '',
    food_type: '',
    portion_size: '',
    treats_allowed: '',
    exercise_needs: '',
    off_lead: 'Yes (off-lead)',
    favourite_activities: '',
    sleeping_arrangements: 'Unknown',
  },
  {
    name: 'Beau',
    gets_along_with_cats: 'Yes',
    good_with_children: 'Yes',
    energy_level: 'Medium',
    special_behaviours: 'None',
    feeding_schedule: 'Morning and afternoon',
    food_type: 'Butchers',
    portion_size: '2.4 tins a meal',
    treats_allowed: 'Yes but only treats provided due to allergies',
    exercise_needs: '2 walks a day',
    off_lead: 'No',
    favourite_activities: '',
    sleeping_arrangements: 'Unknown',
  },
]

async function main() {
  console.log('Starting CSV import...')
  let created = 0
  let skipped = 0

  for (const dog of CSV_DATA) {
    const existing = await prisma.dog.findFirst({
      where: { name: dog.name },
    })

    if (existing) {
      console.log(`⏭  Skipping ${dog.name} (already exists)`)
      skipped++
      continue
    }

    await prisma.dog.create({
      data: {
        name: dog.name,
        gets_along_with_cats: dog.gets_along_with_cats || null,
        good_with_children: dog.good_with_children || null,
        energy_level: dog.energy_level || null,
        special_behaviours: dog.special_behaviours || null,
        feeding_schedule: dog.feeding_schedule || null,
        food_type: dog.food_type || null,
        portion_size: dog.portion_size || null,
        treats_allowed: dog.treats_allowed || null,
        exercise_needs: dog.exercise_needs || null,
        off_lead: dog.off_lead || null,
        favourite_activities: dog.favourite_activities || null,
        sleeping_arrangements: dog.sleeping_arrangements || null,
      },
    })
    console.log(`✅ Created ${dog.name}`)
    created++
  }

  console.log(`\nDone! Created: ${created}, Skipped: ${skipped}`)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
