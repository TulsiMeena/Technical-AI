// --- Configuration ---
// Note: This API Key is already integrated for JavaScript
const CONFIG = {
    API_KEY: "sk-mSwKeMe2E4FqmPTVsCoZ7Keo0P8lL3FhtSy2CpHHLSqDz3YL",
    BASE_URL: "https://api.chatanywhere.tech/v1/chat/completions",
    MODEL: "gpt-4o-mini"
};

// --- State Management ---
let currentChatId = Date.now().toString();
let chats = JSON.parse(localStorage.getItem('amit_ai_chats')) || {};
let currentTheme = localStorage.getItem('amit_ai_theme') || 'slate';
let currentLanguage = localStorage.getItem('amit_ai_lang') || 'en';

// --- Auth State ---
let users = JSON.parse(localStorage.getItem('amit_ai_users')) || {}; // Registered users (Permanent)
let currentUser = JSON.parse(sessionStorage.getItem('amit_ai_session')) || null; // Active session (Tab Only)
let tempSignupData = null; // Stores data pending verification

const ADMIN_CREDENTIALS = {
    email: 'admin@technical01.ai',
    password: 'Technical@123'
};

const EMAILJS_CONFIG = {
    SERVICE_ID: "YOUR_SERVICE_ID", // Replace with your Service ID
    TEMPLATE_ID: "YOUR_TEMPLATE_ID", // Replace with your Template ID
    PUBLIC_KEY: "YOUR_PUBLIC_KEY"    // Replace with your Public Key
};

const TRANSLATIONS = {
    en: {
        history: "History",
        navigation: "Navigation",
        nav_chat: "Current Chat",
        nav_about: "About Me",
        nav_privacy: "Privacy Policy",
        nav_contact: "Contact Us",
        system_ready: "System Ready",
        input_placeholder: "Ask Amit AI anything...",
        footer: "Powered by GPT-4o Mini • Amit Meena AI",
        code_studio: "Code Studio",
        run_code: "Run",
        close: "Close"
    },
    hi: {
        history: "इतिहास (History)",
        navigation: "नेविगेशन (Navigation)",
        nav_chat: "वर्तमान चैट (Chat)",
        nav_about: "मेरे बारे में (About)",
        nav_privacy: "गोपनीयता नीति (Privacy)",
        nav_contact: "संपर्क करें (Contact)",
        system_ready: "सिस्टम तैयार है",
        input_placeholder: "अमित एआई से कुछ भी पूछें...",
        footer: "GPT-4o Mini द्वारा संचालित • अमित मीना AI",
        code_studio: "कोड स्टूडियो (Code Studio)",
        run_code: "चलाएं (Run)",
        close: "बंद करें (Close)"
    }
};

// --- Language Logic ---
function setLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('amit_ai_lang', lang);
    
    // Update Text Content
    const t = TRANSLATIONS[lang];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) el.innerText = t[key];
    });

    // Update Placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (t[key]) el.placeholder = t[key];
    });

    // Update Buttons UI
    const btnEn = document.getElementById('lang-en');
    const btnHi = document.getElementById('lang-hi');
    
    if (lang === 'en') {
        btnEn.className = "px-3 py-1 text-[10px] rounded-md transition-all bg-blue-600 text-white font-bold uppercase tracking-wider btn-smokey";
        btnHi.className = "px-3 py-1 text-[10px] rounded-md transition-all text-slate-400 font-bold uppercase tracking-wider hover:bg-slate-700";
    } else {
        btnHi.className = "px-3 py-1 text-[10px] rounded-md transition-all bg-blue-600 text-white font-bold uppercase tracking-wider btn-smokey";
        btnEn.className = "px-3 py-1 text-[10px] rounded-md transition-all text-slate-400 font-bold uppercase tracking-wider hover:bg-slate-700";
    }
}

// --- Theme Logic ---
function setTheme(theme) {
    document.body.className = `theme-${theme} text-slate-200 h-screen flex flex-col md:flex-row overflow-hidden`;
    localStorage.setItem('amit_ai_theme', theme);
}

// --- Navigation Logic ---
function showPage(pageId) {
    // If opening Code Studio, handle flex specifically
    const codePage = document.getElementById('page-code-studio');
    const chatPage = document.getElementById('page-chat');

    document.querySelectorAll('.page-content').forEach(page => {
        page.classList.add('hidden');
        page.classList.remove('flex'); // Remove flex from all initially
    });

    const target = document.getElementById(`page-${pageId}`);
    target.classList.remove('hidden');
    if (pageId === 'code-studio' || pageId === 'chat') {
        target.classList.add('flex'); // Restore flex for layout
    }
    
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    const activeLink = document.getElementById(`nav-${pageId}`);
    if(activeLink) activeLink.classList.add('active');

    // Feature Triggers
    if (pageId === 'about') renderCommunity();
    if (pageId === 'admin') renderAdminUserList();
}

