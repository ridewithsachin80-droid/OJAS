require("dotenv").config();
const { pool, initDB } = require("./db");

const PROJECTS = [
  {
    id:"p1", title:"Virtual Classrooms", category:"Education",
    location:"Tumkur & Madhugiri Districts", beneficiaries:"8,000+ students",
    year:"2015–Present", partner:"Manipal Foundation & Govt of Karnataka", status:"ongoing",
    description:"Since 2015 we conduct virtual classroom sessions for 9th and 10th standard students across 11 government rural schools. Each year ~800 students benefit from interactive learning, helping improve SSLC results and building confidence for future opportunities.",
    impact:"Over 8,000 students impacted so far. Measurable improvement in SSLC pass rates across Tumkur and Madhugiri rural schools.",
    sort_order:1,
    photos:[
      "https://lh3.googleusercontent.com/pw/AP1GczOhg4Jx1f0podAvBstH6toXm9fI6ekH9liBLtg8p3B_iebD_hF-mIZqAcirqb8sP7bwmjo7uWMVR8mvglx0PscDBIuV3gmtyPAI1BMhEW26HIj7aXU=w800-h560-no",
      "https://lh3.googleusercontent.com/pw/AP1GczO4IzChoFKAVCgd8chRwB0FkBMe9H6Pzyf3v9bCMbdeKHlLVSciAZmcpLR1sU56o4vmlL4mJFt17P5KJBmk1XIsexD9PIJhqRnJ2RIK_P6bcy0xTQE=w800-h560-no",
      "https://lh3.googleusercontent.com/pw/AP1GczPiS5TpfFB5lpkAX0j4XstmU8Y5oR89Cq-mRLX8UoI1a7R374ppAcSTx73-aXY0QC45Roo_BdZCiYAy_L-CRHMLCDy7vG7v8ufmNIW9G5ezaCKQ7lk=w800-h560-no",
      "https://lh3.googleusercontent.com/pw/AP1GczMfbZGP51q2fLLZPoRE9sVscI0K9nBs39BBdrveUr8vhsJn-0ka3NCPj9yRYunOc6_QsY1mn-prXtazIkTeA73a-D3S3gJhQlXkGfUJT1aLZjLQRoU=w800-h560-no",
      "https://lh3.googleusercontent.com/pw/AP1GczMfPdNHmapgw6_ynDVtYgTB-7gC8mcFBIFZoTQIvNCS5ORqejVozfdmUmNvBdgczb9hHtcT752wHEKziYWlltRlOL1_baQjdTXzo33QpNzMPGtNwOk=w800-h560-no",
    ]
  },
  {
    id:"p2", title:"Kallakatta MAUP School Support", category:"Infrastructure",
    location:"Kallakatta, Kasargod", beneficiaries:"500+ students",
    year:"2019", partner:"", status:"completed",
    description:"We provided a comprehensive range of resources to Kallakatta MAUP School — including a school bus, kitchen equipment, LCD projectors, computers, lab benches and desks, audio-visual equipment, and play items.",
    impact:"Transformed the school infrastructure, improving both academic and extracurricular activities for the entire school community.",
    sort_order:2,
    photos:["https://lh3.googleusercontent.com/pw/AP1GczNbNNkQuPW_uClmOr58WuTMPusrkKAg9SK1Sd0B19RNrpnrZFjiVUkLG7OIzn17tNInZGEo-qgXeaj_GRGn-eL03A4LKbFW2zyVaALBBsn5_V9O784=w800-h560-no"]
  },
  {
    id:"p3", title:"Halasasi School — New Building & English Medium", category:"Infrastructure",
    location:"Halasasi, Sagar Taluk", beneficiaries:"300+ students",
    year:"2020", partner:"", status:"completed",
    description:"We constructed a new building for Government Higher Primary School, Halasasi, and provided AV equipment, projectors, computers, play items, desks and benches. This enabled the school to introduce English medium classes for LKG and UKG students.",
    impact:"Enabled early childhood English medium education in a rural government school for the first time.",
    sort_order:3,
    photos:["https://lh3.googleusercontent.com/pw/AP1GczOZjs_uLJXgKI5r3QggTCUoBW1NMq3OsnTb4in0zQYqdqTTVW_kLp7anry6znhct0THOpQDvCBnfzbCV6F5K8iNTc3qqiXbAaw60ic06p5LRUCUTGE=w800-h560-no"]
  },
  {
    id:"p4", title:"Deen Dayal Buds Rehabilitation Center", category:"Special Needs",
    location:"Madhur Grama Panchayat, Kasargod", beneficiaries:"Mentally challenged children",
    year:"2021", partner:"Gram Panchayat, Madhur", status:"completed",
    description:"We constructed a well-equipped new building for the Deen Dayal Buds Rehabilitation Center for mentally challenged students, replacing a temporary shed with modern amenities.",
    impact:"Replaced a temporary shed with a permanent facility with modern amenities for mentally challenged children.",
    sort_order:4,
    photos:["https://lh3.googleusercontent.com/pw/AP1GczPrYT0xateatuiPdkjf0OgEfG_Nizcpd1xRw3z9UwZN6U-gj-BaBAdhv3nLtgHuAJ-kx21Y3xk5O3pr37DWSF4atsZ4Cxstg822xt5lSGf-JryqXMo=w800-h560-no"]
  },
  {
    id:"p5", title:"Free Tailoring Training Program", category:"Women Empowerment",
    location:"Rural Karnataka", beneficiaries:"1,400+ women",
    year:"2015–Present", partner:"Aradhana Charitable Trust", status:"ongoing",
    description:"We conduct free tailoring training programs for rural and economically disadvantaged women, empowering them with practical skills, confidence, and opportunities for financial independence.",
    impact:"Approximately 1,400 women have been empowered with vocational skills and a path to financial independence.",
    sort_order:5,
    photos:[
      "https://lh3.googleusercontent.com/pw/AP1GczOwewQ8Ae6rSlvYYtwPQeEppVl-CtsrR3OOtzVzTvNH_vm3WsowueLr7V7Z7bO-3JMI2oghsaDgIXk1GUqQN_Ct4YPApC44mycwnenDVYSrCw3jxK8=w800-h560-no",
      "https://lh3.googleusercontent.com/pw/AP1GczMdEagOzvZx97dYuC96FkVv3v3273jug5PZFRMkqvwH9TO4FJFHy9ymOw0f1sagrwkswcOLAvAYZ_AK-0_btcIexhpe2GfPi1Mc671wyAH0ApdqQcM=w800-h560-no",
    ]
  },
  {
    id:"p6", title:"Awareness Program for School Girls", category:"Education",
    location:"Tumkur District", beneficiaries:"School girls across Tumkur",
    year:"2022–Present", partner:"District Judge Jubeda Jumjum", status:"ongoing",
    description:"In collaboration with District Judge Jubeda Jumjum, we conduct awareness programs for school girls on crimes against women and children, educating them on recognizing, preventing, and safely handling such situations.",
    impact:"Empowered hundreds of school girls with knowledge and confidence to protect themselves.",
    sort_order:6, photos:[]
  },
  {
    id:"p7", title:"Free Books & School Supplies Distribution", category:"Education",
    location:"Three rural schools, Karnataka", beneficiaries:"300+ students",
    year:"2021", partner:"", status:"completed",
    description:"We distributed free books and school supplies to children in three rural schools, ensuring students have the essential learning materials they need to succeed academically.",
    impact:"300 students received essential learning materials, reducing dropout risk.",
    sort_order:7,
    photos:["https://lh3.googleusercontent.com/pw/AP1GczMjSavMc8KqzugSv3JplvoBTcX67xh1sCdEElMhp1c_Dzsys-vwH6t98MkGOkh_F7mIaYvjdu-J2GqrD6IlDLltaF0DoRcFegjgXuCphx0zNVPjP8g=w800-h560-no"]
  },
  {
    id:"p8", title:"Digital Communication Boards — Red Cross School", category:"Special Needs",
    location:"Tumkur", beneficiaries:"500+ non-verbal students",
    year:"2022", partner:"Red Cross School", status:"completed",
    description:"We provided digital communication boards to the Red Cross School for non-verbal students in Tumkur, enhancing communication skills and learning for children with speech and language challenges.",
    impact:"500 students with speech and language challenges gained improved communication tools.",
    sort_order:8, photos:[]
  },
  {
    id:"p9", title:"Maternal & Child Nutrition Support", category:"Health & Welfare",
    location:"Government Hospital, Sira", beneficiaries:"400+ mothers",
    year:"2020–Present", partner:"", status:"ongoing",
    description:"For four years we have been providing nutritional assistance to newborn babies and their mothers at the Government Hospital in Sira, promoting healthier families and stronger communities.",
    impact:"Approximately 400 mothers and newborns received nutritional support, improving early childhood health outcomes.",
    sort_order:9,
    photos:["https://lh3.googleusercontent.com/pw/AP1GczOLnWO9i4KqkvRJ-ofOcoyMaDcY7nEUYiKsKdICetSb4PHreXglFO79WT9HTWizszvkoGNBbVLmWUL7-vC9Bx1_CAMD-QB0eo70iSnd-WSZX_6x1X8=w800-h560-no"]
  },
  {
    id:"p10", title:"Tailoring Machine Distribution", category:"Women Empowerment",
    location:"Karnataka", beneficiaries:"Women in need",
    year:"2019–Present", partner:"Aradhana Charitable Trust", status:"ongoing",
    description:"In collaboration with Aradhana Charitable Trust, we provide tailoring machines to economically disadvantaged women, empowering them to develop skills and achieve financial independence.",
    impact:"Dozens of women received tailoring machines and are now self-employed or earning supplementary income.",
    sort_order:10,
    photos:["https://lh3.googleusercontent.com/pw/AP1GczPr0LOyScXTtQA7t4TgCc4eYFg32F-bK1D8RjvawRXl3U4F1UgvLtEmdF3ZnJ480-HtzaPe4TZYaNvycDgbUFV2uKgv_cYpkL0hSppxHWXY_ZwBkHY=w800-h560-no"]
  },
  {
    id:"p11", title:"School Supplies — Sahastra Deepika Residential School", category:"Education",
    location:"Bannerghatta", beneficiaries:"Students in need",
    year:"2023", partner:"", status:"completed",
    description:"We distributed uniforms, laptops, bags, and other school accessories to students in need at Sahastra Deepika Residential School, ensuring they have the necessary tools for learning.",
    impact:"Students received comprehensive school supplies enabling better academic participation.",
    sort_order:11,
    photos:["https://lh3.googleusercontent.com/pw/AP1GczMDGxyKBXs5dROZOgQv8sQSDik_A8zkNOruvwYCxlFISJTlXcdLNrHQZRKBXo7uS2aKavO7LtsE92PV1C8fTYdBL75w6f50S8AnapH0PX-wLJeZOOs=w800-h560-no"]
  },
  {
    id:"p12", title:"Scholarship Distribution", category:"Education",
    location:"Karnataka", beneficiaries:"Meritorious students",
    year:"2018–Present", partner:"Wooday Foundation", status:"ongoing",
    description:"In collaboration with Wooday Foundation, we award scholarships of ₹10,000 each year to meritorious and financially disadvantaged students, supporting their pursuit of higher education and professional courses.",
    impact:"Multiple students per year receive ₹10,000 scholarships enabling engineering, medical, and professional courses.",
    sort_order:12,
    photos:["https://lh3.googleusercontent.com/pw/AP1GczPFDNKSNKJH8SwIyyQsoJ43NBzRsXsI0PjSxle7H5baOq1z0GKHLTFx7SA3jfoQssJvJhraWMr7XwvI-dV_Nm6FUeOGS8uvk7W8Nytxp6gVcAK3NBw=w800-h560-no"]
  },
  {
    id:"p13", title:"CET Coaching Classes", category:"Education",
    location:"Rural Karnataka", beneficiaries:"Rural students",
    year:"2021–Present", partner:"Gubbi Dharmartha Trust", status:"ongoing",
    description:"In collaboration with Gubbi Dharmartha Trust, we conducted CET coaching classes for economically disadvantaged and rural children, helping them prepare for competitive exams and higher education.",
    impact:"Students from rural backgrounds gained access to quality CET coaching previously only available in cities.",
    sort_order:13,
    photos:["https://lh3.googleusercontent.com/pw/AP1GczNJicGa5YSjFGypZRw6K3nxEK2BwPq7OMASQxY0IACJJzpmv5J3HI7EgKyysi94idILRm8TgjWZbxguq5i9RGyRKix_ZAVWbMN7qFtVcYxW8ESfD7Q=w800-h560-no"]
  },
  {
    id:"p14", title:"School Uniforms & Accessories Distribution", category:"Education",
    location:"Karnataka", beneficiaries:"Students in need",
    year:"2022", partner:"", status:"completed",
    description:"We distributed uniforms and essential school accessories to students in need, ensuring they have the necessary resources for a comfortable and effective learning experience.",
    impact:"Removed a key barrier to school attendance for underprivileged students.",
    sort_order:14,
    photos:["https://lh3.googleusercontent.com/pw/AP1GczPoSzSyEzfwZeXsDlDpHqohfpwIYUKMSSJ1u9k1vVrVID45ekKx9y3SBzmKRtIla1iilg9wvQYgzl86p0gzjBuauLGW6KSPWWF2p2z35jvvzWLrcfM=w800-h560-no"]
  },
  {
    id:"p15", title:"Blankets & Pillows for Old Age Homes", category:"Community Welfare",
    location:"Karnataka", beneficiaries:"Elderly residents",
    year:"2023", partner:"", status:"completed",
    description:"We distributed blankets and pillows to residents of old age homes, providing comfort and support to improve quality of life for elderly individuals.",
    impact:"Elderly residents received essential comfort items improving their daily living conditions.",
    sort_order:15, photos:[]
  },
  {
    id:"p16", title:"NEET Coaching & Career Guidance", category:"Education",
    location:"Tumkur District", beneficiaries:"Aspiring medical students",
    year:"2020–Present", partner:"", status:"ongoing",
    description:"We provide NEET coaching and training programs to help underprivileged students pursue professional careers in engineering and medicine, including career guidance and mentorship.",
    impact:"Students from economically disadvantaged backgrounds gained access to professional entrance exam coaching.",
    sort_order:16, photos:[]
  }
];

