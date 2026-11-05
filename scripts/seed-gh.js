const mongoose = require('mongoose');

async function seedGH() {
  await mongoose.connect('mongodb://127.0.0.1:27017/hostel_allocation');
  const tenantId = 'univ-delhi-hostel';
  const academicSession = 'hostel-allotment-2026';

  // Seed Block GH-01
  await mongoose.connection.collection('hostel_blocks').updateOne(
    { tenantId, blockCode: 'GH-01' },
    {
      $set: {
        tenantId,
        blockCode: 'GH-01',
        blockName: 'Girls Hostel-01 (Kasturba Hall)',
        gender: 'FEMALE',
        defaultMessName: 'Annapurna Mess (GH-01)',
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() }
    },
    { upsert: true }
  );

  const existingGHBeds = await mongoose.connection.collection('bed_inventories').countDocuments({ tenantId, blockCode: 'GH-01' });
  if (existingGHBeds === 0) {
    const beds = [];
    const categories = ['STD_AC_2S', 'STUDIO_AC_2S_PANTRY', 'STD_AC_3S', 'STD_COOL_2S'];
    const now = new Date();

    for (let floor = 1; floor <= 4; floor++) {
      for (let r = 1; r <= 8; r++) {
        const roomNum = 'G' + floor + (r < 10 ? '0' + r : r);
        const cat = categories[(floor + r) % categories.length];
        const seater = cat.includes('3S') ? 3 : 2;
        const labels = ['Bed A', 'Bed B', 'Bed C'].slice(0, seater);

        labels.forEach(bedLabel => {
          beds.push({
            tenantId,
            academicSession,
            blockCode: 'GH-01',
            floor,
            roomNumber: roomNum,
            bedLabel,
            categoryCode: cat,
            status: 'AVAILABLE',
            allocatedTo: null,
            lockExpiresAt: null,
            version: 0,
            createdAt: now,
            updatedAt: now,
          });
        });
      }
    }

    await mongoose.connection.collection('bed_inventories').insertMany(beds);
    console.log(`Seeded ${beds.length} beds for GH-01`);
  } else {
    console.log(`GH-01 already has ${existingGHBeds} beds`);
  }

  process.exit(0);
}

seedGH().catch(e => { console.error(e); process.exit(1); });