function renderCommunity() {
    const container = document.getElementById('community-section');
    if (!container) return;

    container.innerHTML = '';
    const userList = Object.values(users);

    if (userList.length === 0) {
        container.innerHTML = '<p class="text-xs text-slate-500 col-span-3">No members yet.</p>';
        return;
    }

    userList.forEach(u => {
        const img = u.profilePic || 'https://via.placeholder.com/150';
        const div = document.createElement('div');
        div.className = "flex flex-col items-center space-y-2 p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors";
        div.innerHTML = `
            <img src="${img}" class="w-10 h-10 rounded-full object-cover border border-white/10">
            <span class="text-[10px] text-slate-300 truncate w-full text-center">${u.name.split(' ')[0]}</span>
        `;
        container.appendChild(div);
    });
}

// --- Code Studio Logic ---
function openCodeStudio(code = '') {
    const editor = document.getElementById('code-editor');
    if (code) {
        editor.value = code;
        runCode(); // Auto run
    }
    showPage('code-studio');
}

function runCode() {
    const code = document.getElementById('code-editor').value;
    const preview = document.getElementById('code-preview');
    const doc = preview.contentDocument || preview.contentWindow.document;

    doc.open();
    doc.write(code);
    doc.close();
}

function extractAndRunCode(btn) {
    // Find the message content div
    const contentDiv = btn.closest('.group').querySelector('.message-content');
    const fullText = contentDiv.innerText;

    // Simple regex to find code blocks.
    // Prioritize HTML/CSS/JS, but fallback to any block
    const codeBlockRegex = /```(?:html|css|js|javascript)?\n([\s\S]*?)```/i;
    const match = fullText.match(codeBlockRegex);

    if (match && match[1]) {
        openCodeStudio(match[1].trim());
    } else {
        alert("No valid code block found to run.");
    }
}

// --- Chat History Logic ---
function saveChats() {
    localStorage.setItem('amit_ai_chats', JSON.stringify(chats));
    renderHistory();
}

function createNewChat() {
    currentChatId = Date.now().toString();
    chats[currentChatId] = {
        title: "New Chat",
        messages: [],
        timestamp: Date.now()
    };
    saveChats();
    loadChat(currentChatId);
}

function loadChat(id) {
    currentChatId = id;
    const chat = chats[id];
    document.getElementById('current-chat-title').innerText = chat.title;
    const messagesContainer = document.getElementById('chat-messages');
    messagesContainer.innerHTML = '';
    
    if (chat.messages.length === 0) {
        addInitialMessage();
    } else {
        chat.messages.forEach(msg => injectMessage(msg.text, msg.isUser, false));
    }
    showPage('chat');
}

function renameCurrentChat() {
    const newTitle = prompt("Enter new chat name:", chats[currentChatId].title);
    if (newTitle) {
        chats[currentChatId].title = newTitle;
        document.getElementById('current-chat-title').innerText = newTitle;
        saveChats();
    }
}

function renderHistory() {
    const list = document.getElementById('chat-history-list');
    list.innerHTML = '';
    Object.keys(chats).sort((a, b) => chats[b].timestamp - chats[a].timestamp).forEach(id => {
        const item = document.createElement('div');
        item.className = `w-full flex items-center justify-between p-3 rounded-xl transition-all hover:bg-white/5 text-sm group ${id === currentChatId ? 'bg-white/10 text-white' : 'text-slate-400'}`;
        item.innerHTML = `
            <div class="flex items-center space-x-3 overflow-hidden cursor-pointer flex-1" onclick="loadChat('${id}')">
                <i class="fas fa-comment-alt opacity-50"></i>
                <span class="truncate">${chats[id].title}</span>
            </div>
            <button onclick="deleteChat('${id}')" class="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-opacity">
                <i class="fas fa-trash-alt text-[10px]"></i>
            </button>
        `;
        list.appendChild(item);
    });
}

function deleteChat(id) {
    if (confirm("Delete this chat?")) {
        delete chats[id];
        if (id === currentChatId) {
            createNewChat();
        } else {
            saveChats();
        }
    }
}

// --- Camera Logic ---
let isCameraActive = false;
let videoStream = null;

async function startCamera() {
    try {
        const video = document.getElementById('camera-feed');
        // Prefer rear camera (environment) but fallback to user
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" }
        });

        videoStream = stream;
        video.srcObject = stream;

        document.getElementById('camera-container').classList.remove('hidden');
        document.getElementById('camera-btn').innerHTML = '<i class="fas fa-video-slash text-red-500 animate-pulse"></i>';
        isCameraActive = true;

        // Notify user
        injectMessage("Camera activated! You can now ask me about what you see.", false, false);
    } catch (err) {
        console.error("Camera Error:", err);
        alert("Could not access camera. Please check permissions.");
    }
}

function stopCamera() {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }

    document.getElementById('camera-container').classList.add('hidden');
    document.getElementById('camera-btn').innerHTML = '<i class="fas fa-video"></i>';
    isCameraActive = false;
}

function captureFrame() {
    if (!isCameraActive || !videoStream) return null;

    const video = document.getElementById('camera-feed');
    const canvas = document.getElementById('camera-canvas');
    const context = canvas.getContext('2d');

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current frame
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Return base64 image data
    return canvas.toDataURL('image/jpeg');
}

document.getElementById('camera-btn')?.addEventListener('click', () => {
    if (isCameraActive) {
        stopCamera();
    } else {
        startCamera();
    }
});

document.getElementById('close-camera')?.addEventListener('click', stopCamera);

