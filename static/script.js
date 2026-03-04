


/* ========= ELEMENTS ========= */
console.log("Signup JS loaded");
const productInput = document.getElementById("productInput");
const analyzeBtn = document.getElementById("analyzeBtn");
const suggestionsEl = document.getElementById("suggestions");
const loadingEl = document.getElementById("loading");
const resultCards = document.getElementById("resultCards");
const scoreCard = document.getElementById("scoreCard");
const downloadBtn = document.getElementById("downloadBtn");
const topBtn = document.getElementById("topBtn");
const canvas = document.getElementById("particles-canvas");
const liveCam = document.getElementById("liveCam");
const startScanBtn = document.getElementById("startScanBtn");
const stopScanBtn = document.getElementById("stopScanBtn");
const liveStatus = document.getElementById("liveStatus");
let scanning = false;


// hide loader initially
try { loadingEl.style.display = "none"; } catch {}

/* ========= GLOBALS ========= */
let videoStream = null;
let lastScanTime = 0;

/* ========= SUGGESTIONS ========= */
const SUGGESTS = [
  "Plastic Bottle","Shampoo Bottle","T-Shirt","Battery",
  "Glass Jar","Paper Cup","Laptop","LED Bulb",
  "Plastic Bag","Toothbrush (plastic)"
];

/* ======= PARTICLES BACKGROUND ======= */
if (canvas) {
  const ctx = canvas.getContext("2d");

  // all particle code inside here
let W, H, particles = [];

function resizeCanvas() {
  W = canvas.width = innerWidth;
  H = canvas.height = innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function rand(min, max) { return Math.random() * (max - min) + min; }

function createParticles(n = 80) {
  particles = [];
  for (let i = 0; i < n; i++) {
    particles.push({
      x: rand(0, W),
      y: rand(0, H),
      r: rand(1, 3),
      vx: rand(-0.3, 0.3),
      vy: rand(-0.3, 0.3),
      hue: Math.random() > 0.5 ? "blue" : "red"
    });
  }
}
createParticles();

function drawParticles() {
  ctx.clearRect(0, 0, W, H);

  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const a = particles[i], b = particles[j];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (dist < 120) {
        ctx.strokeStyle = a.hue === "blue"
          ? "rgba(30,144,255,0.06)"
          : "rgba(255,53,91,0.06)";
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }

  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    if (p.x < 0) p.x = W;
    if (p.x > W) p.x = 0;
    if (p.y < 0) p.y = H;
    if (p.y > H) p.y = 0;

    ctx.beginPath();
    ctx.fillStyle = p.hue === "blue"
      ? "rgba(30,144,255,0.9)"
      : "rgba(255,53,91,0.9)";
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  });

  requestAnimationFrame(drawParticles);
}
drawParticles();
}

/* ======= TYPEAHEAD ======= */
productInput.addEventListener("input", () => {
  const q = productInput.value.trim().toLowerCase();
  suggestionsEl.innerHTML = "";
  if (!q) return (suggestionsEl.style.display = "none");

  const matches = SUGGESTS.filter(s => s.toLowerCase().includes(q)).slice(0, 6);

  matches.forEach(m => {
  const li = document.createElement("li");
  li.textContent = m;
  li.classList.add("suggest-item");

  li.addEventListener("click", () => {
    productInput.value = m;
    suggestionsEl.innerHTML = "";
    suggestionsEl.style.display = "none";
  });

  suggestionsEl.appendChild(li);
});


  suggestionsEl.style.display = matches.length ? "block" : "none";
});

/* ========= GEMINI IMAGE DETECTION ========= */



