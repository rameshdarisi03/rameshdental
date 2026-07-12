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
  sections: ArticleSection[];
}

export const articles: Article[] = [
  {
    slug: "knee-pain-stair-climbing",
    title: "Why Does My Knee Hurt When Climbing Stairs?",
    excerpt: "Have you ever noticed a sharp ache or dull pain in your knee while climbing stairs? Learn the common causes, symptoms, and how physiotherapy can help you recover.",
    category: "Knee",
    readTime: "6 min read",
    date: "July 12, 2026",
    thumbnail: "/images/blog-knee-pain-intro.png",
    introImage: "/images/blog-knee-pain-intro.png",
    sections: [
      {
        type: "paragraph",
        text: "Have you ever noticed a sharp ache or dull pain in your knee while climbing stairs? You're not alone. Knee pain during stair climbing is one of the most common reasons people visit a physiotherapist."
      },
      {
        type: "paragraph",
        text: "Whether you're climbing the stairs at home, walking up to your office, or using the stairs at the gym, your knees work much harder than you may realize. Every step places several times your body weight through the knee joint. When something isn't functioning as it should, climbing stairs can quickly become painful."
      },
      {
        type: "paragraph",
        text: "The good news is that most cases can be treated successfully with the right diagnosis, targeted exercises, and activity modifications."
      },
      {
        type: "header2",
        text: "What Causes Knee Pain While Climbing Stairs?"
      },
      {
        type: "paragraph",
        text: "Knee pain isn't a condition—it's a symptom. Several different problems can cause pain when going up or down stairs."
      },
      {
        type: "header3",
        text: "1. Patellofemoral Pain Syndrome (Runner's Knee)"
      },
      {
        type: "paragraph",
        text: "This is one of the most common causes of pain around the front of the knee, especially in younger adults and physically active people. The pain develops around or behind the kneecap and is often worse during activities such as climbing stairs, walking downhill, squatting, running, or sitting for long periods with bent knees."
      },
      {
        type: "paragraph",
        text: "It is usually related to increased stress on the kneecap and may be influenced by muscle weakness, training errors, or movement patterns rather than a single injury."
      },
      {
        type: "header3",
        text: "2. Knee Osteoarthritis"
      },
      {
        type: "paragraph",
        text: "As we age, the smooth cartilage that cushions the knee can gradually wear down. People with knee osteoarthritis often notice pain during walking, difficulty climbing stairs, morning stiffness, swelling, or reduced movement."
      },
      {
        type: "paragraph",
        text: "Stair climbing may become uncomfortable because the knee joint experiences greater compressive forces."
      },
      {
        type: "header3",
        text: "3. Tendon Irritation (Tendinopathy)"
      },
      {
        type: "paragraph",
        text: "Repeated jumping, running, or sporting activities can irritate the tendons around the knee. Pain is often felt just below the kneecap, during stairs, after exercise, or when getting up from a chair."
      },
      {
        type: "header3",
        text: "4. Meniscus Injury"
      },
      {
        type: "paragraph",
        text: "The meniscus is a shock-absorbing cartilage inside the knee. A tear may occur after twisting the knee or sometimes develop gradually with age. Symptoms may include pain on one side of the knee, swelling, clicking or catching, and difficulty bending or straightening the knee."
      },
      {
        type: "image",
        imageSrc: "/images/blog-knee-pain-suitable.jpeg",
        imageAlt: "Physiotherapist assessing knee structure and alignment during movement evaluation"
      },
      {
        type: "header3",
        text: "5. Muscle Weakness and Poor Movement Control"
      },
      {
        type: "paragraph",
        text: "Sometimes the knee itself is not the primary problem. Weakness in the hips, thighs, or core can change how your leg moves during everyday activities, increasing stress on the knee joint. This is one of the reasons physiotherapy focuses on the whole lower limb—not just the painful area."
      },
      {
        type: "header2",
        text: "Common Symptoms"
      },
      {
        type: "paragraph",
        text: "Depending on the cause, you may notice one or more of the following symptoms:"
      },
      {
        type: "list",
        items: [
          "Pain while climbing or descending stairs",
          "Pain around or behind the kneecap",
          "Stiffness after sitting for a long time",
          "Swelling around the knee",
          "Clicking or grinding sensations (crepitus)",
          "Difficulty squatting or kneeling",
          "Feeling that the knee is weak, giving way, or unstable"
        ]
      },
      {
        type: "paragraph",
        text: "Symptoms may come and go in the early stages but can gradually become more frequent and severe if ignored."
      },
      {
        type: "header2",
        text: "When Should You See a Physiotherapist?"
      },
      {
        type: "paragraph",
        text: "Mild soreness after unusual activity often settles within a few days. However, it's a good idea to seek professional assessment if:"
      },
      {
        type: "list",
        items: [
          "Pain lasts longer than 1–2 weeks.",
          "Climbing stairs is becoming increasingly difficult.",
          "The pain keeps returning or gets worse.",
          "Your knee feels weak, locking, or unstable.",
          "Visible swelling develops after physical activity.",
          "Pain is stopping you from exercising or performing ordinary daily tasks."
        ]
      },
      {
        type: "takeaway",
        text: "CRITICAL ALERT\nSeek urgent medical care if you experience a major injury or fall followed by severe pain, inability to bear weight on the leg, significant swelling immediately after injury, the knee appears deformed, or if you develop fever, redness, or warmth around the joint. These symptoms may indicate a structural tear or infection requiring prompt medical evaluation.",
        items: [
          "Do not try to walk if the joint cannot support your weight.",
          "Avoid applying intense direct heat to freshly swollen joints.",
          "Have structural alignment assessed immediately if the kneecap looks out of position."
        ]
      },
      {
        type: "header2",
        text: "How Physiotherapy Helps"
      },
      {
        type: "paragraph",
        text: "One of the biggest misconceptions is that complete rest is the best treatment for knee pain. In reality, prolonged rest can reduce muscle strength and make recovery slower for many common knee conditions."
      },
      {
        type: "paragraph",
        text: "After identifying the underlying cause, your physiotherapist may create a personalised treatment plan that can include:"
      },
      {
        type: "list",
        items: [
          "Pain Management: Activity modification, ice or heat therapies, and guidance on symptom management.",
          "Strengthening Exercises: Target muscles around the knee and hip (quadriceps, gluteal muscles, hamstrings, and calves) to distribute load safely.",
          "Movement Retraining: Assessing and adjusting how you walk, squat, climb stairs, and stand to reduce stress on the knee.",
          "Balance & Coordination Training: Helps your lower limb work more efficiently during daily activities."
        ]
      },
      {
        type: "header2",
        text: "Simple Home Exercises"
      },
      {
        type: "paragraph",
        text: "Important: Exercises should not cause a significant increase in pain. Mild discomfort during exercise may be acceptable, but stop if pain becomes sharp or continues to worsen. If you are unsure, consult a physiotherapist before starting."
      },
      {
        type: "header3",
        text: "1. Straight Leg Raise"
      },
      {
        type: "paragraph",
        text: "Lie on your back with one leg bent and foot flat. Tighten the thigh muscle of the straight leg, lift it about 30–45 cm off the floor, hold for 2 seconds, then lower slowly. Perform 10–15 repetitions for 2–3 sets."
      },
      {
        type: "header3",
        text: "2. Wall Sit (Within a Comfortable Range)"
      },
      {
        type: "paragraph",
        text: "Stand with your back against a wall. Slide down slightly into a partial squat (do not go lower than a 90-degree bend). Hold for 10–20 seconds, then return to standing. Repeat 5–10 times, provided it remains comfortable."
      },
      {
        type: "header3",
        text: "3. Side-Lying Leg Raise"
      },
      {
        type: "paragraph",
        text: "Lie on your side. Keep the top leg straight and in line with your body. Lift it slowly, then lower with control. Perform 10–15 repetitions for 2–3 sets. This helps strengthen the hip muscles that support knee alignment."
      },
      {
        type: "header3",
        text: "4. Step-Ups"
      },
      {
        type: "paragraph",
        text: "Using a low step, step up slowly with the affected leg, then step down with control. Keep your knee aligned straight over your foot, avoiding any inward collapse. Start with 8–10 repetitions if comfortable."
      },
      {
        type: "header2",
        text: "Tips to Prevent Knee Pain"
      },
      {
        type: "list",
        items: [
          "Stay physically active to maintain joint mobility.",
          "Strengthen your hips and thigh muscles regularly.",
          "Increase exercise intensity or duration gradually.",
          "Wear supportive footwear suited for your activity.",
          "Warm up properly before engaging in sports or heavy exercise.",
          "Avoid suddenly increasing running distance or training volume.",
          "Listen to your body—persistent pain is a signal to get assessed, not simply push through."
        ]
      },
      {
        type: "quote",
        text: "Healing requires patience, structure, and targeted loading. By allowing the joints space to move and training supporting muscles, we give the body the control it needs to step without pain."
      },
      {
        type: "reflection",
        text: "When you feel knee pain climbing stairs, pay attention. Not out of fear, but out of body awareness.\n\nBecause sometimes, recovery is not about pushing harder — but adjusting how you move.\n\nIn that space of proper rehab and strengthening, your knee finds its natural function and balance again."
      }
    ]
  },
  {
    slug: "poor-posture-spine",
    title: "Is Poor Posture Slowly Damaging Your Spine? What You Need to Know",
    excerpt: "If you spend much of your day at a desk or looking down at a smartphone, you've probably experienced neck or back stiffness. Learn the facts about posture and spine health.",
    category: "Spine",
    readTime: "8 min read",
    date: "July 10, 2026",
    thumbnail: "/images/blog-posture-intro.png",
    introImage: "/images/blog-posture-intro.png",
    sections: [
      {
        type: "paragraph",
        text: "If you spend much of your day at a desk, driving, studying, or using a smartphone, you've probably experienced a stiff neck or aching back. While posture can contribute to discomfort, research shows that there isn't one perfect posture that everyone must maintain."
      },
      {
        type: "paragraph",
        text: "The bigger issue is remaining in the same position for long periods. In this guide you'll learn why posture-related pain develops, who is most affected, practical ergonomic tips, simple exercises, and when physiotherapy may help."
      },
      {
        type: "takeaway",
        text: "KEY TAKEAWAYS",
        items: [
          "There is no single perfect posture.",
          "Regular movement is more important than sitting perfectly straight.",
          "Muscle fatigue often causes posture-related discomfort.",
          "Simple ergonomic changes and strengthening exercises can help.",
          "Persistent pain should be assessed by a physiotherapist."
        ]
      },
      {
        type: "header2",
        text: "What Causes Posture-Related Discomfort?"
      },
      {
        type: "paragraph",
        text: "Our bodies are built for motion. When we maintain any posture for too long, specific muscles undergo constant strain while others remain underutilized, leading to stiffness and fatigue."
      },
      {
        type: "list",
        items: [
          "Prolonged Sitting: Remaining seated for long periods can overload spinal muscles and joints. It is highly recommended to stand and move every 30–60 minutes.",
          "Extended Mobile Phone Use: Looking down at a phone for prolonged periods increases the gravitational workload on the neck muscles significantly.",
          "Poor laptop or Workstation Setup: Screens that are too low or keyboards positioned too far away encourage awkward, forward-leaning positions.",
          "Standing Too Long: Standing in a single rigid position without movement may also contribute to lower back muscle fatigue.",
          "Weak Supporting Muscles: Reduced strength and endurance in the core, hips, and upper back make it harder to maintain comfortable upright positions.",
          "Lack of Regular Movement: The body is designed to move. Frequent position changes help pump nutrients through spinal discs and reduce stiffness."
        ]
      },
      {
        type: "header2",
        text: "Common Symptoms"
      },
      {
        type: "list",
        items: [
          "Neck pain or soreness",
          "Shoulder tightness or tension",
          "Upper back stiffness",
          "Lower back discomfort",
          "General muscle fatigue",
          "Headaches associated with neck tension",
          "Stiffness after prolonged sitting or standing"
        ]
      },
      {
        type: "header2",
        text: "Who Is Most at Risk?"
      },
      {
        type: "paragraph",
        text: "Office workers, students, software professionals, drivers, dentists, gamers, designers, and anyone who spends long periods sitting or using digital devices are most vulnerable to posture-related stiffness."
      },
      {
        type: "header2",
        text: "When Should You See a Physiotherapist?"
      },
      {
        type: "paragraph",
        text: "Seek a professional assessment if symptoms persist for more than 1–2 weeks, keep returning, affect your work or sleep, or are accompanied by weakness, numbness, or tingling in your arms or legs."
      },
      {
        type: "paragraph",
        text: "Seek urgent medical care after a major trauma/fall, or if pain is associated with fever, unexplained weight loss, or loss of bladder or bowel control."
      },
      {
        type: "header2",
        text: "How Physiotherapy Helps"
      },
      {
        type: "paragraph",
        text: "A physiotherapist will assess your posture, movement patterns, muscle strength, flexibility, and workstation setup. Treatment may include education, exercise therapy, movement retraining, ergonomic advice, manual therapy when appropriate, and a personalised rehabilitation programme."
      },
      {
        type: "header2",
        text: "Simple Home Exercises"
      },
      {
        type: "list",
        items: [
          "1. Chin Tucks: Gently tuck your chin straight back (like making a double chin) while looking forward. Hold for 5 seconds and repeat 10 times to strengthen deep neck flexor muscles.",
          "2. Shoulder Blade Squeezes: Pull your shoulders back and squeeze your shoulder blades together. Hold for 5 seconds, repeat 10–15 times to reduce upper back stiffness.",
          "3. Doorway Chest Stretch: Stand in a doorway, place your forearms on the door frame, and step forward gently until you feel a stretch in the chest. Hold 20–30 seconds, repeat 2–3 times.",
          "4. Standing Back Extensions: Place your hands on your lower back and gently lean backward. Hold for 2 seconds and return. Perform 10 repetitions after prolonged periods of sitting."
        ]
      },
      {
        type: "header2",
        text: "Tips to Prevent Recurrence"
      },
      {
        type: "list",
        items: [
          "Take movement breaks every 30–60 minutes.",
          "Adjust your monitor to eye level so you look straight ahead.",
          "Keep your mobile phone closer to eye level rather than leaning down.",
          "Strengthen your neck, shoulders, core, and hips regularly.",
          "Stay physically active to maintain spinal health.",
          "Sleep in a comfortable position with supportive pillows.",
          "Avoid remaining in any single posture for long periods."
        ]
      },
      {
        type: "header2",
        text: "Common Posture Myths & Facts"
      },
      {
        type: "paragraph",
        text: "• Myth: There is one perfect posture that you must maintain.\n• Fact: Regular movement matters much more. The best posture is your next posture."
      },
      {
        type: "paragraph",
        text: "• Myth: Slouching permanently damages your spine.\n• Fact: Temporary slouching rarely causes permanent damage, but prolonged static positions may contribute to muscle fatigue and discomfort."
      },
      {
        type: "paragraph",
        text: "• Myth: Standing all day is healthier than sitting all day.\n• Fact: Both can cause discomfort if you don't move regularly. Balance sitting, standing, and walking throughout the day."
      },
      {
        type: "quote",
        text: "Knowledge creates structure. But healing requires flexibility. When you hold knowledge too tightly, it becomes limitation. When you allow space, it becomes guidance."
      },
      {
        type: "reflection",
        text: "When you feel stiff or fatigued from sitting, pause. Not out of helplessness, but out of awareness.\n\nBecause sometimes, the most powerful intervention is not what you add — but what you remove.\n\nIn that space, the system finds its own way back to balance."
      }
    ]
  }
];