// --- Screen Sharing Logic ---
async function startScreenShare() {
    try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const video = document.createElement('video');
        video.srcObject = stream;
        video.play();

        // Wait for video to load metadata
        video.onloadedmetadata = () => {
             // Capture frame immediately
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            const base64 = canvas.toDataURL('image/jpeg');

            // Inject into chat flow
            pendingAttachment = { type: 'image', content: base64 };
            injectMessage("[Screen Capture Ready]", true);
            injectMessage("I see your screen. What would you like to know?", false);

            // Stop stream immediately after capture
            stream.getTracks().forEach(track => track.stop());
        };

    } catch (err) {
        console.error("Screen Share Error:", err);
        alert("Screen sharing cancelled or failed.");
    }
}

// --- Voice Logic ---
let isListening = false;
// Fix: Use correct browser prefixes and ensure context
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;
const synth = window.speechSynthesis;

if (recognition) {
    recognition.continuous = false;
    recognition.interimResults = true; // Changed to true for smooth real-time feedback
    
    recognition.onstart = () => {
        isListening = true;
        const voiceBtn = document.getElementById('voice-btn');
        if (voiceBtn) voiceBtn.innerHTML = '<i class="fas fa-microphone text-red-500 animate-pulse"></i>';
        if (synth) synth.cancel();
    };

    recognition.onend = () => {
        isListening = false;
        const voiceBtn = document.getElementById('voice-btn');
        if (voiceBtn) voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        isListening = false;
        const voiceBtn = document.getElementById('voice-btn');
        if (voiceBtn) voiceBtn.innerHTML = '<i class="fas fa-microphone-slash text-red-500"></i>';
    };

    recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }

        const userInput = document.getElementById('user-input');
        if (userInput) {
            // Show whatever we have so far
            userInput.value = finalTranscript || interimTranscript;

            // If we have a final result, submit it
            if (finalTranscript) {
                const chatForm = document.getElementById('chat-form');
                if (chatForm) {
                    const submitEvent = new Event('submit', { cancelable: true, bubbles: true });
                    chatForm.dispatchEvent(submitEvent);
                }
            }
        }
    };
}

// --- Voice Selection & Sentiment ---
function getBestVoice(lang) {
    const voices = synth.getVoices();
    // Priority list for more natural voices
    const preferredNames = ['Google', 'Microsoft', 'Natural'];

    // Filter by language
    const langVoices = voices.filter(v => v.lang.startsWith(lang));

    // Try to find a preferred voice
    for (const name of preferredNames) {
        const best = langVoices.find(v => v.name.includes(name));
        if (best) return best;
    }

    return langVoices[0] || voices[0];
}

function getSentimentSettings(text) {
    const lowerText = text.toLowerCase();

    // Basic Sentiment Keywords
    const sadWords = ['sorry', 'apologize', 'sad', 'unfortunate', 'regret', 'maafi', 'dukhi', 'afsos'];
    const happyWords = ['great', 'awesome', 'happy', 'glad', 'congratulations', 'badhai', 'khushi', 'shandaar'];
    const angryWords = ['wrong', 'error', 'stop', 'failed', 'galt', 'bekaar', 'kharaab'];

    if (sadWords.some(w => lowerText.includes(w))) {
        return { rate: 0.9, pitch: 0.8 }; // Slower, lower pitch for sadness
    }
    if (happyWords.some(w => lowerText.includes(w))) {
        return { rate: 1.1, pitch: 1.2 }; // Faster, higher pitch for excitement
    }
    if (angryWords.some(w => lowerText.includes(w))) {
        return { rate: 1.2, pitch: 0.9 }; // Faster, slightly lower/aggressive
    }

    return { rate: 1.0, pitch: 1.0 }; // Neutral
}

function speakText(text) {
    if (!synth) return;
    
    // Web Speech API requires user interaction or specific timing in some browsers
    // We cancel first to ensure a clean state
    synth.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    const langCode = currentLanguage === 'hi' ? 'hi' : 'en';
    utterance.lang = currentLanguage === 'hi' ? 'hi-IN' : 'en-US';

    // Apply "Smart" Voice Settings
    const voice = getBestVoice(langCode);
    if (voice) utterance.voice = voice;

    const sentiment = getSentimentSettings(text);
    utterance.rate = sentiment.rate;
    utterance.pitch = sentiment.pitch;
    
    // Add event listeners for debugging and smoother flow
    utterance.onerror = (e) => console.error("Speech synthesis error", e);
    
    synth.speak(utterance);
}

// Load voices immediately so they are ready
if (synth.onvoiceschanged !== undefined) {
    synth.onvoiceschanged = populateVoiceList;
}

// --- Voice Settings Logic ---
let selectedVoiceIndex = -1;

function populateVoiceList() {
    const voices = synth.getVoices();
    const select = document.getElementById('voice-select');
    if (!select) return;

    select.innerHTML = '<option value="-1">Auto-Detect Best Voice</option>';

    voices.forEach((voice, index) => {
        const option = document.createElement('option');
        option.textContent = `${voice.name} (${voice.lang})`;
        option.value = index;

        // Mark high quality voices visually
        if (voice.name.includes('Google') || voice.name.includes('Microsoft')) {
            option.style.fontWeight = 'bold';
            option.textContent += ' ⭐';
        }

        select.appendChild(option);
    });
}

