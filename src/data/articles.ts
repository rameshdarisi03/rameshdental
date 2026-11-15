export interface ArticleSection {
  type: "paragraph" | "header2" | "header3" | "list" | "takeaway" | "quote" | "reflection" | "image";
  text?: string;
  items?: string[];
  imageSrc?: string;
  imageAlt?: string;
}

export interface Article {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readTime: string;
  date: string;
  thumbnail: string;
  introImage: string;
  tags?: string[];
  author?: string;
  sections: ArticleSection[];
}

export const articles: Article[] = [
  {
    slug: "root-canal-treatment-myth-vs-reality",
    title: "Is Root Canal Treatment Really Painful? Myths vs. Modern Reality",
    excerpt: "Debunking the age-old dental myth. Discover how modern rotary endodontics, digital apex locators, and computerized anesthesia make root canal therapy virtually painless.",
    category: "Endodontics",
    readTime: "5 min read",
    date: "November 10, 2026",
    thumbnail: "/images/hero-dental-desktop.jpg",
    introImage: "/images/hero-dental-desktop.jpg",
    tags: ["Root Canal", "Painless Dentistry", "Endodontics", "Toothache", "Dental Care", "Oral Health"],
    author: "Dr. Ramesh Darisi, BDS, MDS",
    sections: [
      {
        type: "paragraph",
        text: "For generations, the phrase 'I'd rather have a root canal' has been used as the benchmark for unpleasant experiences. However, in modern dental science, this reputation is completely outdated. Today's root canal treatment is designed not to cause pain, but to relieve it."
      },
      {
        type: "paragraph",
        text: "When deep decay, cracked enamel, or trauma reaches the innermost chamber of your tooth—the pulp—bacteria cause severe inflammation and throbbing nerve pain. A Root Canal Treatment (RCT) gently removes the infected pulp, cleans and disinfects the micro-canals, and seals them with biocompatible material."
      },
      {
        type: "takeaway",
        text: "Modern clinical root canal therapy is no more uncomfortable than receiving a standard dental filling, thanks to precision local anesthetics and rotary instruments."
      },
      {
        type: "header2",
        text: "Why Did Root Canals Get a Bad Reputation?"
      },
      {
        type: "paragraph",
        text: "Decades ago, before the advent of digital imaging, nickel-titanium rotary files, and high-potency local anesthetics, dentists had to rely on manual stainless steel hand files and slow radiographs. Today, three technological advancements have revolutionized the procedure:"
      },
      {
        type: "list",
        items: [
          "Computerized Local Anesthesia: Ensures the tooth and surrounding periodontal ligament are 100% numb before treatment begins.",
          "Digital Apex Locators: Electronically measure the exact root length to within 0.1 mm, preventing irritation beyond the root tip.",
          "Rotary Endodontic Motors: Highly flexible titanium files clean the curved root canals smoothly, quietly, and in a fraction of the time."
        ]
      },
      {
        type: "header2",
        text: "Key Signs You Might Need a Root Canal"
      },
      {
        type: "paragraph",
        text: "Not all dental pain requires a root canal, but the following symptoms indicate that the pulp may be compromised:"
      },
      {
        type: "list",
        items: [
          "Lingering sensitivity to hot or cold temperatures lasting more than 30 seconds after removing the source.",
          "Spontaneous, throbbing toothache that worsens when lying flat or during the night.",
          "Sharp pain when biting down or chewing food on a specific tooth.",
          "A small pimple or swelling on the gums near the base of the tooth (a dental abscess).",
          "Dark discoloration or greying of a previously healthy tooth after trauma."
        ]
      },
      {
        type: "quote",
        text: "Saving your natural tooth should always be the primary goal. No bridge or artificial implant performs quite like your original natural tooth root."
      },
      {
        type: "header2",
        text: "Can a Root Canal Be Completed in One Visit?"
      },
      {
        type: "paragraph",
        text: "In many cases, yes. At Ramesh Dental Clinic, single-sitting root canals are performed using advanced rotary systems, provided there is no extensive active abscess requiring prolonged medicinal dressing. After the root canals are sealed, a custom zirconia or ceramic crown is placed to protect the tooth from future fracture."
      },
      {
        type: "reflection",
        text: "If you are tolerating a dull ache or avoiding cold drinks because of tooth pain, do not delay. Treating the infection early prevents bone loss and avoids emergency tooth extractions."
      }
    ]
  },
  {
    slug: "dental-implants-vs-bridges-guide",
    title: "Dental Implants vs. Fixed Bridges: Which Is Right for You?",
    excerpt: "Missing one or more teeth? Compare dental implants and traditional dental bridges across lifespan, jawbone preservation, adjacent tooth health, and lifetime cost.",
    category: "Implantology",
    readTime: "7 min read",
    date: "November 05, 2026",
    thumbnail: "/images/hero-dental-desktop.jpg",
    introImage: "/images/hero-dental-desktop.jpg",
    tags: ["Dental Implants", "Fixed Bridge", "Tooth Replacement", "Prosthodontics", "Smile Restoration"],
    author: "Dr. Ramesh Darisi, BDS, MDS",
    sections: [
      {
        type: "paragraph",
        text: "Losing a tooth—whether through injury, periodontal disease, or severe decay—affects much more than just your smile. Over time, missing teeth cause surrounding teeth to drift, alter your bite alignment, and lead to progressive bone loss in your jaw."
      },
      {
        type: "paragraph",
        text: "When replacing a missing tooth, patients are almost always faced with two primary clinical choices: a Dental Implant or a Fixed Dental Bridge. Understanding the biological and functional differences helps you make an informed decision for your oral health."
      },
      {
        type: "header2",
        text: "What Is a Dental Implant?"
      },
      {
        type: "paragraph",
        text: "A dental implant is a biocompatible titanium screw surgically positioned into the jawbone beneath your gums. Over a period of 8 to 12 weeks, the implant fuses directly with the bone through a process called osseointegration. Once fully integrated, a custom ceramic crown is anchored onto it, replicating the root and crown of your natural tooth."
      },
      {
        type: "header2",
        text: "What Is a Fixed Dental Bridge?"
      },
      {
        type: "paragraph",
        text: "A dental bridge spans the gap where teeth are missing. It consists of two or more crowns for the teeth on either side of the space (called abutment teeth) and a false tooth (pontic) in between. To place a bridge, the healthy adjacent teeth must be trimmed down to serve as supportive anchors."
      },
      {
        type: "takeaway",
        text: "Dental implants preserve adjacent healthy teeth because they do not require grinding down neighboring enamel. They also stimulate the jawbone, preventing facial bone shrinkage."
      },
      {
        type: "header2",
        text: "Comparison: Dental Implants vs. Bridges"
      },
      {
        type: "list",
        items: [
          "Lifespan: Implants can last 25+ years or a lifetime with proper oral hygiene. Bridges typically last 10 to 15 years before replacement.",
          "Adjacent Tooth Preservation: Implants stand independently. Bridges require cutting down and crowning two healthy neighboring teeth.",
          "Bone Health: Implants transmit chewing forces into the jaw, maintaining bone density. Bridges leave the bone beneath the missing tooth unworked, leading to gradual bone resorption.",
          "Hygiene: Implants can be flossed like a natural tooth. Bridges require specialized floss threaders to clean underneath the connected pontic.",
          "Treatment Time: A bridge is faster (typically 1 to 2 weeks). An implant requires healing time for osseointegration (2 to 3 months)."
        ]
      },
      {
        type: "quote",
        text: "While an implant may require higher upfront investment and patience during healing, it is universally considered the gold standard for long-term oral stability and natural bite force."
      },
      {
        type: "reflection",
        text: "Schedule an intraoral 3D scan and panoramic X-ray to assess your bone volume and determine whether you are an immediate candidate for dental implants."
      }
    ]
  },
  {
    slug: "invisible-aligners-vs-traditional-braces",
    title: "Clear Aligners vs. Metal Braces: The Adult Orthodontics Guide",
    excerpt: "Can clear aligners fix your bite discreetly? Discover treatment timelines, lifestyle benefits, hygiene differences, and how digital orthodontics aligns your teeth without brackets.",
    category: "Orthodontics",
    readTime: "6 min read",
    date: "October 28, 2026",
    thumbnail: "/images/hero-dental-desktop.jpg",
    introImage: "/images/hero-dental-desktop.jpg",
    tags: ["Clear Aligners", "Invisible Braces", "Orthodontics", "Teeth Straightening", "Adult Braces"],
    author: "Dr. Sneha Reddy, BDS, MDS",
    sections: [
      {
        type: "paragraph",
        text: "A straight, harmonious smile is not just about aesthetics—it dramatically improves your chewing efficiency, speech articulation, and makes keeping teeth clean infinitely easier. For working professionals and adults, the prospect of wearing metal brackets and wires has long been a deterrent."
      },
      {
        type: "paragraph",
        text: "Clear aligner technology has revolutionized adult orthodontics. By using a series of custom, medical-grade polyurethane transparent trays, aligners exert gentle, continuous micro-forces to guide teeth into their ideal dental arch positions."
      },
      {
        type: "header2",
        text: "Top Advantages of Clear Aligners"
      },
      {
        type: "list",
        items: [
          "Virtually Invisible: Friends and colleagues rarely notice you are wearing them, making them ideal for work presentations and social events.",
          "Removable for Meals: You can enjoy your favorite foods without worrying about broken brackets or food getting lodged in wires.",
          "Superior Oral Hygiene: Simply pop the trays out to brush and floss your natural teeth normally, minimizing the risk of plaque accumulation and white spot lesions.",
          "Fewer Emergency Visits: No pokey wires, loose brackets, or mouth ulcers from abrasive metal hardware.",
          "Predictable Digital 3D Simulation: Before starting, you can view a computerized 3D video simulation of your teeth moving into place."
        ]
      },
      {
        type: "takeaway",
        text: "Aligners must be worn for 20 to 22 hours daily. Consistency and patient compliance are the key drivers of successful clear aligner therapy."
      },
      {
        type: "header2",
        text: "When Are Traditional Braces Preferred?"
      },
      {
        type: "paragraph",
        text: "While clear aligners can handle crowding, spacing, overbites, and crossbites, traditional fixed ceramic or metal braces remain superior for severe skeletal discrepancies, severely rotated premolars, or when significant tooth extrusion is required."
      },
      {
        type: "quote",
        text: "Modern orthodontics isn't one-size-fits-all. The right treatment balances clinical tooth movement mechanics with your lifestyle and cosmetic preferences."
      },
      {
        type: "reflection",
        text: "Wondering if clear aligners are right for your teeth? Our digital 3D intraoral scanner can map your smile and generate a simulated outcome in just 15 minutes."
      }
    ]
  },
  {
    slug: "bleeding-gums-causes-and-remedies",
    title: "Why Do My Gums Bleed When Brushing? Signs of Gingivitis You Shouldn't Ignore",
    excerpt: "Bleeding gums are an early distress signal from your periodontal tissues. Learn how plaque buildup, ultrasonic scaling, and laser therapy reverse early gum disease before tooth loss occurs.",
    category: "Periodontics",
    readTime: "5 min read",
    date: "October 18, 2026",
    thumbnail: "/images/hero-dental-desktop.jpg",
    introImage: "/images/hero-dental-desktop.jpg",
    tags: ["Bleeding Gums", "Gingivitis", "Periodontitis", "Scaling & Polishing", "Gum Health"],
    author: "Dr. Arvind Kumar, BDS, MDS",
    sections: [
      {
        type: "paragraph",
        text: "Seeing pink in the sink when you brush or floss is surprisingly common, but it is never normal. If your hands or scalp bled every time you washed them, you would seek medical care immediately. Your gums deserve the exact same attention."
      },
      {
        type: "paragraph",
        text: "Healthy gums are firm, pale pink, and fit snugly around your teeth. When plaque—a sticky biofilm of harmful oral bacteria—is left along the gumline, it triggers an inflammatory immune response known as Gingivitis."
      },
      {
        type: "header2",
        text: "The Progression: Gingivitis to Periodontitis"
      },
      {
        type: "paragraph",
        text: "Gingivitis is the reversible early stage of gum disease. If left untreated, plaque hardens into mineralized calculus (tartar) beneath the gumline that cannot be removed with a standard toothbrush. The infection spreads deeper, destroying the periodontal ligaments and alveolar bone holding your teeth in place. This advanced stage is called Periodontitis."
      },
      {
        type: "takeaway",
        text: "Gingivitis is 100% reversible with a routine professional ultrasonic cleaning and improved daily flossing habits."
      },
      {
        type: "header2",
        text: "Common Culprits Behind Bleeding Gums"
      },
      {
        type: "list",
        items: [
          "Inadequate or Inconsistent Flossing: Plaque between teeth remains undisturbed, causing localized interdental gum inflammation.",
          "Brushing Too Hard: Using a hard-bristled toothbrush or scrubbing aggressively damages delicate gingival tissues.",
          "Hormonal Fluctuations: Pregnancy, puberty, and oral contraceptives increase blood flow to gingival tissues, making them sensitive.",
          "Systemic Conditions: Diabetes, vitamin C or K deficiencies, and certain blood-thinning medications exacerbate bleeding.",
          "Smoking & Tobacco: Nicotine restricts blood flow, often masking inflammation until severe bone loss has already occurred."
        ]
      },
      {
        type: "header2",
        text: "How Professional Ultrasonic Scaling Helps"
      },
      {
        type: "paragraph",
        text: "A widespread myth is that dental scaling loosens teeth or scratches enamel. In reality, modern ultrasonic scalers use gentle high-frequency sound vibrations paired with a cooling water mist to gently disintegrate stubborn tartar without harming enamel. For deep periodontal pockets, diode laser therapy sterilizes the sulcus and promotes rapid tissue regeneration."
      },
      {
        type: "quote",
        text: "Preventive scaling every 6 months is the single most cost-effective investment in maintaining your natural teeth for life."
      },
      {
        type: "reflection",
        text: "If you notice persistent bleeding, tenderness, or chronic bad breath, book a comprehensive periodontal evaluation today."
      }
    ]
  },
  {
    slug: "wisdom-teeth-when-to-extract",
    title: "Do All Wisdom Teeth Need Extraction? Understanding Impaction & Pain",
    excerpt: "From pericoronitis to crowded dental arches, understand when third molars should be removed and what modern painless extraction recovery involves.",
    category: "Oral Surgery",
    readTime: "6 min read",
    date: "October 02, 2026",
    thumbnail: "/images/hero-dental-desktop.jpg",
    introImage: "/images/hero-dental-desktop.jpg",
    tags: ["Wisdom Teeth", "Tooth Extraction", "Oral Surgery", "Impacted Teeth", "Painless Dentistry"],
    author: "Dr. Ramesh Darisi, BDS, MDS",
    sections: [
      {
        type: "paragraph",
        text: "Wisdom teeth—or third molars—are the last set of permanent teeth to erupt, typically making their appearance between ages 17 and 25. For our ancient ancestors, these powerful molars helped grind tough, uncooked roots and meats. For modern humans with smaller jawbones, they frequently run out of space."
      },
      {
        type: "paragraph",
        text: "When a wisdom tooth cannot emerge properly, it becomes 'impacted'—trapped beneath the gum tissue or bone, often growing sideways against the roots of healthy second molars."
      },
      {
        type: "header2",
        text: "When Should Wisdom Teeth Be Removed?"
      },
      {
        type: "paragraph",
        text: "Not every wisdom tooth requires extraction. If a third molar erupts fully, is upright, properly aligned, and can be thoroughly cleaned during daily brushing, it can remain safely in place. Extraction is strongly indicated in these clinical situations:"
      },
      {
        type: "list",
        items: [
          "Recurrent Pericoronitis: Swelling, infection, and severe pain around the flap of gum partially covering an erupting tooth.",
          "Damage to Adjacent Molars: An impacted tooth pressing against the second molar causes root resorption and cavity formation.",
          "Cysts and Tumors: The sac surrounding an impacted tooth can fill with fluid, forming a cyst that hollows out jawbone tissue.",
          "Severe Crowding: Forward pressure from erupting third molars disrupting previous orthodontic alignment.",
          "Inability to Clean: Deep molar position makes proper flossing impossible, leading to rampant decay."
        ]
      },
      {
        type: "takeaway",
        text: "Preventive removal during late teens or early twenties carries faster bone healing and significantly lower surgical complication rates."
      },
      {
        type: "header2",
        text: "The Painless Extraction Experience"
      },
      {
        type: "paragraph",
        text: "Modern wisdom tooth removal is performed under profound local anesthesia. Patients feel pressure, but absolutely no sharp pain. Advanced techniques like piezo-surgery and platelet-rich fibrin (PRF) promote rapid socket healing, virtually eliminating the risk of dry socket."
      },
      {
        type: "quote",
        text: "A 2-minute panoramic OPG X-ray provides a clear 180-degree view of your wisdom teeth roots and their proximity to the inferior alveolar nerve."
      },
      {
        type: "reflection",
        text: "Experiencing localized jaw stiffness or dull pressure at the back of your mouth? Schedule an evaluation to inspect your third molars before acute pain strikes."
      }
    ]
  },
  {
    slug: "teeth-whitening-safe-effective-options",
    title: "Professional Teeth Whitening vs. At-Home Kits: What Truly Works?",
    excerpt: "Understand the science of enamel discoloration, why over-the-counter strips often trigger tooth sensitivity, and how in-office laser whitening protects your enamel.",
    category: "Cosmetic Dentistry",
    readTime: "5 min read",
    date: "September 24, 2026",
    thumbnail: "/images/hero-dental-desktop.jpg",
    introImage: "/images/hero-dental-desktop.jpg",
    tags: ["Teeth Whitening", "Cosmetic Dentistry", "Smile Makeover", "Enamel Health", "Laser Whitening"],
    author: "Dr. Priya Nair, BDS",
    sections: [
      {
        type: "paragraph",
        text: "A bright, luminous smile is universally associated with health, vitality, and confidence. Over time, dietary habits (coffee, tea, red wine, turmeric spices), smoking, and natural aging cause microscopic chromogens to lodge deep within tooth enamel pores."
      },
      {
        type: "paragraph",
        text: "While drugstore shelves and social media are filled with charcoal powders, whitening toothpastes, and LED light kits, many of these options cause irreversible enamel abrasion or chemical gum irritation. Understanding how professional whitening works protects your dental health."
      },
      {
        type: "header2",
        text: "Intrinsic vs. Extrinsic Stains"
      },
      {
        type: "list",
        items: [
          "Extrinsic Stains: Surface discoloration caused by coffee, tea, cola, tobacco, and deeply pigmented foods. These respond exceptionally well to professional bleaching and scaling.",
          "Intrinsic Stains: Deep internal discoloration caused by childhood antibiotic use (tetracycline), excessive fluoride ingestion, trauma, or thinning enamel exposing the yellow dentin underneath. These may require cosmetic veneers or bonding."
        ]
      },
      {
        type: "takeaway",
        text: "Charcoal and abrasive whitening toothpastes only scrub the surface and can wear away your enamel over time, revealing yellower dentin underneath."
      },
      {
        type: "header2",
        text: "Why In-Office Clinical Whitening Is Superior"
      },
      {
        type: "paragraph",
        text: "In-office laser whitening utilizes a concentrated, pH-balanced hydrogen peroxide gel activated by a specialized blue wavelength LED light. Crucially, your gums and soft oral tissues are shielded with a protective liquid dam barrier."
      },
      {
        type: "list",
        items: [
          "Up to 6-8 Shades Lighter in a single 45-minute clinical appointment.",
          "Desensitizing Agents: Formulated with potassium nitrate and fluoride to prevent acute post-treatment sensitivity.",
          "Complete Gum Protection: Unlike DIY trays that leak bleach onto gums, professional protocols prevent painful chemical burns."
        ]
      },
      {
        type: "quote",
        text: "Before whitening, a dentist must verify that your teeth are free of active cavities and gum disease to prevent bleach penetration into internal tooth nerves."
      },
      {
        type: "reflection",
        text: "Planning for an upcoming wedding, interview, or special event? Book a consultation to evaluate the ideal whitening protocol for your smile."
      }
    ]
  },
  {
    slug: "pediatric-dental-care-milestones",
    title: "A Parent's Guide to Children's Teeth: First Visit, Cavities & Sealants",
    excerpt: "When should your child first see a dentist? Essential tips on milk teeth care, thumb-sucking habits, fluoride protection, and establishing fear-free dental visits.",
    category: "Pediatric Dentistry",
    readTime: "6 min read",
    date: "September 15, 2026",
    thumbnail: "/images/hero-dental-desktop.jpg",
    introImage: "/images/hero-dental-desktop.jpg",
    tags: ["Pediatric Dentistry", "Kids Dental Care", "Milk Teeth", "Cavity Prevention", "Pit & Fissure Sealants"],
    author: "Dr. Priya Nair, BDS",
    sections: [
      {
        type: "paragraph",
        text: "One of the most persistent misconceptions in dentistry is that 'baby teeth don't matter because they will fall out anyway.' In reality, primary (milk) teeth are vital for your child's facial development, speech clarity, self-esteem, and nutritional chewing ability."
      },
      {
        type: "paragraph",
        text: "Moreover, primary teeth serve as natural space maintainers. If a milk molar is lost early due to severe decay, surrounding teeth tip into the space, causing severe crowding when permanent teeth emerge."
      },
      {
        type: "header2",
        text: "The 'First Tooth, First Birthday' Rule"
      },
      {
        type: "paragraph",
        text: "The Indian Dental Association and American Academy of Pediatric Dentistry recommend that a child's first dental checkup occur within six months of the first tooth erupting, or by their first birthday. This early visit accomplishes three crucial goals:"
      },
      {
        type: "list",
        items: [
          "Early Detection: Checking for enamel defects, tongue-tie, and early signs of baby-bottle tooth decay.",
          "Parental Guidance: Advice on cleaning infant gums, age-appropriate fluoride toothpaste amounts, and diet counseling.",
          "Zero Fear Association: The child learns that the dental clinic is a friendly, fun environment before any painful cavity ever develops."
        ]
      },
      {
        type: "takeaway",
        text: "Pit and fissure sealants are painless, invisible protective coatings painted onto the deep chewing grooves of back molars, reducing cavity risk by up to 80%."
      },
      {
        type: "header2",
        text: "Toothbrushing Guidelines by Age"
      },
      {
        type: "list",
        items: [
          "Under 3 Years: Use a soft infant brush with a smear (grain-of-rice size) of fluoride toothpaste twice daily.",
          "Ages 3 to 6 Years: Use a pea-sized amount of fluoride toothpaste. Parents should assist and supervise brushing to ensure all surfaces are cleaned.",
          "Ages 6+ Years: Encourage independent brushing for two full minutes with gentle circular motions, followed by interdental flossing."
        ]
      },
      {
        type: "quote",
        text: "Healthy dental habits formed in early childhood build a lifetime foundation of confident, pain-free smiles."
      },
      {
        type: "reflection",
        text: "Make your child's dental visit a fun adventure. Our gentle pediatric team specializes in welcoming, anxiety-free care for little smiles."
      }
    ]
  },
  {
    slug: "dental-emergencies-what-to-do",
    title: "What to Do in a Dental Emergency: Knocked-Out Tooth, Severe Toothache & Swelling",
    excerpt: "A step-by-step emergency action guide for handling a knocked-out tooth, acute throbbing pain, fractured crown, or sudden facial swelling before reaching the clinic.",
    category: "Emergency Dentistry",
    readTime: "5 min read",
    date: "September 01, 2026",
    thumbnail: "/images/hero-dental-desktop.jpg",
    introImage: "/images/hero-dental-desktop.jpg",
    tags: ["Dental Emergency", "Knocked Out Tooth", "Severe Toothache", "First Aid", "Urgent Dental Care"],
    author: "Dr. Ramesh Darisi, BDS, MDS",
    sections: [
      {
        type: "paragraph",
        text: "Dental emergencies can happen in a split second—a soccer ball to the face, a rogue popcorn kernel, or a chronic dull toothache that suddenly explodes into unbearable throbbing pain at 10 PM. Knowing exactly what to do in the first 30 to 60 minutes can be the difference between saving and losing a tooth."
      },
      {
        type: "header2",
        text: "1. Completely Knocked-Out Tooth (Avulsion)"
      },
      {
        type: "paragraph",
        text: "This is a true time-critical emergency. If a permanent tooth is completely displaced from its socket, time is of the essence:"
      },
      {
        type: "list",
        items: [
          "Pick it up by the CROWN only: Never touch the root or scrape off any attached tissue fragments.",
          "Gently rinse: If dirty, rinse quickly with cold water or milk for 5 seconds. Do not use soap or scrub.",
          "Re-insert if possible: Gently place the tooth back into its socket and hold it in place with a clean tissue.",
          "If you cannot reinsert, keep it MOIST: Place the tooth in cold milk, Hank's Balanced Salt Solution, or inside the cheek pouch. Do not store in plain dry water.",
          "Reach the clinic within 30 to 60 minutes: A tooth replanted within one hour has the highest chance of successful reattachment."
        ]
      },
      {
        type: "header2",
        text: "2. Severe, Unbearable Toothache"
      },
      {
        type: "paragraph",
        text: "Rinse your mouth with warm salt water to dislodge trapped food. Use dental floss gently. Take an OTC anti-inflammatory like ibuprofen if medically permissible. Never place an aspirin tablet directly on your gums—it will cause a severe acid chemical burn on the mucosal tissue."
      },
      {
        type: "header2",
        text: "3. Broken, Chipped, or Fractured Tooth"
      },
      {
        type: "paragraph",
        text: "Collect any broken tooth fragments and store them in milk. Rinse your mouth with warm water. If bleeding, apply gentle pressure with sterile gauze. An emergency composite restoration or temporary crown will protect the exposed nerve."
      },
      {
        type: "takeaway",
        text: "Facial swelling accompanied by difficulty swallowing, high fever, or eye closure requires immediate emergency hospital or clinic intervention, as dental infections can spread rapidly."
      },
      {
        type: "quote",
        text: "Keep our clinic emergency contact number saved in your phone: +91 89714 62949. Quick action preserves your teeth and eliminates acute pain."
      },
      {
        type: "reflection",
        text: "Experiencing sudden pain or dental trauma? Contact Ramesh Dental Clinic immediately for same-day emergency assistance."
      }
    ]
  }
];
