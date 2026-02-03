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

// --- Language Logic ---
function setLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('amit_ai_lang', lang);
    
    // Update UI
    const btnEn = document.getElementById('lang-en');
    const btnHi = document.getElementById('lang-hi');
    
    if (lang === 'en') {
        btnEn.className = "px-3 py-1 text-[10px] rounded-md transition-all bg-blue-600 text-white font-bold uppercase tracking-wider";
        btnHi.className = "px-3 py-1 text-[10px] rounded-md transition-all text-slate-400 font-bold uppercase tracking-wider";
    } else {
        btnHi.className = "px-3 py-1 text-[10px] rounded-md transition-all bg-blue-600 text-white font-bold uppercase tracking-wider";
        btnEn.className = "px-3 py-1 text-[10px] rounded-md transition-all text-slate-400 font-bold uppercase tracking-wider";
    }
}

// --- Theme Logic ---
function setTheme(theme) {
    document.body.className = `theme-${theme} text-slate-200 h-screen flex flex-col md:flex-row overflow-hidden`;
    localStorage.setItem('amit_ai_theme', theme);
}

// --- Navigation Logic ---
function showPage(pageId) {
    document.querySelectorAll('.page-content').forEach(page => page.classList.add('hidden'));
    document.getElementById(`page-${pageId}`).classList.remove('hidden');
    
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    const activeLink = document.getElementById(`nav-${pageId}`);
    if(activeLink) activeLink.classList.add('active');
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
    synth.onvoiceschanged = () => {
        // Just triggering a load
        synth.getVoices();
    };
}

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
        actionsHtml = `
            <div class="flex items-center space-x-3 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onclick="copyToClipboard(this)" class="text-[10px] text-slate-500 hover:text-blue-400 flex items-center space-x-1">
                    <i class="fas fa-copy"></i> <span>Copy</span>
                </button>
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

    messageDiv.innerHTML = `
        <div class="w-8 h-8 rounded bg-opacity-90 ${iconBg} flex items-center justify-center shrink-0 shadow-lg">
            <i class="fas ${icon} text-xs text-white"></i>
        </div>
        <div class="flex-1 group">
            <div class="prose prose-invert max-w-none text-slate-300 leading-relaxed message-content bg-white/5 p-4 rounded-2xl border border-white/5">
                ${text.replace(/\n/g, '<br>')}
                ${specialContent}
            </div>
            ${actionsHtml}
        </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
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

// --- Event Listeners ---
const chatFormElement = document.getElementById('chat-form');
const voiceBtn = document.getElementById('voice-btn');
const imageUpload = document.getElementById('image-upload');
let pendingImage = null; // To store uploaded image base64

if (imageUpload) {
    imageUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                pendingImage = e.target.result;
                injectMessage(`[Image Uploaded: ${file.name}]`, true);
                injectMessage("Image ready. Ask your question about it!", false);
            };
            reader.readAsDataURL(file);
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
        if (!message && !isCameraActive && !pendingImage) return;

        // If message is empty but we have an image, provide a default
        if (!message && (isCameraActive || pendingImage)) {
            message = "What do you see in this image?";
        }

        let imageToSend = pendingImage;

        // If camera is active, capture frame (overrides uploaded image for now, or we could handle both)
        if (isCameraActive) {
            imageToSend = captureFrame();
            // Optional: Show a thumbnail of the captured frame in chat
            injectMessage(`<img src="${imageToSend}" class="w-32 h-24 object-cover rounded-lg border border-white/20 mb-2"><br>${message}`, true);
        } else {
             injectMessage(message, true);
        }

        input.value = '';
        pendingImage = null; // Reset pending image
        // Reset file input value so same file can be selected again
        if(imageUpload) imageUpload.value = '';

        synth.cancel(); // Kisi bhi purane response ko roke
        
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
    setTheme(currentTheme);
    setLanguage(currentLanguage);
    if (Object.keys(chats).length === 0) createNewChat();
    else loadChat(Object.keys(chats).sort((a,b) => chats[b].timestamp - chats[a].timestamp)[0]);
    renderHistory();
};