function toggleVoicePanel() {
    const panel = document.getElementById('voice-panel');
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) {
        populateVoiceList();
    }
}

// Update voice when changed in dropdown
document.getElementById('voice-select')?.addEventListener('change', (e) => {
    selectedVoiceIndex = parseInt(e.target.value);
});

// --- Chat Interface Logic ---
function addInitialMessage() {
    injectMessage("Namaste! Main Amit Meena ka AI assistant hoon. Main aapki kaise madad kar sakta hoon?", false, false);
}

function injectMessage(text, isUser = false, save = true) {
    if (save) {
        if (!isUser) speakText(text); // Speak AI response
        if (!chats[currentChatId]) {
            chats[currentChatId] = { title: "New Chat", messages: [], timestamp: Date.now() };
        }
        chats[currentChatId].messages.push({ text, isUser });
        chats[currentChatId].timestamp = Date.now();
        saveChats();
    }

    const messagesContainer = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `max-w-3xl mx-auto flex space-x-4 message-anim ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`;
    
    const iconBg = isUser ? 'bg-slate-700' : 'bg-blue-600';
    const icon = isUser ? 'fa-user' : 'fa-robot';

    let actionsHtml = '';
    if (!isUser) {
        const hasCode = text.includes('```');
        const codeBtn = hasCode ? `
            <button onclick="extractAndRunCode(this)" class="text-[10px] text-slate-500 hover:text-green-400 flex items-center space-x-1">
                <i class="fas fa-code"></i> <span>Run Code</span>
            </button>
        ` : '';

        actionsHtml = `
            <div class="flex items-center space-x-3 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onclick="copyToClipboard(this)" class="text-[10px] text-slate-500 hover:text-blue-400 flex items-center space-x-1">
                    <i class="fas fa-copy"></i> <span>Copy</span>
                </button>
                ${codeBtn}
                <button onclick="shareResponse('${text.replace(/'/g, "\\'")}')" class="text-[10px] text-slate-500 hover:text-blue-400 flex items-center space-x-1">
                    <i class="fas fa-share-alt"></i> <span>Share</span>
                </button>
                <button onclick="toggleLike(this)" class="text-[10px] text-slate-500 hover:text-pink-400 flex items-center space-x-1">
                    <i class="far fa-heart"></i> <span>Like</span>
                </button>
            </div>
        `;
    }

    // Special handling for Amit Meena's creation message to include his photo
    let specialContent = '';
    if (!isUser && (text.includes("Mujhe Amit Meena ne banaya hai") || text.includes("Amit Meena ek professional Web Designer"))) {
        specialContent = `
            <div class="mt-4 p-2 bg-blue-600/10 border border-blue-500/20 rounded-2xl overflow-hidden">
                <img src="https://raw.githubusercontent.com/Amitmeena55/Aman-Meena-/main/Amit%20meena.jpg" alt="Amit Meena" class="w-full h-auto rounded-xl shadow-lg border border-white/10 transform hover:scale-[1.02] transition-transform">
                <p class="text-[10px] text-center mt-2 text-blue-400 font-bold uppercase tracking-widest">Amit Meena - Web & Logo Designer</p>
            </div>
        `;
    } else if (!isUser && text.includes("Aman Meena Technical 01 ke Malik hain")) {
        specialContent = `
            <div class="mt-4 p-2 bg-pink-600/10 border border-pink-500/20 rounded-2xl overflow-hidden space-y-4">
                <div class="flex gap-2">
                    <img src="https://raw.githubusercontent.com/Amitmeena55/Aman-Meena-/main/aman3.jpg" alt="Aman Meena" class="w-1/2 h-auto rounded-xl shadow-lg border border-white/10 transform hover:scale-[1.02] transition-transform">
                    <img src="https://raw.githubusercontent.com/Amitmeena55/Aman-Meena-/main/Technical_01.jpg" alt="Technical 01 Logo" class="w-1/2 h-auto rounded-xl shadow-lg border border-white/10 transform hover:scale-[1.02] transition-transform">
                </div>
                <div class="bg-black/20 p-3 rounded-xl border border-white/5">
                    <p class="text-[10px] text-pink-400 font-bold uppercase tracking-widest mb-1">Technical 01 - Business Info</p>
                    <p class="text-xs text-slate-400 leading-relaxed italic">
                        Technical 01 sirf ek channel nahi, ek trusted community hai jo Amazon ke verified aur curated projects provide karti hai. Iska mission digital shopping ko asaan aur profitable banana hai.
                    </p>
                </div>
                <p class="text-[10px] text-center text-pink-400 font-bold uppercase tracking-widest">Aman Meena (Owner) & Technical 01 Logo</p>
            </div>
        `;
    }

    // Format text (Basic Markdown for Code Blocks)
    let formattedText = text;

    // Split by code blocks
    const parts = text.split(/(```[\s\S]*?```)/g);
    formattedText = parts.map(part => {
        if (part.startsWith('```')) {
            // It's a code block
            const match = part.match(/```(\w*)\n?([\s\S]*?)```/);
            if (match) {
                const lang = match[1] || 'plaintext';
                const code = match[2];
                return `<pre><code class="language-${lang} text-xs sm:text-sm custom-scrollbar rounded-lg my-2">${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`;
            }
            return part;
        } else {
            // Regular text
            return part.replace(/\n/g, '<br>');
        }
    }).join('');

    messageDiv.innerHTML = `
        <div class="w-8 h-8 rounded bg-opacity-90 ${iconBg} flex items-center justify-center shrink-0 shadow-lg">
            <i class="fas ${icon} text-xs text-white"></i>
        </div>
        <div class="flex-1 group">
            <div class="prose prose-invert max-w-none text-slate-300 leading-relaxed message-content bg-white/5 p-4 rounded-2xl border border-white/5">
                ${formattedText}
                ${specialContent}
            </div>
            ${actionsHtml}
        </div>
    `;
    
    messagesContainer.appendChild(messageDiv);

    // Apply highlighting
    if (window.hljs) {
        messageDiv.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });
    }
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// --- Action Helpers ---
function copyToClipboard(btn) {
    const text = btn.closest('.group').querySelector('.message-content').innerText;
    navigator.clipboard.writeText(text).then(() => {
        const original = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check text-green-500"></i> <span class="text-green-500">Copied!</span>';
        setTimeout(() => btn.innerHTML = original, 2000);
    });
}

