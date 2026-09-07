import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function test() {
  const currentData = {
    personalInfo: {},
    careerDetails: {},
    experience: [],
    education: [],
    projects: [],
    certifications: [],
  };

  const systemPrompt = `You are an expert AI Resume Builder.
Your goal is to iteratively build and refine a JSON resume based on a conversation with the user.

STRICT RULES:
1. Return ONLY valid JSON. Your entire response MUST start with '{' and end with '}'.
2. DO NOT output markdown wrappers (no \`\`\`json). DO NOT output any conversational text.
3. Maintain the schema structure exactly as provided.
4. Apply the Google XYZ Formula to all bullet points: "Accomplished [X] as measured by [Y], by doing [Z]".
5. Enforce strong action verbs, clear metrics (%), and active voice.
6. DO NOT use HTML tags inside the JSON strings. Use plain text only. Be concise and prevent repetitive loops.

SCHEMA EXPECTED:
{
    "id": "string",
    "personalInfo": {
        "fullName": "string",
        "email": "string",
        "phone": "string",
        "portfolio": "string",
        "linkedin": "string",
        "github": "string",
        "twitter": "string"
    },
    "careerDetails": { "objective": "string" },
    "experience": [{
        "id": "string",
        "jobTitle": "string",
        "company": "string",
        "duration": "string",
        "description": "string"
    }],
    "education": [{
        "id": "string",
        "degree": "string",
        "institution": "string",
        "year": "string"
    }],
    "projects": [{
        "id": "string",
        "name": "string",
        "date": "string",
        "description": "string"
    }],
    "certifications": [{
        "id": "string",
        "name": "string",
        "issuer": "string",
        "date": "string"
    }],
    "skills": ["string"]
}`;

  try {
    const response = await client.chat.completions.create({
      model: "qwen/qwen3.6-27b",
      messages: [
        {
          role: "system",
          content: `${systemPrompt}\n\nCURRENT RESUME DATA:\n${JSON.stringify(currentData, null, 2)}`,
        },
        { role: "user", content: `Hi, please build my resume. Here are all my details:
Name: Ayush Sharma
Target Role: Senior Full-Stack Engineer
Location: India
Email: ayush@example.com | Portfolio: github.com/ayush-dev

PROFESSIONAL EXPERIENCE:
1. Full-Stack Developer at TechSolutions Inc. (Jan 2023 - Present)
- Worked on a chat application called TalkX using React, Node.js, Express, and Socket.io.
- Fixed a lot of backend API bugs and made the server faster.
- Integrated Groq AI API for features like automated resume analysis, mock interviews, and ATS score matching.
- Reduced database query load times by about 40% using MongoDB indexing and caching.
- Led a team of 3 junior developers and managed PR code reviews.

2. Frontend Developer Intern at WebFlow Labs (Jun 2022 - Dec 2022)
- Built user interfaces using React, Redux Toolkit, and Tailwind CSS.
- Converted Figma designs into responsive, pixel-perfect web pages.
- Improved page loading speed from 4 seconds to 1.5 seconds by optimizing images and lazy loading components.

EDUCATION:
- B.Tech in Computer Science & Engineering | ABC Institute of Technology (2019 - 2023) | CGPA: 8.6/10

TECHNICAL SKILLS:
- Languages: JavaScript (ES6+), TypeScript, HTML5, CSS3, SQL
- Frontend: React.js, Redux, Tailwind CSS, Vite, Framer Motion
- Backend: Node.js, Express.js, REST APIs, WebSockets, Groq SDK
- Databases & Tools: MongoDB, Git, GitHub, Vercel, Render, Postman

PROJECTS:
- AI Resume Analyzer & Builder: Built a web app with React and Groq API that analyzes resumes against job descriptions and provides real-time ATS match scores.
- E-Commerce Dashboard: Created an admin analytics panel with real-time charts using Chart.js and Node.js.

Please format this data into a clean, professional, ATS-friendly resume layout with strong action verbs and quantified impact.` }
      ],
      temperature: 0.2,
      max_tokens: 5500,
      // response_format: { type: "json_object" },
    });
    console.log("Success:\n", response.choices[0]?.message?.content);
  } catch (e) {
    console.error("Failed:", e instanceof Error ? e.message : String(e));
  }
}

test();