async function detectWaste(base64Image) {
  if (!scanning) return;

  liveStatus.innerHTML = "🧠 Analyzing…";

  const model = new GoogleGenerativeAI({ apiKey: GEMINI_KEY })
    .getGenerativeModel({ model: "gemini-1.5-pro" });

  try {
    const result = await model.generateContent([
      {
        text: `
Return JSON ONLY.

{
  "identified_item": "<name or 'unknown'>",
  "waste_type": "<plastic|organic|glass|metal|paper|hazardous|ewaste|unknown>",
  "biodegradable": "<yes|no|unknown>",
  "eco_score": <0-100>
}
`
      },
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Image.split(",")[1]
        }
      }
    ]);

    if (!scanning) return;

    // Extract the JSON safely
    const txt = result.response.candidates[0].content.parts[0].text;
    const start = txt.indexOf("{");
    const end = txt.lastIndexOf("}");
    const json = JSON.parse(txt.slice(start, end + 1));

    liveStatus.innerHTML = `
      📦 Detected: <b>${json.identified_item}</b><br>
      ♻ Waste: <b>${json.waste_type}</b><br>
      🌱 Bio: <b>${json.biodegradable}</b><br>
      🌍 Score: <b>${json.eco_score}/100</b>
    `;

    // Show result cards
    productInput.value = json.identified_item;  // fill input with object name
    analyzeProduct();                          // get REAL eco score from OpenAI


  } catch (e) {
    if (scanning) {
      liveStatus.innerHTML = "⚠ Could not detect the object.";
    }
  }
}




// /* ========= OPENAI ECO SCORE ANALYSIS ========= */
// const SYSTEM_PROMPT = `
// You are EcoLens — an environmental sustainability and materials expert.

// Your ONLY task is to analyze the given item and return STRICT JSON.

// 🔒 RULES
// • Return ONLY VALID JSON.
// • NO extra text.
// • No markdown.
// • All keys MUST exist exactly as shown.
// • eco_score MUST be a number (0–100).

// 📘 JSON FORMAT
// {
//   "responsible_usage": "",
//   "disposal_method": "",
//   "reuse_ideas": "",
//   "harm_minimization": "",
//   "alternatives": "",
//   "biodegradable_advice": "",
//   "eco_score": 0
// }

// 🎯 ECO SCORE RULES
// • 90-100 → Extremely eco-friendly, natural, biodegradable
// • 70-89 → Highly sustainable, recyclable materials
// • 40-69 → Medium impact items (paper, textiles, etc.)
// • 1-39 → High-impact waste (plastics, synthetic materials, e-waste)
// • 0 → Toxic, hazardous, chemical waste

// 🟢 BIODEGRADABLE ADVICE
// • If biodegradable → give decomposition time + safe disposal
// • If NOT biodegradable → say “not biodegradable” + safe disposal method

// STRICTLY follow the JSON shape.
// `;


analyzeBtn.addEventListener("click", analyzeProduct);

const CATEGORY_EXAMPLES = {
  "plastic": "plastic bottle",
  "plastic waste": "plastic bottle",
  "ewaste": "old laptop",
  "e waste": "old laptop",
  "paper": "paper cup",
  "glass": "glass jar",
  "metal": "aluminium can",
  "organic": "banana peel",
  "biodegradable": "banana peel",
  "hazardous": "battery",
  "battery": "battery",
  "textile": "cotton cloth"
};


productInput.addEventListener("keydown", e => {
  if (e.key === "Enter") analyzeProduct();
});


async function analyzeProduct() {
  const product = productInput.value.trim();
  if (!product) return alert("Enter a product name");

  loadingEl.style.display = "flex";
  analyzeBtn.disabled = true;

  try {
    const res = await fetch("/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product })
    });

    const data = await res.json();

    if (!data.success) {
      alert(data.error || "Analysis failed");
      return;
    }

    let json;
    try {
      json = JSON.parse(data.result);
    } catch {
      const s = data.result.indexOf("{");
      const e = data.result.lastIndexOf("}");
      if (s === -1 || e === -1) {
        throw new Error("Invalid AI response");
      }
      json = JSON.parse(data.result.slice(s, e + 1));
    }

    renderResult(product, json);

  } catch (err) {
    console.error(err);
    alert("Server error or AI quota exceeded");
  } finally {
    loadingEl.style.display = "none";
    analyzeBtn.disabled = false;
  }
}