function shareResponse(text) {
    if (navigator.share) {
        navigator.share({ title: 'Amit AI Response', text: text });
    } else {
        alert("Sharing not supported in this browser. Link copied instead.");
        navigator.clipboard.writeText(text);
    }
}

function toggleLike(btn) {
    const icon = btn.querySelector('i');
    if (icon.classList.contains('far')) {
        icon.className = 'fas fa-heart text-pink-500';
    } else {
        icon.className = 'far fa-heart';
    }
}

// --- Image Generation ---
function generateImage(prompt) {
    const encodedPrompt = encodeURIComponent(prompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}`;

    const container = document.createElement('div');
    container.className = "max-w-3xl mx-auto flex space-x-4 message-anim";
    container.innerHTML = `
        <div class="w-8 h-8 rounded bg-opacity-90 bg-blue-600 flex items-center justify-center shrink-0 shadow-lg">
            <i class="fas fa-paint-brush text-xs text-white"></i>
        </div>
        <div class="flex-1">
            <div class="bg-white/5 p-2 rounded-2xl border border-white/5 inline-block">
                <img src="${imageUrl}" alt="${prompt}" class="rounded-xl shadow-lg max-w-full md:max-w-sm h-auto" loading="lazy">
                <div class="flex justify-between items-center mt-2 px-1">
                    <span class="text-xs text-slate-400 italic truncate w-48">${prompt}</span>
                    <a href="${imageUrl}" download="generated-image.jpg" target="_blank" class="text-xs text-blue-400 hover:text-white transition-colors">
                        <i class="fas fa-download"></i> Download
                    </a>
                </div>
            </div>
        </div>
    `;

    document.getElementById('chat-messages').appendChild(container);
    document.getElementById('chat-messages').scrollTop = document.getElementById('chat-messages').scrollHeight;
}

// --- API Integration ---
async function fetchAIResponse(message, imageBase64 = null) {
    try {
        const langInstruction = currentLanguage === 'hi' 
            ? " Please respond in Hindi." 
            : " Please respond in English.";

        let userContent;

        if (imageBase64) {
            // Multimodal request (Vision)
            userContent = [
                { type: "text", text: message },
                {
                    type: "image_url",
                    image_url: {
                        url: imageBase64
                    }
                }
            ];
        } else {
            // Text-only request
            userContent = message;
        }

        const response = await fetch(CONFIG.BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.API_KEY}`
            },
            body: JSON.stringify({
                model: CONFIG.MODEL,
                messages: [
                    { 
                        role: "system", 
                        content: `You are a helpful assistant for Amit Meena's platform. ${langInstruction}
                        CRITICAL INSTRUCTIONS:
                        - If you respond in Hindi, you MUST use Shuddh (pure) Hindi with proper grammar and formal vocabulary where possible.
                        - If anyone asks who created or developed you (in any language like English or Hindi), you MUST answer: "Mujhe Amit Meena ne banaya hai. Amit Meena Web Design, Web Development, aur Logo Design ke expert hain (Sapotra Mod)."
                        - If anyone asks about "Aman Meena", you MUST answer: "Aman Meena Technical 01 ke Malik hain. Unka channel Amazon ke projects aur deals ki links WhatsApp channel ke madhyam se logon tak pahunchata hai. Unke channel saare platforms par maujood hain. Adress: India, Jaipur, Karauli, Sapotra Mod."
                        - If anyone asks "Amit Meena kaun hai", answer: "Amit Meena ek professional Web Designer, Web Developer, aur Logo Design expert hain (Sapotra Mod). Unhone hi mujhe (is AI ko) banaya hai."
                        - Never mention OpenAI or any other company as your creator.`
                    },
                    { role: "user", content: userContent }
                ]
            })
        });
        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error("API Error:", error);
        return "Sorry, connection error. Please try again.";
    }
}

