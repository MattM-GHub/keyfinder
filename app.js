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
    const btnCloseModal = document.getElementById('btn-close-modal');
    
    const modalViewMode = document.getElementById('modal-view-mode');
    const modalEditMode = document.getElementById('modal-edit-mode');
    const modalTitle = document.getElementById('modal-title');
    const modalSubtitle = document.getElementById('modal-subtitle');
    const modalVisualMap = document.getElementById('modal-visual-map');
    const modalColorDot = document.getElementById('modal-color-dot');
    const modalColorText = document.getElementById('modal-color-text');
    
    const btnModalEdit = document.getElementById('btn-modal-edit');
    const btnModalDelete = document.getElementById('btn-modal-delete');
    const btnModalSave = document.getElementById('btn-modal-save');
    const btnModalCancel = document.getElementById('btn-modal-cancel');
    const modalEditUnit = document.getElementById('modal-edit-unit');
    const modalEditColor = document.getElementById('modal-edit-color');
    const modalEditColorHex = document.getElementById('modal-edit-color-hex');

    // --- STATE ---
    let currentSide = 'Front Cover';
    let currentQuadrant = 1;
    let allKeys =[];
    let cameraStream = null;
    let capturedBlob = null;
    let currentActiveKey = null;

    // --- INITIALIZATION ---
    initGrid();
    loadCachedKeys();
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

    if (btnModalEdit) btnModalEdit.addEventListener('click', enableEditMode);
    if (btnModalCancel) btnModalCancel.addEventListener('click', disableEditMode);
    if (btnModalSave) btnModalSave.addEventListener('click', saveEdit);
    if (btnModalDelete) btnModalDelete.addEventListener('click', deleteKey);
    if (modalEditColor) {
        modalEditColor.addEventListener('input', (e) => {
            if (modalEditColorHex) modalEditColorHex.textContent = e.target.value.toUpperCase();
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
        for (let i = 1; i <= 16; i++) {
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

    function loadCachedKeys() {
        const cached = localStorage.getItem('keysCache');
        if (cached) {
            try {
                allKeys = JSON.parse(cached);
                renderKeys(allKeys);
            } catch (e) {
                console.error("Cache parse error", e);
            }
        }
    }

    async function fetchKeys() {
        if (!keysContainer || !loadingText) return;
        
        const lastSync = localStorage.getItem('lastSyncTime');
        const syncStartTime = new Date().toISOString();
        
        let query = supabaseClient.from('keys').select('*');
        if (lastSync) {
            query = query.gt('updated_at', lastSync); // Delta Sync: Only fetch what changed
        }

        const { data, error } = await query;

        if (error) {
            if (allKeys.length === 0) loadingText.textContent = "Error loading keys.";
            console.error(error);
            return;
        }

        if (data && data.length > 0) {
            // Merge new/updated data into allKeys
            data.forEach(updatedKey => {
                const index = allKeys.findIndex(k => k.id === updatedKey.id);
                if (index !== -1) {
                    allKeys[index] = updatedKey;
                } else {
                    allKeys.push(updatedKey);
                }
            });
        }

        // Filter out soft-deleted keys
        allKeys = allKeys.filter(k => k.deleted !== true);
        
        // Sort by created_at descending
        allKeys.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        localStorage.setItem('keysCache', JSON.stringify(allKeys));
        localStorage.setItem('lastSyncTime', syncStartTime);
        
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

            const locationWrap = document.createElement('div');
            locationWrap.className = 'flex items-center gap-2 mt-1';

            const miniGrid = document.createElement('div');
            miniGrid.className = 'grid grid-cols-4 gap-[1px] w-5 h-5 bg-slate-300 p-[1px] rounded-[3px] shrink-0';
            for(let i=1; i<=16; i++) {
                const cell = document.createElement('div');
                cell.className = `w-full h-full rounded-[1px] ${i === key.quadrant ? 'bg-blue-600' : 'bg-white'}`;
                miniGrid.appendChild(cell);
            }

            const locationText = document.createElement('p');
            locationText.className = 'text-sm text-slate-500';
            locationText.textContent = `${key.side} - Q${key.quadrant}`;

            locationWrap.appendChild(miniGrid);
            locationWrap.appendChild(locationText);

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
            infoDiv.appendChild(locationWrap);
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
        if (!photoModal || !modalImg || !modalTitle) return;
        currentActiveKey = key;
        
        modalImg.src = key.image_url;
        modalTitle.textContent = key.unit;
        modalSubtitle.textContent = `${key.side} - Quadrant ${key.quadrant}`;
        
        if (modalColorDot) modalColorDot.style.backgroundColor = key.color || '#cbd5e1';
        
        const colorMapReverse = { '#ef4444': 'Red', '#3b82f6': 'Blue', '#22c55e': 'Green', '#eab308': 'Yellow', '#ffffff': 'White', '#000000': 'Black', '#94a3b8': 'Silver' };
        if (modalColorText) modalColorText.textContent = colorMapReverse[key.color] || 'Custom';

        // Generate Visual Map for Modal
        if (modalVisualMap) {
            modalVisualMap.innerHTML = ''; // Safe here, just clearing empty divs
            for(let i=1; i<=16; i++) {
                const cell = document.createElement('div');
                cell.className = `w-full h-full rounded-[2px] ${i === key.quadrant ? 'bg-blue-600 shadow-sm scale-110 z-10' : 'bg-white'}`;
                modalVisualMap.appendChild(cell);
            }
        }

        disableEditMode();
        photoModal.style.display = 'flex';
    }

    function enableEditMode() {
        if (!currentActiveKey || !modalViewMode || !modalEditMode) return;
        modalViewMode.classList.add('hidden');
        modalEditMode.classList.remove('hidden');
        modalEditMode.classList.add('flex');
        
        if (modalEditUnit) modalEditUnit.value = currentActiveKey.unit;
        if (modalEditColor) modalEditColor.value = currentActiveKey.color || '#ffffff';
        if (modalEditColorHex) modalEditColorHex.textContent = (currentActiveKey.color || '#ffffff').toUpperCase();
        if (btnModalEdit) btnModalEdit.classList.add('hidden');
    }

    function disableEditMode() {
        if (!modalViewMode || !modalEditMode) return;
        modalEditMode.classList.add('hidden');
        modalEditMode.classList.remove('flex');
        modalViewMode.classList.remove('hidden');
        if (btnModalEdit) btnModalEdit.classList.remove('hidden');
    }

    async function saveEdit() {
        if (!currentActiveKey || !modalEditUnit || !modalEditColor) return;
        
        const newUnit = modalEditUnit.value.trim();
        const newColor = modalEditColor.value;
        
        if (!newUnit) return alert("Unit cannot be empty.");

        const originalText = btnModalSave.textContent;
        btnModalSave.textContent = "Saving...";
        btnModalSave.disabled = true;

        try {
            const { error } = await supabaseClient
                .from('keys')
                .update({ unit: newUnit, color: newColor })
                .eq('id', currentActiveKey.id);

            if (error) throw error;

            // Update local state
            const index = allKeys.findIndex(k => k.id === currentActiveKey.id);
            if (index !== -1) {
                allKeys[index].unit = newUnit;
                allKeys[index].color = newColor;
            }
            
            localStorage.setItem('keysCache', JSON.stringify(allKeys));
            
            // Refresh UI
            renderKeys(allKeys);
            openModal(allKeys[index]); // Re-open with new data
            
        } catch (err) {
            console.error(err);
            alert("Error updating key: " + err.message);
        } finally {
            btnModalSave.textContent = originalText;
            btnModalSave.disabled = false;
        }
    }

    async function deleteKey() {
        if (!currentActiveKey) return;
        
        const confirmed = confirm(`Are you sure you want to delete the key for ${currentActiveKey.unit}? This cannot be undone.`);
        if (!confirmed) return;

        const originalText = btnModalDelete.textContent;
        btnModalDelete.textContent = "Deleting...";
        btnModalDelete.disabled = true;

        try {
            // Soft Delete from Database to allow Delta Sync to catch it
            const { error: dbError } = await supabaseClient
                .from('keys')
                .update({ deleted: true })
                .eq('id', currentActiveKey.id);

            if (dbError) throw dbError;

            // Extract filename from URL to delete from Storage (Optional but good practice)
            try {
                const urlParts = currentActiveKey.image_url.split('/');
                const fileName = urlParts[urlParts.length - 1];
                await supabaseClient.storage.from('key_images').remove([fileName]);
            } catch (storageErr) {
                console.warn("Could not delete image from storage, but DB record was removed.", storageErr);
            }

            // Remove from local state and update cache
            allKeys = allKeys.filter(k => k.id !== currentActiveKey.id);
            localStorage.setItem('keysCache', JSON.stringify(allKeys));
            
            // Refresh UI
            renderKeys(allKeys);
            if (photoModal) photoModal.style.display = 'none';
            
        } catch (err) {
            console.error(err);
            alert("Error deleting key: " + err.message);
        } finally {
            btnModalDelete.textContent = originalText;
            btnModalDelete.disabled = false;
        }
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
        const videoWidth = cameraVideo.videoWidth;
        const videoHeight = cameraVideo.videoHeight;
        
        // Determine the shortest side to make a perfect square crop from the center
        const minSide = Math.min(videoWidth, videoHeight);
        const startX = (videoWidth - minSide) / 2;
        const startY = (videoHeight - minSide) / 2;

        const MAX_SIZE = 800;
        const finalSize = Math.min(minSide, MAX_SIZE);
        
        cameraCanvas.width = finalSize;
        cameraCanvas.height = finalSize;
        
        // Draw only the center square of the video (matches Tailwind's object-cover)
        ctx.drawImage(
            cameraVideo, 
            startX, startY, minSide, minSide, // Source crop coordinates & size
            0, 0, finalSize, finalSize        // Destination canvas coordinates & size
        );
        
        // Convert to blob for upload immediately
        cameraCanvas.toBlob((blob) => {
            capturedBlob = blob;
            const objectUrl = URL.createObjectURL(blob);
            cameraPreview.src = objectUrl;
            
            cameraPreview.classList.remove('hidden');
            btnCapture.classList.add('hidden');
            btnRetake.classList.remove('hidden');
            cameraVideo.classList.add('hidden');
        }, 'image/webp', 0.8);
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
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.webp`;
            
            const { data: uploadData, error: uploadError } = await supabaseClient
                .storage
                .from('key_images')
                .upload(fileName, compressedBlob, {
                    contentType: 'image/webp'
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