// DO NO HARM MANDATE: Wait for DOM
document.addEventListener('DOMContentLoaded', () => {
    
    // --- SUPABASE CONFIGURATION ---
    // PASTE YOUR SUPABASE URL AND ANON KEY HERE
    const SUPABASE_URL = 'https://mrniuccqeumeysfekjau.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_vlB_HUlueptkhOvwwkenrg_RuT0SWMo';
    
    // Safety check: Ensure Supabase script loaded
    if (typeof supabase === 'undefined') {
        console.error("Supabase CDN not loaded.");
        return;
    }
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // --- DOM ELEMENTS ---
    const viewList = document.getElementById('view-list');
    const viewAdd = document.getElementById('view-add');
    const fabAdd = document.getElementById('fab-add');
    const btnShowAdd = document.getElementById('btn-show-add');
    const keysContainer = document.getElementById('keys-container');
    const searchInput = document.getElementById('search-input');
    const loadingText = document.getElementById('loading-text');
    
    const inputUnit = document.getElementById('input-unit');
    const inputColorValue = document.getElementById('input-color-value');
    const colorSwatches = document.querySelectorAll('.color-swatch');
    const inputColorCustom = document.getElementById('input-color-custom');
    
    const cameraVideo = document.getElementById('camera-video');
    const cameraPreview = document.getElementById('camera-preview');
    const btnCapture = document.getElementById('btn-capture');
    const btnRetake = document.getElementById('btn-retake');
    const cameraCanvas = document.getElementById('camera-canvas');
    
    const btnSave = document.getElementById('btn-save');
    const quadrantGrid = document.getElementById('quadrant-grid');
    const sideBtns = document.querySelectorAll('.side-btn');

    const photoModal = document.getElementById('photo-modal');
    const modalImg = document.getElementById('modal-img');
    const modalCaption = document.getElementById('modal-caption');
    const btnCloseModal = document.getElementById('btn-close-modal');

    // --- STATE ---
    let currentSide = 'Left';
    let currentQuadrant = 1;
    let allKeys =[];
    let cameraStream = null;
    let capturedBlob = null;

    // --- INITIALIZATION ---
    initGrid();
    fetchKeys();

    // --- EVENT LISTENERS ---
    if (fabAdd) {
        fabAdd.addEventListener('click', () => toggleView(true));
    }
    if (btnShowAdd) {
        btnShowAdd.addEventListener('click', () => toggleView(false));
    }
    if (searchInput) {
        searchInput.addEventListener('input', (e) => filterKeys(e.target.value));
    }
    if (btnSave) {
        btnSave.addEventListener('click', handleSaveKey);
    }
    
    if (colorSwatches) {
        colorSwatches.forEach(swatch => {
            swatch.addEventListener('click', (e) => {
                colorSwatches.forEach(s => s.classList.remove('active-color'));
                e.target.classList.add('active-color');
                if (inputColorValue) inputColorValue.value = e.target.getAttribute('data-color');
            });
        });
    }

    if (inputColorCustom) {
        inputColorCustom.addEventListener('input', (e) => {
            colorSwatches.forEach(s => s.classList.remove('active-color'));
            if (inputColorValue) inputColorValue.value = e.target.value;
        });
    }

    if (btnCapture) {
        btnCapture.addEventListener('click', capturePhoto);
    }

    if (btnRetake) {
        btnRetake.addEventListener('click', retakePhoto);
    }

    if (btnCloseModal) {
        btnCloseModal.addEventListener('click', () => {
            if(photoModal) photoModal.style.display = 'none';
        });
    }

    sideBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            sideBtns.forEach(b => {
                b.classList.remove('border-blue-600', 'bg-blue-50', 'text-blue-700');
                b.classList.add('border-slate-200', 'bg-white', 'text-slate-600');
            });
            const target = e.target;
            target.classList.remove('border-slate-200', 'bg-white', 'text-slate-600');
            target.classList.add('border-blue-600', 'bg-blue-50', 'text-blue-700');
            currentSide = target.getAttribute('data-side');
        });
    });

    // --- FUNCTIONS ---

    function toggleView(showAdd) {
        if (!viewList || !viewAdd || !fabAdd || !btnShowAdd) return;
        if (showAdd) {
            viewList.classList.add('hidden');
            fabAdd.classList.add('hidden');
            viewAdd.classList.remove('hidden');
            viewAdd.classList.add('flex');
            btnShowAdd.classList.remove('hidden');
            btnShowAdd.textContent = 'Cancel';
            startCamera();
        } else {
            viewAdd.classList.add('hidden');
            viewAdd.classList.remove('flex');
            viewList.classList.remove('hidden');
            fabAdd.classList.remove('hidden');
            btnShowAdd.classList.add('hidden');
            stopCamera();
            // Reset form
            if (inputUnit) inputUnit.value = '';
            retakePhoto();
        }
    }

    function initGrid() {
        if (!quadrantGrid) return;
        // DO NO HARM: Using createElement instead of innerHTML
        for (let i = 1; i <= 9; i++) {
            const btn = document.createElement('button');
            btn.className = 'quadrant-btn';
            btn.textContent = i;
            if (i === 1) btn.classList.add('active-quadrant');
            
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('.quadrant-btn').forEach(b => b.classList.remove('active-quadrant'));
                btn.classList.add('active-quadrant');
                currentQuadrant = i;
            });
            quadrantGrid.appendChild(btn);
        }
    }

    async function fetchKeys() {
        if (!keysContainer || !loadingText) return;
        
        const { data, error } = await supabaseClient
            .from('keys')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            loadingText.textContent = "Error loading keys.";
            console.error(error);
            return;
        }

        allKeys = data;
        renderKeys(allKeys);
    }

    function renderKeys(keysToRender) {
        if (!keysContainer || !loadingText) return;
        
        // Clear existing (while avoiding generic innerHTML where possible, clearing children is standard)
        while (keysContainer.firstChild) {
            keysContainer.removeChild(keysContainer.firstChild);
        }

        if (keysToRender.length === 0) {
            loadingText.textContent = "No keys found.";
            keysContainer.appendChild(loadingText);
            return;
        }

        keysToRender.forEach(key => {
            // DO NO HARM: Building DOM elements safely
            const card = document.createElement('div');
            card.className = 'key-card';
            card.addEventListener('click', () => openModal(key));

            const img = document.createElement('img');
            img.className = 'key-thumbnail';
            img.src = key.image_url;
            img.alt = `Key ${key.unit}`;
            img.loading = 'lazy';

            const infoDiv = document.createElement('div');
            infoDiv.className = 'flex flex-col flex-1';

            const title = document.createElement('h3');
            title.className = 'font-bold text-slate-800 text-lg leading-tight';
            title.textContent = key.unit;

            const location = document.createElement('p');
            location.className = 'text-sm text-slate-500';
            location.textContent = `${key.side} Side - Quadrant ${key.quadrant}`;

            const colorWrap = document.createElement('div');
            colorWrap.className = 'text-xs text-slate-600 font-medium mt-1 flex items-center';
            
            const colorDot = document.createElement('span');
            colorDot.className = 'tag-color-indicator';
            // Use the saved hex code directly
            colorDot.style.backgroundColor = key.color || '#cbd5e1';

            const colorText = document.createElement('span');
            // Attempt to find a name for default colors, otherwise show hex
            const colorMapReverse = { '#ef4444': 'Red', '#3b82f6': 'Blue', '#22c55e': 'Green', '#eab308': 'Yellow', '#ffffff': 'White', '#000000': 'Black', '#94a3b8': 'Silver' };
            colorText.textContent = colorMapReverse[key.color] || 'Custom';

            colorWrap.appendChild(colorDot);
            colorWrap.appendChild(colorText);

            infoDiv.appendChild(title);
            infoDiv.appendChild(location);
            infoDiv.appendChild(colorWrap);

            card.appendChild(img);
            card.appendChild(infoDiv);

            keysContainer.appendChild(card);
        });
    }

    function filterKeys(searchTerm) {
        const term = searchTerm.toLowerCase();
        const filtered = allKeys.filter(key => 
            key.unit.toLowerCase().includes(term) || 
            key.color.toLowerCase().includes(term)
        );
        renderKeys(filtered);
    }

    function openModal(key) {
        if (!photoModal || !modalImg || !modalCaption) return;
        modalImg.src = key.image_url;
        modalCaption.textContent = `${key.unit} - ${key.side} Q${key.quadrant} (${key.color})`;
        photoModal.style.display = 'flex';
    }

    // --- CAMERA CONTROLS ---
    async function startCamera() {
        if (!cameraVideo) return;
        try {
            cameraStream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
            });
            cameraVideo.srcObject = cameraStream;
        } catch (err) {
            console.error("Error accessing camera:", err);
            alert("Could not access camera. Please ensure permissions are granted.");
        }
    }

    function stopCamera() {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            cameraStream = null;
        }
    }

    function capturePhoto() {
        if (!cameraVideo || !cameraCanvas || !cameraPreview || !btnCapture || !btnRetake) return;
        
        const ctx = cameraCanvas.getContext('2d');
        let width = cameraVideo.videoWidth;
        let height = cameraVideo.videoHeight;
        const MAX_WIDTH = 1200;
        
        if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
        }
        
        cameraCanvas.width = width;
        cameraCanvas.height = height;
        ctx.drawImage(cameraVideo, 0, 0, width, height);
        
        // Convert to blob for upload immediately
        cameraCanvas.toBlob((blob) => {
            capturedBlob = blob;
            const objectUrl = URL.createObjectURL(blob);
            cameraPreview.src = objectUrl;
            
            cameraPreview.classList.remove('hidden');
            btnCapture.classList.add('hidden');
            btnRetake.classList.remove('hidden');
            cameraVideo.classList.add('hidden');
        }, 'image/jpeg', 0.8);
    }

    function retakePhoto() {
        if (!cameraPreview || !btnCapture || !btnRetake || !cameraVideo) return;
        capturedBlob = null;
        cameraPreview.classList.add('hidden');
        btnCapture.classList.remove('hidden');
        btnRetake.classList.add('hidden');
        cameraVideo.classList.remove('hidden');
    }

    // --- SMART IMAGE PROCESSING ---
    function processImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 1200;
                    let width = img.width;
                    let height = img.height;

                    if (width > MAX_WIDTH) {
                        height = Math.round((height * MAX_WIDTH) / width);
                        width = MAX_WIDTH;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Compress to JPEG quality 0.8
                    canvas.toBlob((blob) => {
                        resolve(blob);
                    }, 'image/jpeg', 0.8);
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async function handleSaveKey() {
        if (!inputUnit || !inputColorValue || !btnSave) return;
        
        const unit = inputUnit.value.trim();
        const color = inputColorValue.value;

        if (!unit || !capturedBlob) {
            alert("Please provide a Unit Number and capture a Photo.");
            return;
        }

        btnSave.textContent = "Processing Image...";
        btnSave.disabled = true;
        btnSave.classList.add('opacity-50');

        try {
            // 1. Image is already processed and compressed via Canvas in capturePhoto()
            const compressedBlob = capturedBlob;

            // 2. Upload to Supabase Storage
            btnSave.textContent = "Uploading...";
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
            
            const { data: uploadData, error: uploadError } = await supabaseClient
                .storage
                .from('key_images')
                .upload(fileName, compressedBlob, {
                    contentType: 'image/jpeg'
                });

            if (uploadError) throw uploadError;

            // 3. Get Public URL
            const { data: publicUrlData } = supabaseClient
                .storage
                .from('key_images')
                .getPublicUrl(fileName);

            // 4. Save to Database
            btnSave.textContent = "Saving Database Record...";
            const { data: insertData, error: insertError } = await supabaseClient
                .from('keys')
                .insert([
                    { 
                        unit: unit, 
                        color: color, 
                        side: currentSide, 
                        quadrant: currentQuadrant, 
                        image_url: publicUrlData.publicUrl 
                    }
                ]);

            if (insertError) throw insertError;

            // 5. Success cleanup
            alert("Key saved successfully!");
            toggleView(false);
            fetchKeys(); // Refresh list

        } catch (error) {
            console.error("Save error:", error);
            alert("Error saving key: " + error.message);
        } finally {
            btnSave.textContent = "Save Key to Database";
            btnSave.disabled = false;
            btnSave.classList.remove('opacity-50');
        }
    }
});