// --- PDF & File Logic ---
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

async function readPDF(file) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += `\n--- Page ${i} ---\n${pageText}`;
        }
        return fullText;
    } catch (e) {
        console.error("PDF Error:", e);
        return null;
    }
}

// --- Event Listeners ---
const chatFormElement = document.getElementById('chat-form');
const voiceBtn = document.getElementById('voice-btn');
const fileUpload = document.getElementById('file-upload');
let pendingAttachment = null; // Stores { type: 'image'|'text', content: ... }

if (fileUpload) {
    fileUpload.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        injectMessage(`[Uploading: ${file.name}...]`, true);

        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                pendingAttachment = { type: 'image', content: e.target.result };
                injectMessage("Image ready. Ask me about it!", false);
            };
            reader.readAsDataURL(file);
        }
        else if (file.type === 'application/pdf') {
            const text = await readPDF(file);
            if (text) {
                pendingAttachment = { type: 'text', content: text, name: file.name };
                injectMessage("PDF loaded successfully. You can ask questions about its content.", false);
            } else {
                injectMessage("Failed to read PDF.", false);
            }
        }
        else if (file.type === 'text/plain') {
            const text = await file.text();
            pendingAttachment = { type: 'text', content: text, name: file.name };
            injectMessage("Text file loaded.", false);
        }
    });
}

console.log("Voice support check:", !!recognition);

if (voiceBtn) {
    // Re-bind to ensure it works after potential DOM changes
    const bindMic = () => {
        if (recognition) {
            voiceBtn.style.display = 'block';
            voiceBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isListening) {
                    recognition.stop();
                } else {
                    try {
                        recognition.lang = currentLanguage === 'hi' ? 'hi-IN' : 'en-US';
                        recognition.start();
                    } catch (err) {
                        console.error("Mic start error:", err);
                        recognition.stop();
                    }
                }
            };
        } else {
            voiceBtn.innerHTML = '<i class="fas fa-microphone-slash text-slate-700" title="Not Supported"></i>';
        }
    };
    bindMic();
}

if (chatFormElement) {
    chatFormElement.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('user-input');
        let message = input.value.trim();

        // Check if we have anything to send
        if (!message && !isCameraActive && !pendingAttachment) return;

        // Handle "Image Generation" commands specifically
        if (message.toLowerCase().startsWith('/image') || message.toLowerCase().startsWith('generate image')) {
            const prompt = message.replace(/^\/image|generate image/i, '').trim();
            if (prompt) {
                injectMessage(message, true);
                input.value = '';
                generateImage(prompt); // Call image generation
                return;
            }
        }

        // Handle File Content Injection (PDF/Text)
        if (pendingAttachment && pendingAttachment.type === 'text') {
            message = `[Context from file ${pendingAttachment.name}]:\n${pendingAttachment.content}\n\nUser Question: ${message}`;
        }

        // Handle Images
        let imageToSend = null;
        if (pendingAttachment && pendingAttachment.type === 'image') {
            imageToSend = pendingAttachment.content;
        }

        // Camera overrides upload
        if (isCameraActive) {
            imageToSend = captureFrame();
            injectMessage(`<img src="${imageToSend}" class="w-32 h-24 object-cover rounded-lg border border-white/20 mb-2"><br>${message}`, true);
        } else {
             // For user display, we don't show the massive PDF text, just the question
             // But if it's just text, we show it.
             // If we appended file context, strip it for the UI log to keep it clean?
             // Nah, let's just log the user input for now or short version.
             // Actually, showing the full context might spam the chat.
             // Let's just show the original input value in the chat bubble.
             injectMessage(input.value.trim() || "(Sending attachment data...)", true);
        }

        const rawInput = input.value; // Store for restore if failed? No need.
        input.value = '';

        // Reset state
        pendingAttachment = null;
        if(fileUpload) fileUpload.value = '';

        synth.cancel();
        
        // Typing indicator
        const messagesContainer = document.getElementById('chat-messages');
        const typing = document.createElement('div');
        typing.id = 'typing';
        typing.className = 'max-w-3xl mx-auto flex space-x-4 p-2 opacity-50';
        typing.innerHTML = '<i class="fas fa-robot animate-pulse"></i> <span class="text-xs italic">Thinking...</span>';
        messagesContainer.appendChild(typing);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        const response = await fetchAIResponse(message, imageToSend);
        const typingIndicator = document.getElementById('typing');
        if (typingIndicator) typingIndicator.remove();
        injectMessage(response, false);
        
        // Auto-scroll after AI response
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
}

function shareWebsite() {
    const url = window.location.href;
    const title = "Technical AI - Amit Meena";
    if (navigator.share) {
        navigator.share({ title, url }).catch(console.error);
    } else {
        navigator.clipboard.writeText(url).then(() => {
            alert("Website link copied to clipboard!");
        });
    }
}

// --- Init ---
window.onload = () => {
    checkSession(); // Auth Check
    setTheme(currentTheme);
    setLanguage(currentLanguage);
    if (Object.keys(chats).length === 0) createNewChat();
    else loadChat(Object.keys(chats).sort((a,b) => chats[b].timestamp - chats[a].timestamp)[0]);
    renderHistory();
};

