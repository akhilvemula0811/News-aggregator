import axios from 'axios';

const states = [
  'National Coverage', 'Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu',
  'Andhra Pradesh', 'Telangana', 'Uttar Pradesh', 'West Bengal', 'Kerala',
  'Gujarat', 'Rajasthan', 'Punjab', 'Haryana', 'Bihar', 'Madhya Pradesh',
  'Arunachal Pradesh', 'Assam', 'Chhattisgarh', 'Goa', 'Himachal Pradesh',
  'Jharkhand', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha',
  'Sikkim', 'Tripura', 'Uttarakhand'
];

async function test() {
  console.log('Testing Regional Stories API across states...');
  for (const s of states) {
    try {
      const res = await axios.get(`http://localhost:5000/api/stories?state=${encodeURIComponent(s)}`);
      const stories = res.data.stories || [];
      const withImg = stories.filter((x: any) => x.imageUrl).length;
      console.log(`[State] ${s.padEnd(20)}: ${stories.length} stories (${withImg} with images)`);
    } catch (e: any) {
      console.error(`[State] ${s}: Error ${e.message}`);
    }
  }
}

test();