async function seedAll() {
  for (const p of PROJECTS) {
    await pool.query(
      `INSERT INTO projects (id,title,category,location,beneficiaries,year,partner,status,description,impact,sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (id) DO UPDATE SET
         title=$2,category=$3,location=$4,beneficiaries=$5,year=$6,
         partner=$7,status=$8,description=$9,impact=$10,sort_order=$11,updated_at=NOW()`,
      [p.id,p.title,p.category,p.location,p.beneficiaries,p.year,
       p.partner,p.status,p.description,p.impact,p.sort_order]
    );
    await pool.query("DELETE FROM photos WHERE project_id=$1", [p.id]);
    for (let i = 0; i < p.photos.length; i++) {
      await pool.query(
        "INSERT INTO photos (project_id, url, sort_order) VALUES ($1,$2,$3)",
        [p.id, p.photos[i], i]
      );
    }
    console.log(`  ✅ ${p.title}`);
  }
}

/* Allow running directly: node server/seed.js */
if (require.main === module) {
  (async () => {
    try {
      await initDB();
      console.log("🌱 Seeding database…");
      await seedAll();
      console.log("✨ Seed complete!");
      process.exit(0);
    } catch (err) {
      console.error("❌ Seed failed:", err.message);
      process.exit(1);
    }
  })();
}

module.exports = { seedAll };