// --- Auth Logic (Mock System) ---

function checkSession() {
    const authContainer = document.getElementById('auth-container');
    const appSidebar = document.getElementById('app-sidebar');
    const appMain = document.getElementById('app-main');

    if (currentUser) {
        // User logged in
        authContainer.classList.add('hidden');
        appSidebar.classList.remove('hidden');
        appMain.classList.remove('hidden');
        appMain.classList.add('flex');

        // Update Sidebar Name & Photo
        const userNameEl = appSidebar.querySelector('.p-6.border-t span.text-xs');
        const userImgEl = appSidebar.querySelector('.p-6.border-t img');

        if (userNameEl) userNameEl.innerText = currentUser.name;
        if (userImgEl && currentUser.profilePic) userImgEl.src = currentUser.profilePic;

        // Show Admin Nav if Admin
        const adminNav = document.getElementById('nav-admin');
        if (currentUser.role === 'admin') {
            adminNav.classList.remove('hidden');
        } else {
            adminNav.classList.add('hidden');
        }

        // Add Logout Button if not exists
        if (!document.getElementById('logout-btn')) {
            const logoutBtn = document.createElement('button');
            logoutBtn.id = 'logout-btn';
            logoutBtn.className = "ml-auto text-xs text-red-400 hover:text-red-300 font-bold uppercase tracking-wider";
            logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i>';
            logoutBtn.onclick = logout;
            userNameEl.parentElement.appendChild(logoutBtn);
        }

    } else {
        // User not logged in
        authContainer.classList.remove('hidden');
        appSidebar.classList.add('hidden');
        appMain.classList.add('hidden');
        appMain.classList.remove('flex');

        // Show Login by default
        showAuthPage('login');
    }
}

function showAuthPage(pageId) {
    document.querySelectorAll('.auth-page').forEach(p => p.classList.add('hidden'));
    document.getElementById(`page-${pageId}`).classList.remove('hidden');
}

function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    // Check Admin Login
    if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
        currentUser = {
            name: "Master Admin",
            email: email,
            role: "admin",
            profilePic: "https://cdn-icons-png.flaticon.com/512/2304/2304226.png"
        };
        sessionStorage.setItem('amit_ai_session', JSON.stringify(currentUser));
        checkSession();
        injectMessage(`Welcome, Master Admin. Full control unlocked.`, false, false);
        return;
    }

    const user = users[email];

    if (user && user.password === password) {
        currentUser = user;
        sessionStorage.setItem('amit_ai_session', JSON.stringify(currentUser));
        checkSession();
        injectMessage(`Welcome back, ${user.name}!`, false, false);
    } else {
        alert("Invalid Email or Password");
    }
}