/* ========= RENDER RESULT ========= */
function escapeHTML(str) {
  return (str || "")
    .toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function renderResult(product, json) {
  const ecoScore = json.eco_score ?? "—";

  scoreCard.style.display = "block";
  scoreCard.innerHTML = `
    <div class="score-number">${ecoScore}/100</div>
    <div style="margin-top:8px;color:var(--muted)">${product}</div>
  `;
// imp imp impn 
  resultCards.innerHTML = `
    <div class="card"><strong>🌱 Responsible Usage</strong><div>${escapeHTML(json.responsible_usage)}</div></div>
    <div class="card"><strong>🚮 Disposal Method</strong><div>${escapeHTML(json.disposal_method)}</div></div>
    <div class="card"><strong>🔁 Reuse Ideas</strong><div>${escapeHTML(json.reuse_ideas)}</div></div>
    <div class="card"><strong>⚠ Harm Minimization</strong><div>${escapeHTML(json.harm_minimization)}</div></div>
    <div class="card"><strong>🌿 Alternatives</strong><div>${escapeHTML(json.alternatives)}</div></div>
    <div class="card"><strong>🌍 Biodegradable Info</strong><div>${escapeHTML(json.biodegradable_advice)}</div></div>
  `;

  document.getElementById("reportArea").scrollIntoView({ behavior: "smooth" });
}

/* ========= PDF DOWNLOAD ========= */
downloadBtn.addEventListener("click", () => {
  html2pdf()
    .from(document.getElementById("reportArea"))
    .set({
      margin: 0.4,
      filename: "ecolens_report.pdf",
      jsPDF: { format: "a4" }
    })
    .save();
});

/* ========= VOICE INPUT ========= */
document.getElementById("voiceBtn").addEventListener("click", () => {
  if (!("webkitSpeechRecognition" in window))
    return alert("Browser doesn't support voice input");

  const rec = new webkitSpeechRecognition();
  rec.lang = "en-US";
  rec.start();

  rec.onresult = e => {
    productInput.value = e.results[0][0].transcript;
    suggestionsEl.style.display = "none";
  };
});

/* ========= CAMERA SCAN ========= */
async function scanFrame() {
   if (!scanning) return;  // 🔥 stops loop when stopped

   if (!liveCam.srcObject) {
    requestAnimationFrame(scanFrame);
    return;
  }

   // Wait for actual video size
   if (liveCam.videoWidth < 10 || liveCam.videoHeight < 10) {
     requestAnimationFrame(scanFrame);
     return;
   }

   const now = Date.now();
   if (now - lastScanTime >= 1200) {
     lastScanTime = now;

//     // Capture REAL image
     const tempCanvas = document.createElement("canvas");
     tempCanvas.width = liveCam.videoWidth;
     tempCanvas.height = liveCam.videoHeight;

     const ctx = tempCanvas.getContext("2d");
     ctx.drawImage(liveCam, 0, 0, tempCanvas.width, tempCanvas.height);

     const frame = tempCanvas.toDataURL("image/jpeg", 1.0);


     detectWaste(frame);
   }

   requestAnimationFrame(scanFrame);
 }


 startScanBtn.addEventListener("click", async () => {
   scanning = true;
   liveStatus.innerHTML = "📷 Starting camera...";

   videoStream = await navigator.mediaDevices.getUserMedia({ video: true });

   liveCam.srcObject = videoStream;
   liveCam.play();  // 🔥 IMPORTANT

   liveCam.onloadedmetadata = () => {
     liveCam.style.display = "block";
     startScanBtn.style.display = "none";
     stopScanBtn.style.display = "inline-block";

     scanFrame();   // 🔥 Start scanning only after video is ready
   };
 });



 stopScanBtn.addEventListener("click", () => {
   scanning = false;         // 🔥 stop scanning

   if (videoStream) videoStream.getTracks().forEach(t => t.stop());
  
   liveCam.style.display = "none";
      liveStatus.innerHTML = "";

     stopScanBtn.style.display = "none";
   startScanBtn.style.display = "inline-block";
 });


/* ======= INIT ======= */
window.addEventListener("load", () => {
  document.querySelectorAll(".reveal").forEach(el => el.classList.add("show"));
});

// login and sign u system 
// SIGNUP
const signupForm = document.getElementById("signupForm");
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const res = await fetch("/register", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        username: document.getElementById("username").value,
        email: document.getElementById("email").value,
        password: document.getElementById("password").value
      })
    });

    const data = await res.json();

    if (data.success) {
      window.location.href = "/login";
    } else {
      document.getElementById("msg").innerText = data.error;
    }
  });
}

// LOGIN
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const res = await fetch("/login-user", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        email: document.getElementById("email").value,
        password: document.getElementById("password").value
      })
    });

    const data = await res.json();

    if (data.success) {
      window.location.href = "/dashboard";
    } else {
      document.getElementById("msg").innerText = data.error;
    }
  });
}