// --- Admin Logic ---
function exportUserData() {
    const dataStr = JSON.stringify(users, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `technical_ai_users_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    alert("User database downloaded successfully.");
}

function renderAdminUserList() {
    const container = document.getElementById('admin-user-list');
    if (!container) return;

    container.innerHTML = '';
    Object.values(users).forEach(u => {
        const tr = document.createElement('tr');
        tr.className = "border-b border-white/5 hover:bg-white/5 transition-colors";
        tr.innerHTML = `
            <td class="p-3 flex items-center space-x-3">
                <img src="${u.profilePic || 'https://via.placeholder.com/150'}" class="w-8 h-8 rounded-full object-cover">
                <span>${u.name}</span>
            </td>
            <td class="p-3 text-slate-400">${u.email}</td>
            <td class="p-3"><span class="px-2 py-0.5 rounded text-[10px] uppercase font-bold ${u.role==='admin' ? 'bg-red-900/40 text-red-400' : 'bg-blue-900/40 text-blue-400'}">${u.role || 'user'}</span></td>
            <td class="p-3 font-mono text-xs text-slate-500">••••••••</td>
        `;
        container.appendChild(tr);
    });
}

async function verifyBiometric() {
    // 1. Try WebAuthn (Real Biometric) if available
    if (window.PublicKeyCredential) {
        try {
            // Simple assertion - usually triggers TouchID/FaceID/Windows Hello
            // Note: This requires a previously registered credential in a real app,
            // but for simulation we just trigger the UI if possible or mock it.
            // Since we don't have a backend to generate challenges, we'll use a visual simulation
            // which is more reliable for this static demo environment.
             await simulateBiometricScan();
             exportUserData();
        } catch (e) {
            console.error(e);
            alert("Biometric verification failed.");
        }
    } else {
        // Fallback Simulation
        await simulateBiometricScan();
        exportUserData();
    }
}

function simulateBiometricScan() {
    return new Promise((resolve) => {
        // Create Overlay
        const overlay = document.createElement('div');
        overlay.className = "fixed inset-0 z-[60] bg-black/80 flex flex-col items-center justify-center backdrop-blur-md";
        overlay.innerHTML = `
            <div class="relative w-24 h-24 mb-4">
                <div class="absolute inset-0 border-4 border-blue-500/30 rounded-full animate-pulse"></div>
                <div class="absolute inset-0 flex items-center justify-center">
                    <i class="fas fa-fingerprint text-5xl text-blue-500 animate-pulse"></i>
                </div>
                <div class="absolute inset-0 border-t-4 border-blue-400 rounded-full animate-spin" style="animation-duration: 2s;"></div>
            </div>
            <p class="text-white font-mono text-lg animate-pulse">Scanning Fingerprint...</p>
        `;
        document.body.appendChild(overlay);

        // Success Animation after 2s
        setTimeout(() => {
            overlay.innerHTML = `
                <div class="w-24 h-24 mb-4 bg-green-500/20 rounded-full flex items-center justify-center border border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.6)]">
                    <i class="fas fa-check text-4xl text-green-400"></i>
                </div>
                <p class="text-green-400 font-mono text-lg font-bold">Access Granted</p>
            `;

            setTimeout(() => {
                document.body.removeChild(overlay);
                resolve(true);
            }, 1000);
        }, 2000);
    });
}

// --- Signup Camera Logic ---
let signupVideoStream = null;
let capturedProfilePic = null;

async function startSignupCamera() {
    try {
        const video = document.getElementById('signup-video');
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        signupVideoStream = stream;
        video.srcObject = stream;
        video.classList.remove('hidden');
        document.getElementById('signup-camera-placeholder').classList.add('hidden');
        document.getElementById('btn-capture-signup').classList.remove('hidden');
    } catch (err) {
        console.error("Signup Camera Error:", err);
        alert("Could not access camera for profile photo.");
    }
}

function captureSignupPhoto() {
    if (!signupVideoStream) return;

    const video = document.getElementById('signup-video');
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300; // Square aspect for profile
    const ctx = canvas.getContext('2d');

    // Crop center square
    const size = Math.min(video.videoWidth, video.videoHeight);
    const startX = (video.videoWidth - size) / 2;
    const startY = (video.videoHeight - size) / 2;

    ctx.drawImage(video, startX, startY, size, size, 0, 0, canvas.width, canvas.height);

    capturedProfilePic = canvas.toDataURL('image/jpeg');

    // Show Preview
    const preview = document.getElementById('signup-photo-preview');
    preview.src = capturedProfilePic;
    preview.classList.remove('hidden');
    video.classList.add('hidden');

    // Stop Stream
    signupVideoStream.getTracks().forEach(track => track.stop());
    signupVideoStream = null;
    document.getElementById('btn-capture-signup').classList.add('hidden');
}

function handleSignup(e) {
    e.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    if (!capturedProfilePic) {
        if(!confirm("You haven't taken a profile photo. Continue with default?")) return;
    }

    if (users[email]) {
        alert("User already exists!");
        return;
    }

    // Generate Mock OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    tempSignupData = { name, email, password, otp, profilePic: capturedProfilePic };

    // Simulate Email Sending
    document.getElementById('verify-email-display').innerText = email;
    showAuthPage('verify');

    // Attempt Real Email via EmailJS
    if (window.emailjs && EMAILJS_CONFIG.PUBLIC_KEY !== "YOUR_PUBLIC_KEY") {
        emailjs.init(EMAILJS_CONFIG.PUBLIC_KEY);
        emailjs.send(EMAILJS_CONFIG.SERVICE_ID, EMAILJS_CONFIG.TEMPLATE_ID, {
            to_name: name,
            to_email: email,
            message: `Your Verification Code is: ${otp}`
        }).then(
            function(response) {
                console.log("EmailJS SUCCESS!", response.status, response.text);
                alert(`OTP sent to ${email}. Please check your inbox.`);
            },
            function(error) {
                console.log("EmailJS FAILED...", error);
                // Fallback to Mock
                alert(`[MOCK EMAIL SERVICE - Real Email Failed]\n\nHello ${name},\nYour verification code is: ${otp}`);
            }
        );
    } else {
        // Mock Fallback
        console.warn("EmailJS not configured. Using Mock Service.");
        setTimeout(() => {
            alert(`[MOCK EMAIL SERVICE]\n\nSubject: Verify your account\n\nHello ${name},\nYour verification code is: ${otp}`);
        }, 1000);
    }
}

function handleVerify(e) {
    e.preventDefault();
    const code = document.getElementById('verify-code').value;

    if (tempSignupData && code === tempSignupData.otp) {
        // Register User
        users[tempSignupData.email] = {
            name: tempSignupData.name,
            email: tempSignupData.email,
            password: tempSignupData.password,
            profilePic: tempSignupData.profilePic,
            role: 'user'
        };
        localStorage.setItem('amit_ai_users', JSON.stringify(users));

        // Redirect to Login (No Auto-Login)
        // Auto Login Removed per request
        // currentUser = users[tempSignupData.email];
        // localStorage.setItem('amit_ai_session', JSON.stringify(currentUser));

        alert("Account Verified Successfully! Please Login.");

        // Cleanup
        tempSignupData = null;
        showAuthPage('login');

    } else {
        alert("Invalid Verification Code!");
    }
}

function resendCode() {
    if (tempSignupData) {
         alert(`[MOCK EMAIL SERVICE]\n\nSubject: Resend Code\n\nYour code is: ${tempSignupData.otp}`);
    }
}

function logout() {
    if (confirm("Are you sure you want to log out?")) {
        currentUser = null;
        sessionStorage.removeItem('amit_ai_session');
        checkSession();
    }
}